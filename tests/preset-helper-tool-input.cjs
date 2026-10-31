const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { EventEmitter } = require('node:events');
const { webcrypto } = require('node:crypto');
const source = fs.readFileSync('tavern-helper/预设助手/toolInput.ts', 'utf8');
const exportsObject = {};
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports: exportsObject, console },
);
const clone = value => JSON.parse(JSON.stringify(value));
const events = {
  CHAT_COMPLETION_SETTINGS_READY: 'ready',
  CHAT_COMPLETION_PROMPT_READY: 'prompt',
  GENERATION_STOPPED: 'stop',
  CHAT_CHANGED: 'chat',
};

async function setup(mode = 'single-shot', fetchImpl = async () => new Response('unused')) {
  const bus = new EventEmitter();
  const ctx = {
    eventSource: bus,
    eventTypes: events,
    getCurrentChatId: () => 'test-chat',
    chat: [{ is_user: true, mes: '真实输入' }],
    chatCompletionSettings: { prompts: [{ injection_position: 1, content: '练习注入内容超过八个字' }] },
    substituteParams: text => text.replace('{{user}}', '测试用户'),
    isToolCallingSupported: () => true,
  };
  const flat = [
    { role: 'system', content: '前置规则', identifier: 'main' },
    { role: 'user', content: '真实输入', identifier: 'chatHistory-0' },
    { role: 'user', content: '练习注入内容超过八个字', identifier: 'chatHistory-1' },
    { role: 'assistant', content: '练习回答', identifier: 'chatHistory-2' },
    { role: 'user', content: '尾部规则', identifier: 'tail' },
  ];
  const oai = { promptManager: { messages: { collection: flat } } };
  const warnings = [],
    saved = [];
  const host = {
    SillyTavern: { getContext: () => ctx },
    fetch: fetchImpl,
    crypto: webcrypto,
    URL,
    AbortController,
    DOMException,
    ReadableStream,
    Response,
    location: { href: 'http://localhost/', origin: 'http://localhost' },
    setTimeout,
    clearTimeout,
    localStorage: { getItem: () => null },
    toastr: { warning: message => warnings.push(message), error: message => warnings.push(message) },
  };
  const controller = await exportsObject.registerToolInput({
    host,
    mode,
    onModeChange: value => saved.push(value),
  });
  const request = (overrides = {}) => ({
    type: 'normal',
    messages: flat.map(({ identifier, ...message }) => clone(message)),
    model: 'test-model',
    chat_completion_source: 'custom',
    custom_prompt_post_processing: 'strict',
    ...overrides,
  });
  const run = data => {
    bus.emit('prompt', { chat: data.messages, dryRun: false });
    bus.emit('ready', data);
    return data;
  };
  return { host, ctx, flat, oai, bus, controller, request, run, warnings, saved };
}

