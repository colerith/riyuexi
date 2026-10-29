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
    openai: oai,
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

(async () => {
  const compatible = await setup();
  compatible.controller.dispose();
  compatible.host.SillyTavern = compatible.ctx;
  compatible.host.Function = () => {
    throw Error('Internal imports blocked');
  };
  compatible.host.crypto = undefined;
  const publicController = await exportsObject.registerToolInput({
    host: compatible.host,
    mode: 'single-shot',
    onModeChange() {},
  });
  const publicRequest = compatible.run(compatible.request());
  assert.equal(publicRequest.messages.find(message => message.role === 'tool').content, '真实输入');
  assert.equal(publicRequest.messages.at(-1).content, '尾部规则');
  const repeated = compatible.request();
  repeated.messages.push({ role: 'user', content: '真实输入' });
  const originalRepeated = clone(repeated);
  compatible.run(repeated);
  assert.deepEqual(repeated, originalRepeated, 'unidentified ambiguous input must remain untouched');
  publicController.dispose();
  assert.equal(compatible.bus.eventNames().length, 0);
  const s = await setup();
  const before = clone(s.flat),
    data = s.run(s.request());
  assert.equal(s.controller.version, '2.4.0');
  assert.equal(data.messages.find(message => message.role === 'tool').content, '真实输入');
  assert.deepEqual(s.flat, before, 'request rewriting must not mutate PromptManager');
  assert.equal(data.messages.at(-1).content, '尾部规则');
  assert.equal(data.messages[2].content, '练习注入内容超过八个字');
  assert.equal(data.custom_prompt_post_processing, 'strict_tools');
  assert.equal(data.tool_choice, 'none');
  assert.equal(data.messages.filter(message => message.tool_calls).length, 1);
  const once = clone(data);
  s.run(data);
  assert.deepEqual(clone(data), once, 'already wrapped messages must not be wrapped again');

  s.ctx.chat.push({ is_user: false, mes: '正在重写的回复' });
  assert.ok(s.run(s.request({ type: 'swipe' })).messages.some(message => message.role === 'tool'));
  const noInput = s.request(),
    unchanged = clone(noInput);
  s.run(noInput);
  assert.deepEqual(noInput, unchanged, 'assistant-ended chat has no fresh user input');
  s.ctx.chat.pop();

  // Non-dry-run snapshot must survive token-count/preview prompt replacement.
  const snapshotRequest = s.request({ type: 'regenerate' });
  s.bus.emit('prompt', { chat: snapshotRequest.messages });
  s.oai.promptManager.messages = { collection: [{ role: 'assistant', content: '干跑', identifier: 'chatHistory-0' }] };
  s.bus.emit('prompt', { chat: [], dryRun: true });
  s.bus.emit('ready', snapshotRequest);
  assert.ok(snapshotRequest.messages.some(message => message.role === 'tool'));
  s.oai.promptManager.messages = { collection: s.flat };

  const image = { type: 'image_url', image_url: { url: 'data:image/png;base64,AA==' } };
  s.flat[1].content = [{ type: 'text', text: '真实输入' }, image];
  const multimodal = s.run(s.request({ model: 'gemini-3-pro' }));
  assert.deepEqual(clone(multimodal.messages[1].content[1]), image);
  assert.equal(
    multimodal.messages.find(message => message.tool_calls).tool_calls[0].extra_content.google.thought_signature,
    'skip_thought_signature_validator',
  );
  s.flat[1].content = '真实输入';

  s.ctx.chat[0].mes = '{{user}}的输入';
  s.flat[1].content = '玩家：测试用户的输入';
  assert.equal(s.run(s.request()).messages.find(message => message.role === 'tool').content, '玩家：测试用户的输入');
  s.ctx.chat[0].mes = '真实输入';
  s.flat[1].content = '真实输入';

  for (const overrides of [
    { tools: [{ type: 'function' }] },
    { assistant_prefill: '<electric>' },
    { json_schema: {} },
    { type: 'quiet' },
    { enable_web_search: true, chat_completion_source: 'makersuite' },
  ]) {
    const request = s.request(overrides),
      original = clone(request);
    s.run(request);
    assert.deepEqual(request, original, 'incompatible requests must pass through untouched');
  }
  s.host.__blueprintToolInput = { getState: () => ({ mode: 'two-stage' }) };
  const duplicate = s.request(),
    originalDuplicate = clone(duplicate);
  s.run(duplicate);
  assert.deepEqual(duplicate, originalDuplicate, 'standalone tool-input script takes precedence');
  delete s.host.__blueprintToolInput;
  s.controller.setMode('off');
  const off = s.request(),
    originalOff = clone(off);
  s.run(off);
  assert.deepEqual(off, originalOff);
  assert.deepEqual(s.saved, ['off']);
  s.controller.dispose();
  assert.equal(s.bus.eventNames().length, 0);

  const sent = [];
  let rejectHandshake = false;
  const originalFetch = async (url, init) => {
    const body = JSON.parse(init.body);
    sent.push(body);
    assert.equal(body.__blueprint_tool_input, undefined);
    if (typeof body.tool_choice === 'object') {
      const reference = body.messages[1].content;
      const requestId = reference.match(/引用 ([a-f0-9]+)/)[1];
      return Response.json({
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              reasoning_content: '原始推理字段',
              tool_calls: [
                {
                  id: 'real-call',
                  type: 'function',
                  signature: '真实签名',
                  function: {
                    name: 'blueprint_read_input',
                    arguments: JSON.stringify({ request_id: rejectHandshake ? 'wrong' : requestId }),
                  },
                },
              ],
            },
          },
        ],
      });
    }
    return new Response('data: original-stream\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  };
  const two = await setup('two-stage', originalFetch);
  const response = await two.host.fetch('/api/backends/chat-completions/generate', {
    method: 'POST',
    body: JSON.stringify(two.run(two.request())),
  });
  assert.equal(await response.text(), 'data: original-stream\n\n');
  assert.equal(sent.length, 2);
  assert.equal(sent[0].stream, false);
  assert.equal(sent[1].messages.find(message => message.tool_calls).tool_calls[0].signature, '真实签名');
  assert.equal(sent[1].messages.find(message => message.tool_calls).reasoning_content, '原始推理字段');
  assert.equal(sent[1].messages.at(-1).content, '尾部规则');
  assert.equal(two.controller.getState().busy, 0);
  rejectHandshake = true;
  await assert.rejects(
    two.host.fetch('/api/backends/chat-completions/generate', {
      method: 'POST',
      body: JSON.stringify(two.run(two.request())),
    }),
    /request_id 不匹配/,
  );
  assert.equal(sent.length, 3, 'failed handshake must not send second request');
  assert.equal(two.controller.getState().busy, 0);
  two.controller.setMode('off');
  assert.equal(two.host.fetch, originalFetch);
  two.controller.dispose();
  assert.equal(two.bus.eventNames().length, 0);

  let started;
  const handshakeStarted = new Promise(resolve => {
    started = resolve;
  });
  const abortableFetch = (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')), { once: true });
      started();
    });
  const cancel = await setup('off');
  // Hook captures the current fetch on activation, preserving plugins loaded after initialization.
  cancel.host.fetch = abortableFetch;
  cancel.controller.setMode('two-stage');
  const pending = cancel.host.fetch('/api/backends/chat-completions/generate', {
    method: 'POST',
    body: JSON.stringify(cancel.run(cancel.request())),
  });
  await handshakeStarted;
  assert.equal(cancel.controller.getState().busy, 1);
  assert.throws(() => cancel.controller.setMode('off'), /请等本轮完成/);
  cancel.bus.emit('stop');
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(cancel.controller.getState().busy, 0);
  cancel.controller.dispose();
  assert.equal(cancel.host.fetch, abortableFetch);
  assert.equal(cancel.bus.eventNames().length, 0);
  console.log(
    'PASS: v2.4 real-input matching, swipe/snapshot, multimodal/tail preservation, skips, modes, handshake and cleanup',
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
