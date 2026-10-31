/** 输入输出工具传输：参考蓝图 v3.2.1，协议参考 AYUUKI-K/MMDB-PG (MIT)。
 * 使用公开酒馆上下文；不加载 openai.js、不使用 Function；由预设助手保存设置和管理生命周期。
 */
export type ToolInputMode = 'off' | 'single-shot' | 'two-stage';
export interface ToolInputOptions {
  mode: ToolInputMode;
  outputEnabled?: boolean;
  onModeChange: (mode: ToolInputMode) => void;
  onOutputChange?: (enabled: boolean) => void;
  onStatusChange?: () => void;
  isDisposed?: () => boolean;
  host?: any;
}
export interface ToolInputController {
  version: string;
  getState: () => {
    mode: ToolInputMode;
    outputEnabled: boolean;
    busy: number;
    count: number;
    mmdb: boolean;
    last: Record<string, any>;
  };
  setMode: (mode: ToolInputMode) => ToolInputMode;
  setOutput: (enabled: boolean) => boolean;
  describeLast: () => string;
  dispose: () => void;
}
export async function registerToolInput(options: ToolInputOptions): Promise<ToolInputController> {
  const host = options.host ?? (window.parent as any);
  const getContext = () => {
    const tavern = host.SillyTavern ?? (globalThis as any).SillyTavern;
    return typeof tavern?.getContext === 'function' ? tavern.getContext() : tavern;
  };
  const ctx = getContext();
  if (!ctx?.eventSource?.on || !ctx?.eventTypes?.CHAT_COMPLETION_SETTINGS_READY) {
    throw new Error('当前酒馆未提供聊天请求事件，工具读取不可用。');
  }
  if (options.isDisposed?.()) throw new Error('工具调用初始化已取消');
  const API = '__presetHelperToolInput',
    MARK = '__preset_helper_tool_transport';
  const TOOL = 'blueprint_read_input',
    OUT = 'blueprint_emit_answer';
  const MODES = ['off', 'single-shot', 'two-stage'],
    SOURCES = ['custom', 'openai', 'openrouter'];
  const PROCESSING: Record<string, string> = {
    '': '',
    none: 'none',
    merge: 'merge_tools',
    claude: 'merge_tools',
    semi: 'semi_tools',
    strict: 'strict_tools',
    merge_tools: 'merge_tools',
    semi_tools: 'semi_tools',
    strict_tools: 'strict_tools',
  };
  host[API]?.dispose();
  let originalFetch = host.fetch;
  const active = new Set<AbortController>();
  let disposed = false,
    busy = 0,
    count = 0,
    last: Record<string, any> = { result: '尚未使用' };
  function read(k: any, d: any) {
    try {
      return host.localStorage.getItem(k) ?? d;
    } catch {
      return d;
    }
  }
  let mode: ToolInputMode = options.mode,
    outputEnabled = options.outputEnabled === true;
  const clone = (x: any) => JSON.parse(JSON.stringify(x));
  const jsonResponse = (value: any) =>
    new host.Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  const textOf = (c: any) =>
    typeof c === 'string'
      ? c
      : Array.isArray(c)
        ? c
            .filter((p: any) => p?.type === 'text')
            .map((p: any) => p.text)
            .join('\n\n')
        : '';
  class Skip extends Error {}
  const skip = (message: any) => {
    throw new Skip(message);
  };
  function notify() {
    options.onStatusChange?.();
  }
  function record(entry: any) {
    last = { time: new Date().toLocaleTimeString(), ...entry };
    notify();
  }
  const declaration = () => ({
    type: 'function',
    function: {
      name: TOOL,
      description: 'Read current user input once with the exact request_id.',
      parameters: { type: 'object', properties: { request_id: { type: 'string' } }, required: ['request_id'] },
    },
  });
  const outputDeclaration = () => ({
    type: 'function',
    function: {
      name: OUT,
      description: '提交完整最终正文，保留原任务要求的语言、段落、标签和格式。仅提交文本，不执行外部操作。',
      parameters: {
        type: 'object',
        properties: { content: { type: 'string', description: '完整最终正文，不包含内部思考。' } },
        required: ['content'],
      },
    },
  });
  // MMDB 把酒馆发来的消息按原样转成 Gemini 回合（system 全部提到系统区，不合并同角色），然后包「最后一条 user」。
  // 酒馆的提示词后处理先于 MMDB：半严格 / 严格会把首条以外的 system 改成 user 再合并，于是末尾整段（时间线、思考、格式强调、尾……）
  // 就是那条 user。这里按同样规则在合并前算出这一段，整段换成引用。
  const MERGE_ALL = new Set(['semi', 'strict', 'semi_tools', 'strict_tools']);
  function tailRange(messages: any, processing: any) {
    let end = messages.length - 1;
    if (MERGE_ALL.has(processing)) {
      if (end < 0 || !['user', 'system'].includes(messages[end].role)) return null; // 末尾是预填：没有末条 user
      let start = end;
      while (start - 1 > 0 && ['user', 'system'].includes(messages[start - 1].role)) start--;
      if (messages[start].role === 'system' && start === 0) return null;
      return { start, end };
    }
    end = messages.length - 1;
    while (end >= 0 && messages[end]?.role !== 'user') end--; // 不转 system 时：和 MMDB 一样取最后一条 user，不管后面还有什么
    if (end < 0) return null;
    let start = end;
    if (processing === 'merge' || processing === 'merge_tools')
      while (start - 1 >= 0 && messages[start - 1].role === 'user') start--;
    return { start, end };
  }
  // 上游是 MMDB 的抗截断模型：它自己会做输入读取和正文工具交付（还带原生续写），请求一带工具它就跳过 —— 这里让路
  // 请求编号。crypto.randomUUID 只在安全上下文（https、localhost）里有：手机用局域网 http://192.168… 打开电脑上的酒馆时没有它，
  // 直接调用会报「randomUUID is not a function」，整轮停掉。没有就用 getRandomValues，再不行用时间戳 + Math.random
  function requestId() {
    try {
      if (typeof host.crypto?.randomUUID === 'function') return host.crypto.randomUUID().replace(/-/g, '');
    } catch {
      /* 往下兜底 */
    }
    try {
      return Array.from(host.crypto.getRandomValues(new Uint8Array(16)), (n: any) =>
        n.toString(16).padStart(2, '0'),
      ).join('');
    } catch {
      /* 往下兜底 */
    }
    return (Date.now().toString(16) + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2))
      .slice(0, 32)
      .padEnd(32, '0');
  }
  function mmdbOwns(source: any, model: any) {
    return source === 'custom' && /抗截断/.test(String(model || ''));
  }
  let yieldToast = false;
  const CONTRACT = `[客户端响应协议]\n本轮最终答复的交付方式是实际调用函数 ${OUT}，而不是直接输出普通文本。请只调用一次，将用户可见的完整最终正文放在唯一字符串参数 content 内，保留所需语言、段落和格式，不包含内部思考。不要在函数外输出正文，也不要将函数调用写成文本、JSON 示例或代码块。该函数仅提交答复，不执行任何外部操作。`;
  const REMINDER = `[客户端交付提醒]\n请回应以上用户任务，并通过实际的 ${OUT} 函数调用提交最终答复，唯一参数 content 为完整正文。此处只规定交付方式，正文继续遵循原任务的语言和格式。不要以普通文本模拟工具调用。`;
  function plan(data: any) {
    if (host.__TH_TOOL_BRIDGE__) {
      let enabled = true;
      try {
        enabled = JSON.parse(read('tavern-helper-tool-bridge-v2', '{}')).enabled !== false;
      } catch {
        /* 无法确认则停止 */
      }
      if (enabled) skip('请先关闭 HY 工具桥，避免重复包装。');
    }
    if (!Array.isArray(data.messages)) skip('请求里没有聊天消息。');
    if (data.messages.some((m: any) => m.tool_call_id || m.tool_calls?.length) || data.tools?.length)
      skip('本轮已有工具声明或历史，请关闭重复包装/其他工具。');
    const from = data.custom_prompt_post_processing || '';
    if (!Object.hasOwn(PROCESSING, from)) skip('当前提示词后处理会抹掉工具消息，请使用严格、半严格或合并。');
    const source = data.chat_completion_source;
    if ((outputEnabled || mode === 'two-stage') && !SOURCES.includes(source))
      skip('真实读取和输出包装支持自定义 OpenAI 兼容、OpenAI、OpenRouter。');
    const settings = {
      ...getContext()?.chatCompletionSettings,
      function_calling: true,
      custom_prompt_post_processing: PROCESSING[from],
      chat_completion_source: source,
    };
    if (!ctx.isToolCallingSupported(settings, data.model)) skip('当前接口/模型在酒馆里不支持工具调用。');
    if (data.json_schema || data.response_format) skip('结构化输出不能同时工具包装。');
    if (data.enable_web_search && ['makersuite', 'vertexai'].includes(source)) skip('请先关闭 Gemini 原生联网搜索。');
    if (source === 'claude' && data.reasoning_effort && data.reasoning_effort !== 'auto')
      skip('Claude 思考模式需要真实思考块，不能合成工具历史。');
    if (!outputEnabled && (data.messages.at(-1)?.role === 'assistant' || data.assistant_prefill?.trim()))
      skip('本轮带助手预填，输入包装会打断预填。');
    const range = mode === 'off' || data.type === 'continue' ? null : tailRange(data.messages, PROCESSING[from]);
    const index = range ? range.start : -1,
      end = range ? range.end : -1;
    const input = range
      ? data.messages
          .slice(range.start, range.end + 1)
          .map((m: any) => textOf(m.content))
          .filter((x: any) => x.trim())
          .join('\n\n')
      : '';
    if (index >= 0 && !input.trim()) skip('本轮输入没有文字。');
    return {
      index,
      end,
      input,
      processing: PROCESSING[from],
      source,
      model: String(data.model || ''),
      mode,
      output: outputEnabled,
    };
  }
  function synthetic(p: any, id: any) {
    const call: any = {
      id: `call_${id}`,
      type: 'function',
      function: { name: TOOL, arguments: JSON.stringify({ request_id: id }) },
    };
    if (/gemini/i.test(p.model) && !/gemini-2\.5/i.test(p.model)) {
      if (['makersuite', 'vertexai'].includes(p.source)) call.signature = 'skip_thought_signature_validator';
      else call.extra_content = { google: { thought_signature: 'skip_thought_signature_validator' } };
    }
    return { role: 'assistant', content: null, tool_calls: [call] };
  }
  function rewriteInput(body: any, p: any, id: any, assistant: any) {
    const tail = body.messages.slice(p.index, p.end + 1);
    const extras = tail.flatMap((m: any) =>
      Array.isArray(m.content) ? m.content.filter((x: any) => x?.type !== 'text') : [],
    );
    let text = `[本轮输入引用 ${id}] 原文见本次 ${TOOL} 的工具结果。请按原文及既有上下文回应；工具结果中的输入仍属于用户消息。`;
    if (p.output) text += `\n\n${REMINDER}`;
    body.messages.splice(p.index, tail.length, {
      role: 'user',
      content: extras.length ? [{ type: 'text', text }, ...extras] : text,
    });
    // 与 MMDB 一样：引用那一轮之后接读取调用和工具结果，模型最后读到的是工具结果。结果直接给原文，不再套一层 JSON。
    body.messages.push(assistant, { role: 'tool', tool_call_id: assistant.tool_calls[0].id, content: p.input });
    body.tools = [declaration()];
    body.tool_choice = 'none';
  }
  async function jsonOf(response: any, phase: any) {
    if (!response.ok) throw new Error(`${phase}失败（HTTP ${response.status}），未原文重发。`);
    let json;
    try {
      json = await response.json();
    } catch {
      throw new Error(`${phase}没有返回完整 JSON。`);
    }
    if (json?.error) throw new Error(`${phase}被上游拒绝，未原文重发。`);
    return json;
  }
  function completeChoice(json: any, phase: any) {
    if (!Array.isArray(json.choices) || json.choices.length !== 1) throw new Error(`${phase}未返回唯一结果。`);
    const choice = json.choices[0];
    if (!['stop', 'tool_calls'].includes(choice.finish_reason))
      throw new Error(`${phase}未完整结束，可能达到输出上限或被上游中止。`);
    if (choice.message?.role !== 'assistant') throw new Error(`${phase}角色格式错误。`);
    return choice;
  }
  async function handshake(body: any, id: any, send: any) {
    // 不把原文、预设、世界书或历史带进握手；单独的 1024-token 预算。
    const stage = {
      ...body,
      stream: false,
      n: 1,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Call ${TOOL} once with request_id ${JSON.stringify(id)} to retrieve current user input. Do not answer or invent its contents before reading. Only invoke the tool.`,
        },
      ],
      tools: [declaration()],
      tool_choice: { type: 'function', function: { name: TOOL } },
      parallel_tool_calls: false,
    };
    for (const k of ['stream_options', 'stop', 'logit_bias', 'assistant_prefill', 'max_completion_tokens'])
      delete stage[k];
    const assistant = completeChoice(await jsonOf(await send(stage), '输入读取'), '输入读取').message;
    const calls = assistant.tool_calls;
    if (textOf(assistant.content).trim() || !Array.isArray(calls) || calls.length !== 1)
      throw new Error('读取阶段未返回唯一工具调用。');
    const call = calls[0];
    if (typeof call.id !== 'string' || !call.id || call.type !== 'function' || call.function?.name !== TOOL)
      throw new Error('读取工具不匹配。');
    let args;
    try {
      args = JSON.parse(call.function.arguments);
    } catch {
      throw new Error('读取工具参数不是合法 JSON。');
    }
    if (!args || Object.keys(args).length !== 1 || args.request_id !== id)
      throw new Error('读取工具的 request_id 不匹配。');
    return clone(assistant); // 完整保留真实签名、推理字段、调用 ID。
  }
  function wrapOutput(body: any, wrapped: any) {
    // 协议放在系统区的最末尾（MMDB 是系统区最后一段）。这里改的是酒馆后处理之前的消息：开头连着的几条 system
    // 会被严格/半严格合成一条系统提示，所以要拼进这一串的最后一条 —— 3.1 拼在第一条，合并后就夹在系统提示中间了。
    let k = 0;
    while (k + 1 < body.messages.length && body.messages[k + 1]?.role === 'system') k++;
    const tail = body.messages[k];
    if (tail?.role === 'system' && typeof tail.content === 'string')
      body.messages[k] = { ...tail, content: `${tail.content}\n\n${CONTRACT}` };
    else body.messages.unshift({ role: 'system', content: CONTRACT });
    if (!wrapped) {
      const last = body.messages.at(-1);
      if (last?.role === 'user' && typeof last.content === 'string')
        body.messages[body.messages.length - 1] = { ...last, content: `${last.content}\n\n${REMINDER}` };
      else
        body.messages.push({
          role: 'user',
          content: `${REMINDER}\n上一条 assistant 预填仅作为上下文参考；本轮请另行提交函数调用，不继续生成预填的普通文本。`,
        });
    }
    body.tools = [...(body.tools || []), outputDeclaration()];
    body.tool_choice = 'auto'; // MMDB 不强制调用，只靠系统区协议 + 交付提醒
    body.parallel_tool_calls = false;
    body.stream = false;
    body.n = 1;
    delete body.stream_options;
  }
  function unpackOutput(json: any, streaming: any) {
    const choice = completeChoice(json, '正文交付'),
      calls = choice.message.tool_calls;
    if (
      (!Array.isArray(calls) || !calls.length) &&
      textOf(choice.message.content).trim() &&
      choice.finish_reason === 'stop'
    ) {
      const message = { ...choice.message };
      delete message.tool_calls;
      if (!streaming) return jsonResponse({ ...json, choices: [{ ...choice, message }] });
      const chunk = {
        ...json,
        object: 'chat.completion.chunk',
        choices: [{ index: choice.index ?? 0, delta: message, finish_reason: null }],
      };
      const finish = { ...chunk, choices: [{ index: choice.index ?? 0, delta: {}, finish_reason: 'stop' }] };
      return new host.Response(
        `data: ${JSON.stringify(chunk)}\n\ndata: ${JSON.stringify(finish)}\n\ndata: [DONE]\n\n`,
        { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } },
      );
    }
    if (
      textOf(choice.message.content).trim() ||
      !Array.isArray(calls) ||
      calls.length !== 1 ||
      calls[0].function?.name !== OUT ||
      calls[0].type !== 'function'
    )
      throw new Error('模型没有通过唯一正文工具交付。');
    let args;
    try {
      args = JSON.parse(calls[0].function.arguments);
    } catch {
      throw new Error('正文工具参数不完整。');
    }
    if (!args || Object.keys(args).length !== 1 || typeof args.content !== 'string' || !args.content.trim())
      throw new Error('正文工具缺少唯一有效 content 字符串。');
    const message = { ...choice.message, content: args.content };
    delete message.tool_calls;
    delete message.function_call;
    if (!streaming) return jsonResponse({ ...json, choices: [{ ...choice, message, finish_reason: 'stop' }] });
    // 收齐函数参数后交回标准 SSE，正文一次显示；不会触发酒馆的工具执行/后续请求。
    const chunk = {
      ...json,
      object: 'chat.completion.chunk',
      choices: [{ index: choice.index ?? 0, delta: message, finish_reason: null }],
    };
    const finish = { ...chunk, choices: [{ index: choice.index ?? 0, delta: {}, finish_reason: 'stop' }] };
    return new host.Response(`data: ${JSON.stringify(chunk)}\n\ndata: ${JSON.stringify(finish)}\n\ndata: [DONE]\n\n`, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    });
  }
  function onReady(data: any) {
    if (!disposed && (mode !== 'off' || outputEnabled) && data && mmdbOwns(data.chat_completion_source, data.model)) {
      record({ result: 'MMDB 抗截断模型：本脚本让路，交给 MMDB 原生工具' });
      if (!yieldToast) {
        yieldToast = true;
        host.toastr?.info?.('请使用MMDB反代的原生工具读取输入和抗截断', '输入输出工具传输');
      }
      return;
    }
    const external = host.__blueprintToolInput?.getState?.();
    if (external && (external.mode !== 'off' || external.outputEnabled)) {
      record({ result: '独立蓝图脚本已开启，本模块让路，避免重复包装' });
      return;
    }
    if (
      disposed ||
      (mode === 'off' && !outputEnabled) ||
      !data ||
      !['normal', 'regenerate', 'swipe', 'continue'].includes(data.type)
    )
      return;
    if (data.type === 'continue' && !outputEnabled) return;
    try {
      const p = plan(data);
      if (p.index < 0 && !p.output) {
        record({ result: '没有新的用户输入，未包装' });
        return;
      }
      data[MARK] = { id: requestId(), plan: p };
      record({ result: '等待工具传输' });
    } catch (error: any) {
      data[MARK] = { error: error.message };
      record({ result: `本轮停止 · ${error.message}` });
    }
  }
  async function wrappedFetch(resource: any, init: any) {
    let url;
    try {
      url = new host.URL(typeof resource === 'string' ? resource : resource.url || resource.href, host.location.href);
    } catch {
      return originalFetch.call(host, resource, init);
    }
    if (
      disposed ||
      url.origin !== host.location.origin ||
      url.pathname !== '/api/backends/chat-completions/generate' ||
      init?.method?.toUpperCase() !== 'POST' ||
      typeof init.body !== 'string' ||
      !init.body.includes(MARK)
    )
      return originalFetch.call(host, resource, init);
    let body;
    try {
      body = JSON.parse(init.body);
    } catch {
      throw new Error('工具传输请求不是合法 JSON。');
    }
    const mark = body[MARK];
    if (!mark) return originalFetch.call(host, resource, init);
    delete body[MARK];
    const controller = new host.AbortController(),
      signal = init.signal,
      chatId = getContext()?.getCurrentChatId?.();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = host.setTimeout(abort, 600000),
      streaming = Boolean(body.stream);
    let handedOff = false,
      cleaned = false;
    active.add(controller);
    busy++;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      host.clearTimeout(timer);
      active.delete(controller);
      busy--;
      signal?.removeEventListener('abort', abort);
      notify();
    };
    const send = (payload: any) => {
      if (disposed || controller.signal.aborted || getContext()?.getCurrentChatId?.() !== chatId)
        throw new host.DOMException('已取消工具传输', 'AbortError');
      return originalFetch.call(host, resource, { ...init, signal: controller.signal, body: JSON.stringify(payload) });
    };
    try {
      if (mark.error) throw new Error(mark.error);
      const p = mark.plan;
      if (Object.hasOwn(body, 'custom_prompt_post_processing')) body.custom_prompt_post_processing = p.processing;
      if (p.index >= 0) {
        if (
          body.messages
            .slice(p.index, p.end + 1)
            .map((m: any) => textOf(m.content))
            .filter((x: any) => x.trim())
            .join('\n\n') !== p.input
        )
          throw new Error('发送前末尾内容发生变化。');
        record({ result: p.mode === 'two-stage' ? '正在真实读取输入' : '正在合成读取记录' });
        const assistant = p.mode === 'two-stage' ? await handshake(body, mark.id, send) : synthetic(p, mark.id);
        rewriteInput(body, p, mark.id, assistant);
      }
      if (p.output) wrapOutput(body, p.index >= 0);
      const response = await send(body);
      if (p.output) {
        const json = await jsonOf(response, '正文交付');
        if (controller.signal.aborted) throw new host.DOMException('已取消工具传输', 'AbortError');
        const plainFallback = !json.choices?.[0]?.message?.tool_calls?.length;
        const result = unpackOutput(json, streaming);
        count++;
        record({
          result: plainFallback ? '模型直接写了正文（未用正文工具），已照常交付' : '工具传输完成',
          input: p.index >= 0 ? p.mode : '未包装',
          output: true,
        });
        return result;
      }
      if (!streaming) {
        const json = await jsonOf(response, '正文请求');
        count++;
        record({ result: '输入包装完成' });
        return jsonResponse(json);
      }
      if (!response.ok) throw new Error(`正文请求失败（HTTP ${response.status}），未原文重发。`);
      if (!response.body) throw new Error('正文请求没有响应流。');
      const reader = response.body.getReader();
      const stream = new host.ReadableStream({
        async pull(output: any) {
          try {
            const chunk = await reader.read();
            if (chunk.done) {
              count++;
              record({ result: '输入包装流已结束' });
              output.close();
              cleanup();
            } else output.enqueue(chunk.value);
          } catch (error: any) {
            record({ result: '正文流中断或已取消' });
            output.error(error);
            cleanup();
          }
        },
        async cancel(reason: any) {
          controller.abort();
          try {
            await reader.cancel(reason);
          } finally {
            cleanup();
          }
        },
      });
      handedOff = true;
      return new host.Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error: any) {
      const message = error.name === 'AbortError' ? '已取消或超过十分钟传输时限' : error.message;
      record({ result: `本轮停止 · ${message}` });
      host.toastr?.error?.(message, '输入输出工具传输');
      throw error;
    } finally {
      if (!handedOff) cleanup();
    }
  }
  function syncHook() {
    if (!disposed && (mode !== 'off' || outputEnabled)) {
      if (host.fetch !== wrappedFetch) {
        originalFetch = host.fetch;
        host.fetch = wrappedFetch;
      }
    } else if (host.fetch === wrappedFetch) host.fetch = originalFetch;
  }
  function assertIdle() {
    if (busy) throw new Error('请等本轮完成或停止生成后再切换。');
  }
  function setMode(next: ToolInputMode) {
    assertIdle();
    if (!MODES.includes(next)) throw new Error('未知输入模式。');
    mode = next;
    options.onModeChange(mode);
    syncHook();
    notify();
    return mode;
  }
  function setOutput(next: any) {
    assertIdle();
    outputEnabled = Boolean(next);
    options.onOutputChange?.(outputEnabled);
    syncHook();
    notify();
    return outputEnabled;
  }
  function describeLast() {
    return [last.time, last.result, `输出包装${outputEnabled ? '已开' : '已关'}`].filter(Boolean).join(' · ');
  }
  const events = ctx.eventTypes,
    stopAll = () => active.forEach((c: any) => c.abort());
  if (typeof ctx.eventSource.makeLast === 'function')
    ctx.eventSource.makeLast(events.CHAT_COMPLETION_SETTINGS_READY, onReady);
  else ctx.eventSource.on(events.CHAT_COMPLETION_SETTINGS_READY, onReady);
  ctx.eventSource.on(events.GENERATION_STOPPED, stopAll);
  ctx.eventSource.on(events.CHAT_CHANGED, stopAll);
  function dispose() {
    if (disposed) return;
    disposed = true;
    stopAll();
    ctx.eventSource.removeListener(events.CHAT_COMPLETION_SETTINGS_READY, onReady);
    ctx.eventSource.removeListener(events.GENERATION_STOPPED, stopAll);
    ctx.eventSource.removeListener(events.CHAT_CHANGED, stopAll);
    syncHook();
    if (host[API]?.dispose === dispose) delete host[API];
  }
  const mmdbNow = () => {
    const s = getContext()?.chatCompletionSettings || {};
    return mmdbOwns(s.chat_completion_source, s.custom_model);
  };
  host[API] = {
    version: '3.2.1',
    modes: MODES.slice(),
    getState: () => ({ mode, outputEnabled, busy, count, mmdb: mmdbNow(), last: { ...last } }),
    setMode,
    setOutput,
    describeLast,
    dispose,
  };
  syncHook();
  return host[API] as ToolInputController;
}
