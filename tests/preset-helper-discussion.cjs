const fs = require('fs'),
  ts = require('typescript'),
  assert = require('node:assert/strict'),
  vm = require('vm');
const source = fs.readFileSync('src/util/酒馆助手脚本/预设助手/discussion.ts', 'utf8');
const loaded = {};
vm.runInNewContext(
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
    .outputText,
  { exports: loaded, structuredClone },
);
const { resolveDiscussionConfig, applyDiscussionMode, discussionStatus, discussionCard, validateDiscussionConfig } =
  loaded;
const prompts = [
  { id: 'a', name: '❖论坛一键开关❖', enabled: false },
  { id: 'b', name: '❖段评一键开关❖', enabled: false },
  { id: 'c', name: '❖段评&论坛开关❖', enabled: true },
  { id: 'g1', name: '群组A', content: '{{setvar::吐槽群组1::角色A}}', enabled: true },
  { id: 'g2', name: '群组B', content: '{{setvar::吐槽群组2::角色B}}', enabled: false },
  { id: 'other', name: '不相关', enabled: true },
];
const config = resolveDiscussionConfig(prompts);
assert.equal(config.bindings.both, 'c');
assert.equal(discussionStatus(config, prompts), 'both');
for (const mode of ['comments', 'forum', 'both', 'off']) {
  const before = JSON.stringify(prompts);
  const next = applyDiscussionMode({ prompts, extensions: { keep: 1 } }, config, mode);
  assert.equal(JSON.stringify(prompts), before);
  assert.equal(next.extensions.keep, 1);
  assert.equal(next.prompts.find(p => p.id === 'other').enabled, true);
  for (const m of ['comments', 'forum', 'both'])
    assert.equal(next.prompts.find(p => p.id === config.bindings[m]).enabled, m === mode);
  assert.equal(next.prompts.find(p => p.id === 'g1').enabled, true);
  assert.equal(next.prompts.find(p => p.id === 'g2').enabled, false);
}
const selected = { ...config, selectedGroupIds: ['g2'] };
const next = applyDiscussionMode({ prompts }, selected, 'forum');
assert.equal(next.prompts.find(p => p.id === 'g1').enabled, false);
assert.equal(next.prompts.find(p => p.id === 'g2').enabled, true);
assert.throws(() => validateDiscussionConfig({ ...config, bindings: { ...config.bindings, forum: 'b' } }, prompts));
assert.throws(() => validateDiscussionConfig({ ...config, groupIds: ['missing'] }, prompts));
assert.equal(resolveDiscussionConfig([...prompts, { ...prompts[0], id: 'duplicate' }]).bindings.forum, '');
assert.equal(
  discussionStatus(
    config,
    prompts.map(p => (p.id === 'b' ? { ...p, enabled: true } : p)),
  ),
  'conflict',
);
assert.equal(discussionCard(config, prompts).includes('aria-pressed="true"'), true);
const saved = JSON.parse(JSON.stringify(config));
assert.deepEqual(JSON.parse(JSON.stringify(resolveDiscussionConfig(prompts, saved))), saved);
console.log(
  'PASS discussion detection, exclusive modes, group selection, no unrelated mutation, validation, conflict, persistence.',
);
