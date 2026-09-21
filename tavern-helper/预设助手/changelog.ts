export interface ChangelogEntry {
  version: string;
  title: string;
  intro: string;
  bodyHtml: string;
}

export const CURRENT_CHANGELOG_VERSION = '0.41.1';

export const CHANGELOGS: ChangelogEntry[] = [
  {
    version: '0.41.1',
    title: '⚖️ 日月西 更新日志',
    intro: 'NSFW 判断已对齐果实之心的总控、meow 摘要字段与世界书联动机制。',
    bodyHtml: `
      <section class="changelog-section">
        <h2>🍎 NSFW 联动修正</h2>
        <ul>
          <li>总控固定识别“❖涩涩一键开关❖”（ID：098af4e4-5021-4c23-b013-b4646684994b），避免误认其他 NSFW 条目。</li>
          <li>meow 摘要改为读取“NSFW：数字/20”，不再把其他十分制进度误判为 NSFW。</li>
          <li>新增 NSFW 世界书联动：总控关闭时可选择过滤常驻蓝灯，或同时过滤蓝灯与绿灯条目；默认按条目名称中的 NSFW 标记识别。</li>
          <li>首页和预设编辑页均可配置世界书联动，并显示最近一次过滤结果；总控激活圆点继续同步到悬浮球和快速回复栏。</li>
        </ul>
      </section>
    `,
  },
  {
    version: '0.41',
    title: '⚖️ 日月西 更新日志',
    intro: '预设助手补充了 NSFW 自动判断，并优化了字数设置面板的显示与主题兼容。',
    bodyHtml: `
      <section class="changelog-section">
        <h2>🌟 预设助手更新</h2>
        <ul>
          <li>新增 NSFW 关闭、常开与自动判断模式；支持启动词、优先关闭词、摘要进度和事后缓冲配置。</li>
          <li>首页与预设编辑页会显示当前 NSFW 总控状态，激活时悬浮球和快速回复栏按钮显示提示圆点。</li>
          <li>重新整理篇幅定义与当前字数输入框间距，补强面板样式隔离，减少酒馆美化主题干扰。</li>
          <li>隐藏面板中的可见滚动条，同时保留鼠标滚轮和触摸滚动。</li>
        </ul>
      </section>
    `,
  },
  {
    version: '0.4',
    title: '⚖️ 日月西 更新日志',
    intro:
      '没想到 3.8f 这么快来了，测得不多不过反正能玩。个人不太能感受到 3.7f 和 3.8f 明显的区别，细腻和文风也许会更好一点；据说 3.8f 会更现实一点，没有那么傻白甜。最直接的特征应该是 3.8f 特别快，2 分钟内都能出完我 1w4 的 token 了，比较适合性急的宝宝玩。',
    bodyHtml: `
      <div class="changelog-lead">
        <p>这次跳版本号主要是结构大改了，砍掉了一大半冗余的变量结构，所以对大家来说缝合会更方便了🙉 我自己也方便，因为每次写变量很痛苦鹅鹅鹅，还容易漏……</p>
        <p>以及非常感谢这段时间大家的好评和助力万赞💋 爱大家！！！</p>
      </div>

      <section class="changelog-section">
        <h2>💎 预设更新</h2>

        <div class="changelog-subtitle" role="heading" aria-level="3">🐚 人物活化</div>
        <ul>
          <li>【其余类型】：新增轻浮役、军人、糙汉 char 特化。</li>
          <li>【嬷化补丁】：原来是在世界引擎的地方，挪到了人物活化这里。
            <ul><li>新增【嬷化法则】：对嬷嬷的方式做了一下细化，有反差、恋爱、依恋、笨拙、下位。</li></ul>
          </li>
        </ul>

        <div class="changelog-subtitle" role="heading" aria-level="3">🎵 文风指导</div>
        <ul>
          <li>【文风框架】：新增迷宫饭（美食冒险类，玩到流口水😋）、星灯谣（比较温暖的喜欢风格），这两个都是 &lt;@1345136004247584820&gt; 给的，感谢鹊宝！！！新增半页诗（文艺细腻）。</li>
        </ul>

        <div class="changelog-subtitle" role="heading" aria-level="3">✒️ 写作指导</div>
        <ul>
          <li>新增【防恋足】：不许抓脚踝了。</li>
          <li>【扩写优化】拆成了【部分扩写】和【完全扩写】。</li>
        </ul>

        <div class="changelog-subtitle" role="heading" aria-level="3">💡 预设思维</div>
        <p>大改版，根据我的标题说明来选用就可以了，加上分支后思维链会比之前更长、更多内容。</p>
        <ul>
          <li>【世界构建】：新增大型世界、主线规划、逻辑连贯、前文回扣分支。</li>
          <li>【人物构建】：新增去同质化、深度挖掘、嬷嬷思考（搭配嬷化补丁开）、好感规划（搭配攻略难度开）分支。</li>
          <li>【文风指导】：新增额外素材分支。</li>
          <li>【涩涩设计】：新增性癖定制分支。</li>
          <li>新增【叙事蓝图】：思维链收尾的五种故事规划，选一开就好了。
            <ul>
              <li>叙事蓝图①：贝叶斯，之前日月西的故事规划一直是这个。</li>
              <li>叙事蓝图②：起承转合，四段式结构组织故事。</li>
              <li>叙事蓝图③：场景续场，比较注重故事的衔接性。</li>
              <li>叙事蓝图④：经验叙事，重点回答“发生了什么”以及“这件事为何值得讲述”，我个人比较喜欢这一个。</li>
              <li>叙事蓝图⑤：叙事代码，重视立体的真实叙事。</li>
            </ul>
          </li>
        </ul>

        <div class="changelog-subtitle" role="heading" aria-level="3">🔒 预设尾部</div>
        <ul><li>优化【Gemini 尾部②】：又改了一下思维链偷懒的问题，这一版应该是比较稳健的。</li></ul>
      </section>

      <section class="changelog-section">
        <h2>🌷 正则更新</h2>
        <ul>
          <li>优化「日月西必开-[1]清除多余内容」：极大解决了爆思维链的问题，不过在格式出错的情况下仅能保持思维链不暴露，但是自动解析会失效，最终效果就是思维链被隐藏了。</li>
          <li>优化「日月西美化-叽喳论坛」：三个美化都优化了，会自动去掉评论里的方括号显示。</li>
        </ul>
      </section>

      <section class="changelog-section">
        <h2>🌟 脚本更新</h2>
        <div class="changelog-subtitle" role="heading" aria-level="3">预设助手</div>
        <p class="changelog-emphasis">完全是大更！解放双手！造福人类！</p>
        <ul>
          <li>新装好预设会弹一个更新日志！不好好看完不许关！！</li>
          <li>预设助手会自动帮你把自动解析前缀后缀、勾选解析都填好，附加参数也写好；如果你填错了／没有填会自动修改。切换模型时会自动同步条目开关：3.1 Pro 会在【以……开始回复】填入 <code>&lt;electric&gt;</code>，Claude 和 Flash 模型则会自动清空该项，妈妈再也不用担心我会爆思维链了！！！</li>
          <li>新增一个美丽的悬浮球样式，再也不会被别人问预设助手在哪里了😱 和日月来信悬浮球一样会贴边自动吸附；如果想要回 QR 栏按钮，进入【面板设置】里修改就可以了。目前有悬浮球、快速回复栏、扩展程序菜单（魔法棒面板）三种样式。</li>
          <li>【快速要求】新增自定义，可以储存自己常用的快速指令了。</li>
          <li>【快捷开关】
            <ul>
              <li>把预设里所有的可选条目都加进来了，非常快捷一键切换，<b>必须安装柏宝箱搭配，否则抓不到分组。</b></li>
              <li>新增自定义快捷开关的分类查询与绑定，现在可以全局／绑定多个角色卡了。</li>
            </ul>
          </li>
          <li>【帮助说明】：超级大升级，集成了各种常见问题可自查，还有更新日志、预设 Wiki 快速查询入口。</li>
        </ul>
      </section>
    `,
  },
  {
    version: '0.31',
    title: '⚖️ 日月西更新日志',
    intro: '芜湖是更新！最近适配 3.7 Flash 版本上线后，收获了许多好评，感谢大家的支持～',
    bodyHtml: `
      <div class="changelog-lead">
        <p>本版本主要新增了无敌新穿甲：Build、反重力 3.7 Flash 假流／非流可以无痛跑车；流式经测试也能稳定输出正文，但尾部模块仍可能截断；Vertex 可以稳定跑车。如果截断、空回严重，请务必更新这一版！其他部分也做了小修复，整体体验更好、也更好吃啦～</p>
        <p>针对思维链和截断问题，下方食用指南也做了更新，请务必认真阅读。</p>
      </div>

      <section class="changelog-section is-warning">
        <h2>⚠️ 预设思维链稳定输出、隐藏食用指南</h2>
        <p class="changelog-emphasis">Flash 模型和 Pro 模型配置不同，本指南必看！不按要求做必报错！！！</p>

        <div class="changelog-subtitle" role="heading" aria-level="3">3.7、3.6、3.5 Flash 配置说明</div>
        <ul>
          <li>3.7 Flash 无法用 <code>&lt;thinking&gt;</code> 作为思维链标签，否则会卡 COT 失败。因此从本版本开始，思维链标签修改为 <code>&lt;electric&gt;</code>。
            <ul>
              <li>必须使用 <b>Gemini 尾部②</b>。</li>
              <li>点击酒馆顶栏从左往右第三个图标，进入“自动解析”：勾选“自动解析”“显示隐藏内容”，前缀填写 <code>&lt;electric&gt;</code>，后缀填写 <code>&lt;/electric&gt;</code>。</li>
            </ul>
          </li>
          <li>确保<b>【高级格式化设置】</b>（与自动解析在同一页面）里的“以……开始回复”为空，不能填写任何内容。</li>
          <li>确保预设界面的<b>【续写预填充】</b>、<b>【请求思维链】</b>都没有勾选。</li>
          <li>在<b>【API 链接配置】</b>的<b>【附加参数－排除主体参数】</b>中填写下方内容。此模块仅在聊天补全来源为“自定义兼容 OpenAI”时存在；连接 Google AI Studio 时不需要设置。3.7 Flash 无法自定义温度、频率和惩罚。</li>
        </ul>
        <pre><code>- presence_penalty
- frequency_penalty
- top_p
- top_k
- temperature</code></pre>
        <p class="changelog-emphasis">如果因为截断想使用续写功能，请在“酒馆主题”页面找到“自动续写”，勾选“已启用”与“允许使用聊天补全 API”。</p>

        <div class="changelog-subtitle" role="heading" aria-level="3">3.1 Pro 配置说明</div>
        <ul>
          <li>点击酒馆顶栏从左往右第三个图标，进入“自动解析”：勾选“自动解析”“显示隐藏内容”，前缀填写 <code>&lt;electric&gt;</code>，后缀填写 <code>&lt;/electric&gt;</code>。</li>
          <li>确保<b>【高级格式化设置】</b>里的“以……开始回复”填入 <code>&lt;electric&gt;</code>。</li>
          <li>如果按上面的 Flash 配置说明执行过操作，其余步骤恢复为初始化时的未修改状态即可。</li>
        </ul>
      </section>

      <section class="changelog-section is-warning">
        <h2>⚠️ 哈基米防截断食用指南</h2>
        <p>Google 在推出 3.7 Flash 后全方位加强了外部审查，包括 3.1 Pro 在内的模型安全限制也有所增强。</p>
        <p>简单来说，模型输出的安全审查来自外部模型，并不是正在游玩的 AIRP 模型本身。其检测机制以<b>关键词</b>为主，只要扫描到触发安全审查的关键词，模型就可能强制道歉或空回。目前已知的敏感领域大致包括：非自愿性行为（明确带有强暴、强制、虐待等字眼）、数删、政治相关内容。使用反重力渠道触发道歉时，道歉中可能附带 Google 模型安全协议的查看链接。</p>
        <p>想让 3.7 Flash、哈基米稳定跑车且尽量不截断，请优先执行：</p>
        <ul>
          <li>渠道优先选择 <b>Vertex</b>。如果必须使用 Build 或 AGY 反重力渠道，<b>务必使用非流式／带假流前缀的模型</b>。</li>
          <li><b>尽量不挂含有大量 NSFW 内容的世界书</b>，例如专门的 NSFW 指导世界书、含大量 NSFW 词条的生图世界书。此类世界书在 Build 和反重力渠道下更容易瞬间触发空回或道歉。取消挂载后，假流与流式通常都能恢复正常输出。日月西自带的 NSFW 词条平时可以正常开启。</li>
        </ul>
      </section>

      <section class="changelog-section">
        <h2>💎 预设更新</h2>
        <div class="changelog-subtitle" role="heading" aria-level="3">🔒 预设头部</div>
        <p>更新身份定义与 Gemini 头部，新增无限制创作相关内容；加入延续创作指令，头部破甲超级增强。</p>

        <div class="changelog-subtitle" role="heading" aria-level="3">🪐 世界引擎</div>
        <ul>
          <li>优化【喜剧幽默】：进一步提高 3.7 Flash 的幽默度，很适合欢喜冤家类型。</li>
          <li>优化【情感浓郁】：加强角色情感浓度，不再显得过淡。</li>
        </ul>

        <div class="changelog-subtitle" role="heading" aria-level="3">🎐 装饰组件</div>
        <ul><li>新增【唱片文字标题】：需要打开配套美化使用。</li></ul>

        <div class="changelog-subtitle" role="heading" aria-level="3">💡 预设思维</div>
        <ul><li>优化【创作检测】：删除多余的结尾落点，目前只保留对话、动作结尾两种形式。</li></ul>

        <div class="changelog-subtitle" role="heading" aria-level="3">🔒 预设尾部</div>
        <ul><li>优化【授权协议】：全新升级为超级尾部破甲。</li></ul>
      </section>

      <section class="changelog-section">
        <h2>🌷 正则更新</h2>
        <ul>
          <li>优化「日月西必开-[4]不发送多余内容」：补上不发送新思维链、日月来信。</li>
          <li>删除「日月西美化-预设思维美化」：容易出现美化问题，请按上方食用指南隐藏思维链。</li>
          <li>新增「日月西美化-唱片文字标题」：与【唱片文字标题】同步打开。多个文字标题互相冲突，美化同时只能开启一个；点击<b>左下角的 Amaterasu／Tsukuyomi 按钮</b>可以切换昼夜主题。</li>
          <li>优化「日月西美化-ta的手机｜默认版」：新增左右翻页键，可以在 App 页内快速跳转上一个／下一个 App，不需要等待计时。</li>
        </ul>
        <p class="changelog-emphasis">最近很多宝宝反馈开关正则切换不生效：如果下载了柏宝箱，请关闭【正则快速操作】条目。</p>
      </section>
    `,
  },
];

export function getLatestChangelog(): ChangelogEntry {
  return CHANGELOGS[0];
}

export function isLatestChangelog(entry: ChangelogEntry): boolean {
  return entry.version === CURRENT_CHANGELOG_VERSION;
}

export function renderChangelogEntries(entries: ChangelogEntry[] = CHANGELOGS): string {
  return entries
    .map(
      (entry, index) => `
        <details class="changelog-entry" ${index === 0 ? 'open' : ''}>
          <summary>
            <span>${entry.title} <b>v${entry.version}</b></span>
            ${isLatestChangelog(entry) ? '<span class="changelog-latest-tag">最新</span>' : ''}
          </summary>
          <div class="changelog-entry-body">
            <p class="changelog-intro">${entry.intro}</p>
            ${entry.bodyHtml}
          </div>
        </details>
      `,
    )
    .join('');
}