const endpoint = '/api/backends/chat-completions/generate';
const completion = (message, reason = 'stop') => ({ choices: [{ index: 0, message, finish_reason: reason }] });
const plain = () => Response.json(completion({ role: 'assistant', content: '正文' }));
const send = (s, data, signal) => s.host.fetch(endpoint, { method: 'POST', body: JSON.stringify(s.run(data)), signal });
(async () => {
  const sent = [];
  const originalFetch = async (_url, init) => {
    sent.push(JSON.parse(init.body));
    return plain();
  };
  const s = await setup('single-shot', originalFetch);
  assert.equal(s.controller.version, '3.2.1');
  s.host.SillyTavern = s.ctx;
  s.host.Function = () => {
    throw Error('Forbidden internal module import');
  };
  s.host.crypto = {
    randomUUID() {
      throw Error('insecure origin');
    },
    getRandomValues() {
      throw Error('unavailable');
    },
  };
  const messages = [
    { role: 'system', content: '系统' },
    { role: 'assistant', content: '上文' },
    { role: 'user', content: '真实输入' },
    { role: 'system', content: '尾部规则' },
  ];
  const before = clone(messages);
  await send(s, s.request({ messages }));
  assert.deepEqual(messages, before, 'original messages remain unchanged');
  assert.equal(sent[0].messages.at(-1).role, 'tool');
  assert.equal(sent[0].messages.at(-1).content, '真实输入\n\n尾部规则');
  assert.equal(sent[0].custom_prompt_post_processing, 'strict_tools');
  assert.equal(sent[0].__preset_helper_tool_transport, undefined);
  assert.equal(sent[0].tool_choice, 'none');

  const image = { type: 'image_url', image_url: { url: 'data:image/png;base64,AA==' } };
  await send(
    s,
    s.request({
      model: 'gemini-3-pro',
      messages: [messages[0], { role: 'user', content: [{ type: 'text', text: '图片问题' }, image] }],
    }),
  );
  assert.deepEqual(sent.at(-1).messages[1].content[1], image);
  assert.equal(
    sent.at(-1).messages.at(-2).tool_calls[0].extra_content.google.thought_signature,
    'skip_thought_signature_validator',
  );
  for (const processing of ['none', 'merge', 'semi', 'strict']) {
    await send(s, s.request({ messages, custom_prompt_post_processing: processing }));
    assert.equal(
      sent.at(-1).messages.at(-1).content,
      ['semi', 'strict'].includes(processing) ? '真实输入\n\n尾部规则' : '真实输入',
    );
  }
  const countBeforeFailures = sent.length;
  for (const overrides of [
    { tools: [{ type: 'function' }] },
    { json_schema: {} },
    { assistant_prefill: '<electric>' },
    { chat_completion_source: 'makersuite', enable_web_search: true },
    { messages: [{ role: 'tool', tool_call_id: 'external', content: 'already wrapped' }] },
  ]) {
    await assert.rejects(send(s, s.request(overrides)));
  }
  assert.equal(sent.length, countBeforeFailures, 'invalid wrapping must stop before sending, without raw retry');
  const mmdb = s.request({ model: 'Gemini 抗截断' }),
    original = clone(mmdb);
  s.run(mmdb);
  assert.deepEqual(mmdb, original);
  s.host.__blueprintToolInput = { getState: () => ({ mode: 'off', outputEnabled: true }) };
  const external = s.request(),
    originalExternal = clone(external);
  s.run(external);
  assert.deepEqual(external, originalExternal);
  delete s.host.__blueprintToolInput;
  s.controller.setMode('off');
  assert.equal(s.host.fetch, originalFetch);
  s.controller.dispose();
  assert.equal(s.bus.eventNames().length, 0);

  const stages = [];
  let invalid = false;
  const two = await setup('two-stage', async (_url, init) => {
    const body = JSON.parse(init.body);
    stages.push(body);
    if (typeof body.tool_choice === 'object') {
      assert.equal(body.messages.length, 1);
      assert.equal(body.max_tokens, 1024);
      assert.equal(body.stop, undefined);
      assert.equal(body.max_completion_tokens, undefined);
      assert.equal(body.stream, false);
      assert.ok(!JSON.stringify(body.messages).includes('秘密世界书'));
      const id = body.messages[0].content.match(/request_id "([a-f0-9]+)"/)[1];
      return Response.json(
        completion(
          {
            role: 'assistant',
            content: null,
            reasoning_content: '真实推理字段',
            tool_calls: [
              {
                id: 'real-call',
                type: 'function',
                signature: 'signature',
                function: {
                  name: 'blueprint_read_input',
                  arguments: JSON.stringify({ request_id: invalid ? 'wrong' : id }),
                },
              },
            ],
          },
          'tool_calls',
        ),
      );
    }
    return plain();
  });
  await send(
    two,
    two.request({
      messages: [
        { role: 'system', content: '秘密世界书' },
        { role: 'user', content: '秘密输入' },
      ],
      stop: ['x'],
      max_completion_tokens: 9000,
    }),
  );
  assert.equal(stages.length, 2);
  assert.equal(stages[1].messages.at(-2).tool_calls[0].signature, 'signature');
  assert.equal(stages[1].messages.at(-2).reasoning_content, '真实推理字段');
  invalid = true;
  await assert.rejects(send(two, two.request()), /request_id/);
  assert.equal(stages.length, 3);
  two.controller.dispose();

  let answer = completion(
    {
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          type: 'function',
          function: { name: 'blueprint_emit_answer', arguments: JSON.stringify({ content: '第一段\n第二段' }) },
        },
      ],
    },
    'tool_calls',
  );
  const requests = [];
  const out = await setup('off', async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return Response.json(answer);
  });
  out.controller.setOutput(true);
  const decoded = await (await send(out, out.request({ type: 'continue' }))).json();
  assert.equal(decoded.choices[0].message.content, '第一段\n第二段');
  assert.equal(decoded.choices[0].message.tool_calls, undefined);
  assert.equal(requests[0].stream, false);
  assert.equal(requests[0].tool_choice, 'auto');
  assert.ok(requests[0].messages[0].content.includes('客户端响应协议'));
  assert.equal(requests[0].tools.length, 1, 'output only does not wrap input');
  const sse = await (await send(out, out.request({ stream: true }))).text();
  assert.ok(sse.includes('第一段\\n第二段'));
  assert.ok(sse.endsWith('data: [DONE]\n\n'));
  assert.ok(!sse.includes('tool_calls'));
  answer = completion({ role: 'assistant', content: '普通完整正文' });
  assert.equal((await (await send(out, out.request())).json()).choices[0].message.content, '普通完整正文');
  assert.match(out.controller.describeLast(), /未用正文工具/);
  answer = completion({ role: 'assistant', content: '截断正文' }, 'length');
  const attempts = requests.length;
  await assert.rejects(send(out, out.request()), /未完整结束/);
  assert.equal(requests.length, attempts + 1);
  answer = completion(
    {
      role: 'assistant',
      content: null,
      tool_calls: [{ type: 'function', function: { name: 'blueprint_emit_answer', arguments: '{"content":' } }],
    },
    'tool_calls',
  );
  await assert.rejects(send(out, out.request()), /参数不完整/);
  out.controller.dispose();

  let started;
  const ready = new Promise(resolve => {
    started = resolve;
  });
  const cancel = await setup(
    'two-stage',
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('stop', 'AbortError')), { once: true });
        started();
      }),
  );
  const pending = send(cancel, cancel.request());
  await ready;
  assert.throws(() => cancel.controller.setOutput(true), /请等/);
  cancel.bus.emit('stop');
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(cancel.controller.getState().busy, 0);
  cancel.controller.dispose();
  console.log(
    'PASS: v3.2.1 tail layout, isolated handshake, output JSON/SSE, plain fallback, fail-closed, MMDB, compatibility and cancellation',
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
