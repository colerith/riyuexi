const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const root = __dirname;
function load(file) {
  let source = fs.readFileSync(path.join(root,file), 'utf8');
  if(file==='index.ts') source=source.slice(0,source.lastIndexOf('$(() => {'))+'\nexports.test = {parseEntry,parseAnnotations,startNovelComments};';
  const exports={};
  const requireLocal = name => name === 'fflate' ? require('fflate') : name.endsWith('?raw') ? fs.readFileSync(path.join(root,name.slice(0,-4)), 'utf8') : load(name.replace('./','')+'.ts');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{exports,require:requireLocal,console,Date,Math,Map,Set,Symbol,URL,encodeURIComponent,atob,Uint8Array});
  return exports;
}
const {parseEntry,parseAnnotations,startNovelComments}=load('index.ts').test;
const {AVATARS,resolveFace,createCommunityStore,stableKey}=load('community.ts');
assert.equal(AVATARS.length,240);assert.equal(new Set(AVATARS).size,240);
for(const svg of AVATARS){assert.ok(svg.startsWith('<svg'));assert.ok(!/<script|onload=|<foreignObject|(?:href|src)=["']https?:/i.test(svg));}
const entry=parseEntry('嗑糖|276|#专业团队 #眼神锁死路线|#八十公分滑道|NoSleep_404【CP唯物论者】：先别嗑，培根卷被夹走的人有没有维权渠道？|ghost.exe[Certified Hater]:我只关心这顿早饭能不能算出勤。');
assert.equal(entry.comments[0].title,'CP唯物论者');assert.equal(entry.comments[1].name,'ghost.exe');assert.equal(entry.comments[1].title,'Certified Hater');assert.equal(entry.tags.length,3);assert.equal(entry.warnings.length,0);assert.notEqual(entry.face,'嗑糖');
assert.equal(parseEntry('笑|2|标签：#眼神锁死路线,#八十公分滑道|甲：短评').tags.length,2);
assert.equal(parseEntry('(｡･ω･｡)|2|#旧标签|老用户：旧评论').comments[0].title,'');
assert.equal(parseAnnotations('`<hc>嗑糖|2|甲：代码示例</hc>`').entries.length,0);
assert.equal(resolveFace('sweet','same'),resolveFace('嗑糖','same'));
let data;const store=createCommunityStore(()=>data,x=>data=JSON.parse(JSON.stringify(x)));const key=stableKey('chat1/comment');const base=store.comment(key);store.toggle(key);assert.equal(store.comment(key).likes,base.likes+1);assert.equal(store.comment(key).liked,true);
const restored=createCommunityStore(()=>data,x=>data=x);assert.equal(restored.comment(key).liked,true);assert.deepEqual(JSON.stringify(store.profile('name')),JSON.stringify(restored.profile('name')));assert.equal(restored.comment(stableKey('chat2/comment')).liked,false);restored.toggle(key);assert.equal(restored.comment(key).likes,base.likes);assert.ok(Date.parse(base.dateTime)<=Date.now());
const sample='正文<hc>嗑糖|276|#专业团队|#眼神锁死路线|#八十公分滑道|NoSleep_404【CP唯物论者】：先别嗑，培根卷被夹走的人有没有维权渠道？|ghost.exe【Certified Hater】：我只关心这顿早饭能不能算出勤。</hc>';
(async()=>{
for(const skin of ['jinjiang','lofter','ao3','paper','night','kongming','blueprint']){
 const dom=new JSDOM('<html><head></head><body><div id="chat"><div class="mes" mesid="0"><div class="mes_text"></div></div></div></body></html>',{pretendToBeVisual:true});const w=dom.window;w.matchMedia=()=>({matches:false});
 let variables={hui_novel_comments_v1:{skin,follow:false}};const handlers={};w.getVariables=()=>variables;w.updateVariablesWith=fn=>variables=fn(variables);w.eventOn=(e,fn)=>{handlers[e]=fn;return {stop(){delete handlers[e]}}};w.getButtonEvent=()=> 'settings';w.tavern_events=Object.fromEntries(['GENERATION_STARTED','GENERATION_ENDED','GENERATION_STOPPED','CHARACTER_MESSAGE_RENDERED','CHAT_CHANGED'].map(k=>[k,k]));let chatId='one';const chat=[{mes:''}];w.SillyTavern={getContext:()=>({chat,characterId:'test',getCurrentChatId:()=>chatId})};let timers=new Map(),id=0;w.setTimeout=fn=>{timers.set(++id,fn);return id};w.clearTimeout=id=>timers.delete(id);const flush=()=>{const jobs=[...timers.values()];timers.clear();jobs.forEach(fn=>fn())};
 const runtime=await startNovelComments(w,{styleText:fs.readFileSync(path.join(root,'style.css'),'utf8')});const el=w.document.querySelector('.mes_text');handlers.GENERATION_STARTED();for(let i=0;i<30;i++){chat[0].mes=sample;el.innerHTML=sample;await Promise.resolve();handlers.CHARACTER_MESSAGE_RENDERED();flush();assert.equal(el.querySelectorAll('[data-hui-hc]').length,0)}handlers.GENERATION_ENDED();flush();const trigger=el.querySelector('button');assert.ok(trigger);trigger.click();let shadow=w.document.querySelector('[data-hui-overlay]').shadowRoot;assert.equal(shadow.querySelectorAll('.community-reader').length,2);assert.equal(shadow.querySelectorAll('.reader-avatar').length,2);assert.equal(shadow.querySelector('.title-badge').textContent,'CP唯物论者');assert.equal(shadow.querySelectorAll('.notice').length,0);const like=shadow.querySelector('.like-button');const count=Number(like.querySelector('.like-count').textContent.replaceAll(',',''));like.click();assert.equal(like.getAttribute('aria-pressed'),'true');assert.equal(Number(like.querySelector('.like-count').textContent.replaceAll(',','')),count+1);shadow.querySelector('.close').click();trigger.click();assert.equal(shadow.querySelector('.like-button').getAttribute('aria-pressed'),'true');
 chatId='two';handlers.CHAT_CHANGED();flush();el.querySelector('button').click();assert.equal(shadow.querySelector('.like-button').getAttribute('aria-pressed'),'false');
 handlers.GENERATION_STARTED();el.innerHTML=sample;await Promise.resolve();flush();assert.equal(el.querySelectorAll('[data-hui-hc]').length,0);handlers.GENERATION_STOPPED();flush();assert.equal(el.querySelectorAll('[data-hui-hc]').length,1);runtime.dispose();assert.equal(w.document.querySelectorAll('[data-hui-hc],[data-hui-overlay]').length,0);dom.window.close();
}
console.log('PASS: parser compatibility; long/combined tags; titles; 240 safe unique avatars; stable profiles/dates; like toggle/save/chat isolation; all 7 skins; 30 streaming updates each; stop/end flush and cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
