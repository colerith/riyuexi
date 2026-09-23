import { CURRENT_CHANGELOG_VERSION } from './changelog';

export const panelHtml = `
    <div id="control-panel-container">
        <div class="control-panel">
            <div class="panel-main">
                <header class="panel-header">
                    <div class="header-title">预设助手</div>
                    <button class="close-button" id="close-panel"><i class="fas fa-times"></i></button>
                </header>
                <div class="panel-content">
                    <div class="status-display" id="status-display"></div>
                    <div class="main-menu">
                        <button data-panel="summary"><i class="fas fa-file-alt fa-fw"></i> 总结&大纲</button>
                        <button data-panel="requests"><i class="fas fa-rocket fa-fw"></i> 快速要求</button>
                        <button data-panel="presets"><i class="fas fa-cogs fa-fw"></i> 预设管理</button>
                        <button data-panel="quick-switches"><i class="fas fa-terminal fa-fw"></i> 快捷开关</button>
                        <button data-panel="help"><i class="fas fa-info-circle fa-fw"></i> 帮助说明</button>
                        <button data-panel="settings"><i class="fas fa-sliders-h fa-fw"></i> 面板设置</button>
                    </div>
                </div>
            </div>
            <div class="panel-child" data-panel-id="summary">
                <header class="panel-header">
                    <button class="back-button"><i class="fas fa-arrow-left"></i></button>
                    <div class="header-title">总结控制</div>
                    <button class="close-button"><i class="fas fa-times"></i></button>
                </header>
                <div class="panel-content button-grid-2">
                    <button data-action="summarize_full"><i class="fas fa-book-open"></i> 总结全文</button>
                    <button data-action="summarize_chapter"><i class="fas fa-file-signature"></i> 总结本章</button>
                    <button data-action="build_outline"><i class="fas fa-drafting-compass"></i> 构建大纲</button>
                    <button data-action="modify_outline"><i class="fas fa-edit"></i> 修改大纲</button>
                    <button data-action="show_hide_stats"><i class="fas fa-list-ol"></i> 楼层统计</button>
                    <button data-action="hide_messages"><i class="fas fa-eye-slash"></i> 隐藏楼层</button>
                    <button data-action="unhide_messages"><i class="fas fa-eye"></i> 取消隐藏</button>
                    <button data-action="hide_keep_last_3"><i class="fas fa-compress"></i> 保留最近3层</button>
                    <button data-action="hide_keep_last_5"><i class="fas fa-compress-arrows-alt"></i> 保留最近5层</button>
                    <button data-action="hide_previous_except_story_summary"><i class="fas fa-bookmark"></i> 前文仅保留总结</button>
                </div>
            </div>
            <div class="panel-child" data-panel-id="requests">
                <header class="panel-header">
                    <button class="back-button"><i class="fas fa-arrow-left"></i></button>
                    <div class="header-title">快速要求</div>
                    <button class="close-button"><i class="fas fa-times"></i></button>
                </header>
                <div class="panel-content quick-request-content">
                    <section class="quick-request-section is-builtin">
                        <div class="quick-request-section-title"><span>内置指令</span><span class="quick-request-badge">随脚本更新</span></div>
                        <div class="button-grid-2 quick-request-builtin-grid">
                            <button><i class="fas fa-fighter-jet"></i> 快速叙事</button>
                            <button><i class="fas fa-hat-wizard"></i> 慢速叙事</button>
                            <button><i class="fas fa-ban"></i> 禁止重复</button>
                            <button><i class="fas fa-layer-group"></i> 禁止跳楼层</button>
                            <button><i class="fas fa-search"></i> 规则重扫</button>
                            <button><i class="fas fa-table"></i> 表格提醒</button>
                            <button><i class="fas fa-digital-tachograph"></i> 状态栏提醒</button>
                            <button><i class="fas fa-mobile-alt"></i> 手机格式提醒</button>
                            <button><i class="fas fa-theater-masks"></i> 小剧场提醒</button>
                            <button><i class="fas fa-comment"></i> 抢话提醒</button>
                            <button><i class="fas fa-comment-slash"></i> 不抢话提醒</button>
                            <button><i class="fas fa-user"></i> 人称提醒</button>
                            <button><i class="fas fa-font"></i> 字数提醒</button>
                            <button data-action="custom_request"><i class="fas fa-paint-brush"></i> 临时自定义</button>
                        </div>
                    </section>
                    <section class="quick-request-section is-custom">
                        <div class="quick-request-section-title"><span>我的自定义指令</span><span class="quick-request-badge is-custom">独立保存</span></div>
                        <div id="custom-quick-requests-list" class="custom-quick-requests-list"></div>
                        <button class="custom-quick-request-add" data-action="create_custom_quick_request"><i class="fas fa-plus"></i> 新增自定义条目</button>
                    </section>
                </div>
            </div>
            <div class="panel-child" data-panel-id="presets">
                <header class="panel-header">
                    <button class="back-button"><i class="fas fa-arrow-left"></i></button>
                    <div class="header-title">预设管理</div>
                    <button class="close-button"><i class="fas fa-times"></i></button>
                </header>
                <div class="panel-content" id="presets-list-container">
                    <!-- Preset List -->
                </div>
            </div>
             <div class="panel-child" data-panel-id="preset-editor">
                <header class="panel-header">
                    <button class="back-to-presets"><i class="fas fa-arrow-left"></i></button>
                    <div class="header-title">编辑预设</div>
                    <button class="close-button"><i class="fas fa-times"></i></button>
                </header>
                <div class="panel-content preset-options" id="preset-editor-container">
                    <!-- Editor -->
                </div>
            </div>
            <div class="panel-child" data-panel-id="quick-switches">
                <header class="panel-header">
                    <button class="back-button"><i class="fas fa-arrow-left"></i></button>
                    <div class="header-title">快捷开关</div>
                    <button class="close-button"><i class="fas fa-times"></i></button>
                </header>
                <div class="panel-content" id="quick-switches-container">
                    <!-- Quick switches settings will be dynamically inserted here -->
                </div>
            </div>
            <div class="panel-child" data-panel-id="settings">
                <header class="panel-header">
                    <button class="back-button"><i class="fas fa-arrow-left"></i></button>
                    <div class="header-title">面板设置</div>
                    <button class="close-button"><i class="fas fa-times"></i></button>
                </header>
                <div class="panel-content panel-settings-content">
                    <section class="panel-settings-card">
                        <div class="setting-group-title panel-settings-title">外观</div>
                        <div class="panel-theme-mode-field">
                            <label for="panel-theme-mode">昼夜模式</label>
                            <small>可固定为日间或夜间，也可以使用系统模式按北京时间自动切换。</small>
                            <select id="panel-theme-mode" aria-label="昼夜模式">
                                <option value="system">系统</option>
                                <option value="day">日间</option>
                                <option value="night">夜间</option>
                            </select>
                        </div>
                    </section>
                    <section class="panel-settings-card">
                        <div class="setting-group-title panel-settings-title">打开入口方式</div>
                        <p class="panel-settings-note">可同时打开多个入口。悬浮球用于常驻打开；另外两项会尝试注入到酒馆宿主按钮区。</p>
                        <div class="panel-setting-row">
                            <div><strong>悬浮球</strong><small>可拖动，靠近左右边缘后会自动贴边隐藏。</small></div>
                            <button class="panel-setting-switch" type="button" role="switch" data-entry-mode="floatingBall" aria-checked="false"><span></span></button>
                        </div>
                        <div class="panel-setting-row">
                            <div><strong>悬浮球图标</strong><small>选择后立即生效，并自动保存。</small></div>
                            <select id="panel-floating-icon" aria-label="悬浮球图标"></select>
                        </div>
                        <div class="panel-setting-row">
                            <div><strong>注入快速回复栏</strong><small>保留原有的酒馆助手脚本按钮入口。</small></div>
                            <button class="panel-setting-switch" type="button" role="switch" data-entry-mode="quickReply" aria-checked="false"><span></span></button>
                        </div>
                        <div class="panel-setting-row">
                            <div><strong>注入扩展程序菜单</strong><small>独立于快速回复栏，不受快速回复栏隐藏功能影响。</small></div>
                            <button class="panel-setting-switch" type="button" role="switch" data-entry-mode="extensionsMenu" aria-checked="false"><span></span></button>
                        </div>
                    </section>
                </div>
            </div>
             <div class="panel-child" data-panel-id="help">
                <header class="panel-header">
                    <button class="back-button"><i class="fas fa-arrow-left"></i></button>
                    <div class="header-title">帮助说明</div>
                    <button class="close-button"><i class="fas fa-times"></i></button>
                </header>
                <div class="panel-content help-content">
                    <div class="help-section help-primary-guide">
                        <div class="help-title"><i class="fas fa-shield-alt"></i> 预设思维链稳定输出、隐藏食用指南</div>
                        <div class="help-alert">
                            <i class="fas fa-exclamation-circle"></i>
                            <b>Flash 模型和 Pro 模型的配置不同，本指南必看！不按要求配置必报错！</b>
                        </div>
                        <details class="help-faq is-critical" open>
                            <summary><span>3.8、3.7、3.6、3.5 Flash 配置说明</span><span class="help-tag tag-must">必看</span></summary>
                            <div class="help-answer">
                                <p>3.7 & 3.8 Flash 无法使用 <code>&lt;thinking&gt;</code> 作为思维链标签，否则会卡 COT失败。从本版本开始，思维链标签已改为 <code>&lt;electric&gt;</code>。</p>
                                <ol>
                                    <li>必须使用 <b>【Gemini 尾部②】</b>。</li>
                                    <li>点击酒馆顶栏从左往右第三个图标，进入“自动解析”：勾选<b>“自动解析”</b>与<b>“显示隐藏内容”</b>，前缀填写 <code>&lt;electric&gt;</code>，后缀填写 <code>&lt;/electric&gt;</code>。</li>
                                    <li>确保同一页面的<b>【高级格式化设置】</b>中，“以……开始回复”保持为空，不能填写任何内容。</li>
                                    <li>确保预设界面的<b>【续写预填充】</b>和<b>【请求思维链】</b>均未勾选。</li>
                                    <li>如果聊天补全来源是<b>“自定义兼容 OpenAI”</b>，预设助手会在【API 链接配置】→【附加参数－排除主体参数】中自动填写下方内容；切换到 Claude 时会保留你填写的内容，不再自动清空，其他不需要这些参数的模型或来源仍会自动清空。连接 <b>Google AI Studio</b> 时不需要此项。</li>
                                </ol>
                                <div class="help-code-block">- presence_penalty<br>- frequency_penalty<br>- top_p<br>- top_k<br>- temperature</div>
                                <p class="help-note"><b>注意：</b>3.5 以后的Flash模型均无法自定义温度、频率和惩罚参数。</p>
                                <p>如果因为截断需要使用续写功能，请进入“酒馆主题”页面找到“自动续写”，同时勾选<b>“已启用”</b>和<b>“允许使用聊天补全 API”</b>。</p>
                            </div>
                        </details>
                        <details class="help-faq is-critical">
                            <summary><span>3.1 Pro 配置说明</span><span class="help-tag tag-must">必看</span></summary>
                            <div class="help-answer">
                                <ol>
                                    <li>点击酒馆顶栏从左往右第三个图标，进入“自动解析”：勾选<b>“自动解析”</b>与<b>“显示隐藏内容”</b>，前缀填写 <code>&lt;electric&gt;</code>，后缀填写 <code>&lt;/electric&gt;</code>。</li>
                                    <li>确保同一页面的<b>【高级格式化设置】</b>中，“以……开始回复”填写 <code>&lt;electric&gt;</code>。</li>
                                    <li>如果之前按照 Flash 配置修改过其他项目，其余设置恢复为初始化时的未修改状态即可。</li>
                                </ol>
                            </div>
                        </details>
                        <details class="help-faq is-critical">
                            <summary><span>哈基米防截断食用指南</span><span class="help-tag tag-must">必看</span></summary>
                            <div class="help-answer">
                                <p>Google 在推出 3.7 Flash 后加强了外部安全审查，包括 3.1 Pro 在内的模型也更容易受影响。简单来说，内容可能先经过外部模型的关键词检测；命中敏感词后，模型可能强制道歉、空回或截断。</p>
                                <p>目前较容易触发的领域包括：非自愿行为（如明确出现强暴、强制、虐待等字眼）、数删及政治相关内容。使用反重力渠道触发道歉时，道歉信息中通常会附带 Google 安全协议的查看链接。</p>
                                <p>想让 3.7 Flash／哈基米尽量稳定输出，请优先执行：</p>
                                <ol>
                                    <li>渠道优先选择 <b>Vertex</b>。如果必须使用 Build 或 AGY 反重力渠道，务必使用<b>非流式</b>或<b>带假流前缀的模型</b>。</li>
                                    <li>尽量不要挂载包含大量 NSFW 内容的世界书，例如专门的 NSFW 指导世界书、含大量 NSFW 词条的生图世界书。这类世界书在 Build 或反重力渠道下更容易触发空回或道歉。</li>
                                    <li>若出现秒空回或道歉，先停用相关世界书后重试。日月西自带的 NSFW 词条通常可以正常开启。</li>
                                </ol>
                            </div>
                        </details>
                    </div>

                    <div class="help-hero">
                        <div class="help-hero-icon"><i class="fas fa-compass"></i></div>
                        <div>
                            <div class="help-hero-title">使用帮助与常见问题</div>
                            <p>按模块查找问题，点击问题标题即可展开详细解答。</p>
                        </div>
                    </div>

                    <div class="help-section">
                        <div class="help-title"><i class="fas fa-exclamation-triangle"></i> 必看排障</div>
                        <details class="help-faq is-critical" open>
                            <summary><span>容易截断或者空回怎么办？</span><span class="help-tag tag-must">必看</span></summary>
                            <div class="help-answer">
                                <ol>
                                    <li>游玩较敏感的内容时，请查看预设说明并打开底部防截断模块（三选一）；使用流式模型时，同时开启流式传输。</li>
                                    <li>遇到截断或空回，可以删除该回复后重新发送。不要在同一楼层反复重 Roll，以免上下文或状态异常。</li>
                                    <li><b>Build 反代目前比其他渠道更容易出现空回或截断，暂不推荐使用。</b></li>
                                </ol>
                            </div>
                        </details>
                        <details class="help-faq">
                            <summary><span>如何修改字数、人称、视角、抢话和转述？</span><span class="help-tag tag-must">必看</span></summary></summary>
                            <div class="help-answer">
                                <p>这些功能都已集成到【预设助手】中。默认点击屏幕边缘的月亮悬浮球即可打开；也可在【面板设置】中启用快速回复栏或扩展程序菜单入口。</p>
                                <p>如果找不到按钮，可能是被界面美化隐藏、收进 QR 助手面板、酒馆助手版本过旧，或导入日月西时没有自动绑定脚本。请逐项检查。</p>
                            </div>
                        </details>
                        <details class="help-faq is-critical">
                            <summary><span>涩涩总是一轮游怎么办？</span><span class="help-tag tag-important">重要</span></summary>
                            <div class="help-answer">
                                <p>请同时打开预设中的 <b>【涩个不停】</b>、<b>【一键开关】</b> 和 <b>【摘要开关】</b>。三个开关需要配合使用；如果仍容易提前结束，可适当降低字数与段落要求。</p>
                            </div>
                        </details>
                        <details class="help-faq is-critical">
                            <summary><span>爆思维链或思维链格式异常怎么办？</span><span class="help-tag tag-important">重要</span></summary>
                            <div class="help-answer">
                                <p>当前思维链标记是 <code>electric</code>，不是 <code>thinking</code>，必须设置自动解析。若没有生效，请检查标记是否拼写正确，并确保配置中没有空行，也不要额外添加引号、短横线等字符。</p>
                            </div>
                        </details>
                        <details class="help-faq">
                            <summary><span>想用来玩 Claude，可以吗？</span><span class="help-tag tag-important">重要</span></summary>
                            <div class="help-answer">
                                <p>在【预设助手-快捷开关】中，使用模型切换成Claude，其余参数请根据实际游玩效果调整。</p>
                            </div>
                        </details>
                    </div>

                    <div class="help-section">
                        <div class="help-title"><i class="fas fa-sliders-h"></i> 叙事与预设设置</div>
                        <details class="help-faq">
                            <summary><span>如何自己缝 COT？</span><span class="help-tag tag-important">重要</span></summary></summary>
                            <div class="help-answer">
                                <p>预设内已经预留了专用缝合区。请找到对应的“缝合”条目，并严格按照条目内部说明放置和启用内容；不要随意改动其他思维链条目的顺序。关于变量cot的缝合，请在预设WIKI查看详细教程。</p>
                            </div>
                        </details>
                        <details class="help-faq">
                            <summary><span>开抢话却不抢，或关抢话却使劲抢？</span><span class="help-tag tag-important">重要</span></summary>
                            <div class="help-answer">
                                <ol>
                                    <li>先确认前文、开场白和角色设定符合当前的抢话／不抢话要求；已有上下文会影响模型表现，必要时请自行修改或重新生成。</li>
                                    <li>使用【预设助手】里的“抢话提醒”“不抢话提醒”或“规则重扫”等快速指令辅助纠正。</li>
                                    <li>需要严格不抢话时，建议把字数与段落要求尽可能调到最低档（1000字以下），减少模型自行补全用户行动的空间。</li>
                                </ol>
                            </div>
                        </details>
                        <details class="help-faq">
                            <summary><span>角色老是读取用户心理怎么办？</span></summary>
                            <div class="help-answer">
                                <p>发送消息时，建议用明显不同的格式区分用户的“对白”和“心理活动”；同时打开预设中的【防全知】、【秘密档案】等相关功能，降低角色读取未公开信息的概率。</p>
                            </div>
                        </details>
                    </div>

                    <div class="help-section">
                        <div class="help-title"><i class="fas fa-book-open"></i> 总结与大纲</div>
                        <details class="help-faq">
                            <summary><span>如何执行大总结？</span><span class="help-tag tag-important">重要</span></summary>
                            <div class="help-answer">
                                <ol>
                                    <li>在【象牙塔助手】或【预设助手】的预设设置中打开【总结模式】。</li>
                                    <li>回到助手的“总结&大纲”模块，根据需要点击“总结全文”或“总结本章”发送指令。</li>
                                </ol>
                            </div>
                        </details>
                        <details class="help-faq">
                            <summary><span>大纲和大总结应该放在哪里？</span><span class="help-tag tag-important">重要</span></summary>
                            <div class="help-answer">
                                <p><b>放在聊天中：</b>直接保留即可。使用大总结后，记得隐藏总结之前的楼层，避免上下文过长。</p>
                                <p><b>放在角色卡世界书：</b>建议设置为：</p>
                                <ul>
                                    <li>策略：🔵 蓝灯（Constant）</li>
                                    <li>位置：⚙️ 系统 d（System Post-History）</li>
                                    <li>深度：999</li>
                                    <li>顺序：100</li>
                                </ul>
                            </div>
                        </details>
                        <details class="help-faq">
                            <summary><span>“总结&大纲”里的其他按钮有什么用？</span></summary>
                            <div class="help-answer">
                                <p>“构建／修改大纲”用于生成或调整后续剧情框架；“隐藏／取消隐藏楼层”可按范围管理上下文；“楼层统计”和“保留最近楼层”可快速检查并精简聊天记录。</p>
                            </div>
                        </details>
                    </div>

                    <div class="help-section">
                        <div class="help-title"><i class="fas fa-tv"></i> 弹幕与附加组件</div>
                        <details class="help-faq">
                            <summary><span>如何打开或关闭日月西弹幕？</span></summary>
                            <div class="help-answer">
                                <ol>
                                    <li>在预设内打开或关闭【文中弹幕组件】条目。</li>
                                    <li>在酒馆助手预设脚本中打开或关闭【文中弹幕】；也可以点击输入框左侧第二个按钮（通常是魔法棒），进入【文中弹幕设置】后勾选或取消“启用渲染”。</li>
                                </ol>
                                <p>弹幕需要“预设条目”和“渲染开关”同时启用。只开其中一个通常不会显示。</p>
                            </div>
                        </details>
                        <details class="help-faq">
                            <summary><span>“日月来信”在哪里？如何关闭？</span></summary>
                            <div class="help-answer">
                                <p>日月来信是信封外观的悬浮窗，通常会贴边、半透明吸附；暂时没看到时可以沿屏幕边缘仔细查找。</p>
                                <p>不需要时，请同时关闭预设中的【日月来信】条目和酒馆助手预设脚本里的【日月来信】开关。</p>
                            </div>
                        </details>
                    </div>

                    <div class="help-section">
                        <div class="help-title"><i class="fas fa-tachometer-alt"></i> 性能与界面</div>
                        <details class="help-faq">
                            <summary><span>美化太多，有点卡怎么办？</span></summary>
                            <div class="help-answer">
                                <ol>
                                    <li>正则美化均为可选功能，优先关闭不需要的美化，直接阅读原始文字内容。</li>
                                    <li>调低酒馆的渲染楼层数，以及酒馆助手各组件的渲染楼层数。</li>
                                    <li>如果仍然卡顿，可在社区自行查找防卡顿插件；此处不指定推荐具体插件。</li>
                                </ol>
                            </div>
                        </details>
                        <details class="help-faq">
                            <summary><span>如何更换【预设助手】的打开入口？</span></summary>
                            <div class="help-answer">
                                <p>打开【预设助手】→【面板设置】，可同时启用悬浮球、快速回复栏和扩展程序菜单入口。</p>
                                <p>悬浮球可拖动并贴边隐藏；扩展程序菜单入口独立于快速回复栏，不会被快速回复栏隐藏功能连带隐藏。</p>
                            </div>
                        </details>
                    </div>

                    <div class="help-section">
                        <div class="help-title"><i class="fas fa-tools"></i> 管理与更多帮助</div>
                        <details class="help-faq">
                            <summary><span>预设管理怎么用？</span></summary>
                            <div class="help-answer">
                                <p><b>角色绑定：</b>把一套配置绑定到当前角色卡，之后切换到该角色时会自动应用。</p>
                                <p><b>全局预设：</b>未绑定专属预设的角色会使用全局默认配置。</p>
                                <p><b>自定义篇幅：</b>可在预设编辑中调整字数、段落数和段落风格。</p>
                            </div>
                        </details>
                        <details class="help-faq">
                            <summary><span>快速要求是什么？</span></summary>
                            <div class="help-answer">
                                <p>快速要求会把一次性的补充指令写入输入框，用来修正或引导下一次回复，例如“禁止重复”“慢速叙事”“规则重扫”等。它不会永久替代预设设置。</p>
                            </div>
                        </details>
                        <div class="help-support-links">
                            <div class="help-changelog-card">
                                <i class="fas fa-history"></i>
                                <div><b>更新日志合辑 <span class="help-version-tag">v${CURRENT_CHANGELOG_VERSION} 最新</span></b><span>查看当前版本与往期更新内容</span></div>
                                <button data-action="open_changelog"><i class="fas fa-book-reader"></i> 查看日志</button>
                            </div>
                            <div class="help-resource-card">
                                <i class="fas fa-globe"></i>
                                <div><b>预设 Wiki</b><span>更多安装、配置与使用说明</span></div>
                                <a href="https://electricwave.wiki/" target="_blank" rel="noopener noreferrer">打开 Wiki <i class="fas fa-external-link-alt"></i></a>
                            </div>
                            <div class="help-tutorial-card">
                                <i class="fas fa-graduation-cap"></i>
                                <div><b>需要从头配置？</b><span>重新打开初始化教学，按步骤完成关键设置。</span></div>
                                <button data-action="open_tutorial"><i class="fas fa-graduation-cap"></i> 新手教学</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <footer class="panel-footer">
                2026 © 电波系
            </footer>
        </div>
    </div>
`;

export const welcomeHtml = `
    <div id="qr-welcome-popup">
        <div class="control-panel welcome-panel">
            <header class="panel-header">
                <div class="header-title">新手教学</div>
                <button class="close-button" id="close-welcome"><i class="fas fa-times"></i></button>
            </header>
            <div class="panel-content tutorial-content">
                <div class="tutorial-progress">
                    <div class="tutorial-progress-track"><div id="tutorial-progress-bar"></div></div>
                    <div class="tutorial-progress-text" id="tutorial-progress-text">第 1 / 5 步</div>
                </div>
                <div class="tutorial-stage">
                    <div class="tutorial-icon"><i class="fas fa-moon"></i></div>
                    <div id="tutorial-step-title">欢迎来到月读控制台</div>
                    <p id="tutorial-step-subtitle">这个引导会在 1 分钟内带你完成从零到可用的核心设置。</p>
                    <ul id="tutorial-step-points" class="tutorial-list"></ul>
                    <div id="tutorial-step-tip" class="tutorial-tip"></div>
                </div>
                <div class="tutorial-actions">
                    <button id="qr-tutorial-skip" class="tutorial-btn subtle"><i class="fas fa-forward"></i> 跳过教学</button>
                    <button id="qr-tutorial-prev" class="tutorial-btn subtle"><i class="fas fa-arrow-left"></i> 上一步</button>
                    <button id="qr-start-setup" class="tutorial-btn primary"><i class="fas fa-arrow-right"></i> 下一步</button>
                </div>
            </div>
            <footer class="panel-footer">
                新手引导可在「帮助说明 -> 新手教学」再次打开
            </footer>
        </div>
    </div>
`;

export const panelCss = `
    @import url('https://fonts.googleapis.com/css2?family=Source+Han+Sans+SC:wght@400;500;700&display=swap');
    :root {
      --font-main: 'Source Han Sans SC', sans-serif;
                        --panel-bg: rgba(246, 236, 225, 0.97); --panel-border: rgba(218, 165, 32, 0.34);
            --panel-shadow: 0 8px 20px rgba(92, 54, 32, 0.14); --panel-header-bg: linear-gradient(135deg, rgba(255, 251, 244, 0.84), rgba(246, 229, 206, 0.64));
            --panel-text-main: #4a3424; --panel-text-accent: #d85c3b; --panel-text-value: #745845; --panel-text-highlight: #b57447;
                        --panel-button-bg: rgba(255, 255, 255, 0.76); --panel-button-border: 1px solid rgba(218, 165, 32, 0.28);
                        --panel-button-hover-bg: rgba(255, 248, 239, 0.98); --status-bg: rgba(255, 251, 245, 0.82); --highlight-bg: rgba(216, 92, 59, 0.14); --highlight-border: rgba(216, 92, 59, 0.34);
                        --panel-overlay-bg: rgba(26, 18, 10, 0.52); --panel-soft-module: rgba(255, 249, 242, 0.78);
    }
    .dark-mode {
      --panel-bg: linear-gradient(145deg, rgba(10, 13, 20, 0.96), rgba(14, 19, 30, 0.94)); --panel-border: rgba(145, 165, 195, 0.22);
      --panel-shadow: 0 8px 24px rgba(0, 0, 0, 0.42), inset 0 0 24px rgba(150, 172, 205, 0.05);
            --panel-header-bg: linear-gradient(135deg, rgba(18, 24, 37, 0.94), rgba(28, 37, 56, 0.9)); --panel-text-main: #f2f7ff;
            --panel-text-accent: #bfd4f6; --panel-text-value: #b2c2d9; --panel-text-highlight: #e2ecff; --panel-button-bg: rgba(188, 207, 235, 0.14);
            --panel-button-border: 1px solid rgba(188, 207, 235, 0.34); --panel-button-hover-bg: rgba(188, 207, 235, 0.24);
            --status-bg: rgba(188, 207, 235, 0.1); --highlight-bg: rgba(188, 207, 235, 0.16); --highlight-border: rgba(188, 207, 235, 0.44);
            --panel-overlay-bg: rgba(2, 5, 10, 0.68); --panel-soft-module: rgba(188, 207, 235, 0.08);
    }
        /* Scoped reset: keep panel UI independent from SillyTavern global styles. */
        #control-panel-container .control-panel,
        #qr-welcome-popup .control-panel,
        .qs-builder-overlay .control-panel {
            font-family: var(--font-main) !important;
            color: var(--panel-text-main) !important;
        }
        #control-panel-container .control-panel *,
        #qr-welcome-popup .control-panel *,
        .qs-builder-overlay .control-panel * {
            box-sizing: border-box;
        }
        #control-panel-container .control-panel :is(h1, h2, h3, h4, h5, h6, p, li, label, input, textarea, button, select),
        #qr-welcome-popup .control-panel :is(h1, h2, h3, h4, h5, h6, p, li, label, input, textarea, button, select),
        .qs-builder-overlay .control-panel :is(h1, h2, h3, h4, h5, h6, p, li, label, input, textarea, button, select) {
            font-family: var(--font-main) !important;
            text-transform: none;
            letter-spacing: normal;
        }
        #control-panel-container .control-panel :is(button, input, textarea, select),
        #qr-welcome-popup .control-panel :is(button, input, textarea, select),
        .qs-builder-overlay .control-panel :is(button, input, textarea, select) {
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            text-shadow: none;
            outline: none;
        }
        #control-panel-container .control-panel ul,
        #control-panel-container .control-panel ol,
        #qr-welcome-popup .control-panel ul,
        #qr-welcome-popup .control-panel ol,
        .qs-builder-overlay .control-panel ul,
        .qs-builder-overlay .control-panel ol {
            margin: 0;
            padding-left: 1.2em;
        }
        .control-panel[data-ui-skin="xiangyata"] {
            --panel-bg: rgba(248, 244, 236, 0.97);
            --panel-border: rgba(184, 166, 138, 0.45);
            --panel-shadow: 0 10px 24px rgba(64, 49, 35, 0.14);
            --panel-header-bg: linear-gradient(135deg, rgba(255, 251, 244, 0.85), rgba(238, 225, 199, 0.65));
            --panel-text-main: #3d2f1f;
            --panel-text-accent: #8b6a3f;
            --panel-text-value: #7a6242;
            --panel-text-highlight: #a88351;
            --panel-button-bg: rgba(255, 251, 245, 0.72);
            --panel-button-border: 1px solid rgba(184, 166, 138, 0.5);
            --panel-button-hover-bg: rgba(255, 248, 236, 0.98);
            --status-bg: rgba(255, 251, 245, 0.84);
            --highlight-bg: rgba(168, 131, 81, 0.13);
            --highlight-border: rgba(168, 131, 81, 0.34);
            --panel-overlay-bg: rgba(26, 18, 10, 0.42);
            --panel-soft-module: rgba(255, 248, 237, 0.8);
        }
        .control-panel.dark-mode[data-ui-skin="xiangyata"] {
            --panel-bg: linear-gradient(145deg, rgba(27, 20, 12, 0.96), rgba(38, 29, 18, 0.94));
            --panel-border: rgba(185, 154, 106, 0.24);
            --panel-shadow: 0 8px 24px rgba(0, 0, 0, 0.46), inset 0 0 24px rgba(201, 165, 109, 0.06);
            --panel-header-bg: linear-gradient(135deg, rgba(45, 33, 19, 0.94), rgba(58, 43, 26, 0.9));
            --panel-text-main: #f2e8d8;
            --panel-text-accent: #d2b07c;
            --panel-text-value: #d6bf99;
            --panel-text-highlight: #e5cc9b;
            --panel-button-bg: rgba(210, 176, 124, 0.12);
            --panel-button-border: 1px solid rgba(210, 176, 124, 0.36);
            --panel-button-hover-bg: rgba(210, 176, 124, 0.22);
            --status-bg: rgba(210, 176, 124, 0.1);
            --highlight-bg: rgba(210, 176, 124, 0.12);
            --highlight-border: rgba(210, 176, 124, 0.34);
            --panel-overlay-bg: rgba(9, 6, 2, 0.67);
            --panel-soft-module: rgba(210, 176, 124, 0.08);
        }
    .panel-footer {
        text-align: center;
        padding: 8px;
        font-size: 0.75em;
        color: var(--panel-text-value);
        opacity: 0.6;
        border-top: 1px solid var(--panel-border);
        background: rgba(0,0,0,0.02);
    }
    #control-panel-container, #qr-welcome-popup, .qs-builder-overlay {
        --th-runtime-safe-top: 0px;
        --th-runtime-safe-right: 0px;
        --th-runtime-safe-bottom: 0px;
        --th-runtime-safe-left: 0px;
        --th-runtime-view-width: 100vw;
        --th-runtime-view-height: 100vh;
        --th-panel-safe-top: max(env(safe-area-inset-top, 0px), var(--th-runtime-safe-top));
        --th-panel-safe-right: max(env(safe-area-inset-right, 0px), var(--th-runtime-safe-right));
        --th-panel-safe-bottom: max(env(safe-area-inset-bottom, 0px), var(--th-runtime-safe-bottom));
        --th-panel-safe-left: max(env(safe-area-inset-left, 0px), var(--th-runtime-safe-left));
        --th-panel-header-height: calc(50px + var(--th-panel-safe-top));
    }
    #control-panel-container, #qr-welcome-popup {
        position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; height: 100dvh !important; background-color: var(--panel-overlay-bg);
        z-index: 2147483000 !important; opacity: 0; transition: opacity 0.3s ease;
        isolation: isolate; overflow: hidden; overscroll-behavior: none; pointer-events: none; font-family: var(--font-main); color: var(--panel-text-main);
    }
    #control-panel-container.visible, #qr-welcome-popup.visible { opacity: 1 !important; pointer-events: auto !important; }
    #control-panel-container.is-compact-layout {
        width: var(--th-runtime-view-width) !important;
        height: var(--th-runtime-view-height) !important;
    }
    #control-panel-container.is-compact-layout > .control-panel {
        box-sizing: border-box !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        max-width: none !important;
        height: 100% !important;
        max-height: none !important;
        border-radius: 0 !important;
        border-left: none !important;
        border-right: none !important;
        transform: none !important;
    }
    #control-panel-container.is-compact-layout > .control-panel > .panel-main,
    #control-panel-container.is-compact-layout > .control-panel > .panel-child {
        height: 100% !important;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        overflow: hidden;
    }
    #control-panel-container.is-compact-layout .panel-footer { display: none !important; }
    .control-panel {
        background: var(--panel-bg); border-radius: 16px; border: 1px solid var(--panel-border);
        box-shadow: var(--panel-shadow); width: 90%; max-width: 480px; backdrop-filter: blur(12px);
        overflow: hidden; position: absolute; top: 50%; left: 50%;
        transform: scale(0.95); transition: transform 0.3s ease, opacity 0.3s ease;
    }
     .control-panel.welcome-panel {
        transform: scale(0.95);
    }
    #control-panel-container.visible .control-panel, #qr-welcome-popup.visible .welcome-panel { transform: scale(1); }
    @media (max-width: 1000px) {
       .control-panel {
           top: 45%;
           transform: scale(0.95);
       }
       #control-panel-container.visible .control-panel, #qr-welcome-popup.visible .welcome-panel {
           transform: scale(1);
       }
     }
    @media (max-width: 768px), (max-height: 620px) {
        .control-panel:not(.qs-builder-panel):not(.qs-sub-panel) {
            box-sizing: border-box;
            position: fixed;
            top: 0 !important;
            left: 0 !important;
            width: 100vw;
            max-width: none;
            height: 100dvh;
            border-radius: 0;
            border-left: none;
            border-right: none;
            transform: none !important;
        }
        .control-panel.welcome-panel,
        #control-panel-container.visible .control-panel:not(.qs-builder-panel):not(.qs-sub-panel),
        #qr-welcome-popup.visible .welcome-panel:not(.qs-builder-panel):not(.qs-sub-panel) {
            transform: none !important;
        }
        #control-panel-container .panel-main,
        #control-panel-container .panel-child,
        #qr-welcome-popup .panel-main,
        #qr-welcome-popup .panel-child {
            height: 100% !important;
            display: grid;
            grid-template-rows: auto minmax(0, 1fr);
            overflow: hidden;
        }
        #control-panel-container .panel-child .panel-content,
        #qr-welcome-popup .panel-child .panel-content {
            max-height: none;
            min-height: 0;
            height: auto !important;
            overflow-y: auto;
            overscroll-behavior-y: contain;
            touch-action: pan-y;
            padding-bottom: calc(14px + var(--th-panel-safe-bottom));
            -webkit-overflow-scrolling: touch;
        }
        #control-panel-container .panel-main > .panel-content,
        #qr-welcome-popup .panel-main > .panel-content {
            min-height: 0;
            overflow-y: auto;
            overscroll-behavior-y: contain;
            touch-action: pan-y;
            -webkit-overflow-scrolling: touch;
        }
        #control-panel-container .panel-footer,
        #qr-welcome-popup .panel-footer {
            display: none;
        }
        #control-panel-container .panel-header,
        #qr-welcome-popup .panel-header,
        .qs-builder-overlay .panel-header {
            cursor: default;
            padding: calc(12px + var(--th-panel-safe-top)) calc(12px + var(--th-panel-safe-right)) 12px calc(12px + var(--th-panel-safe-left));
        }
        #control-panel-container .panel-content,
        #qr-welcome-popup .panel-content,
        .qs-builder-overlay .panel-content {
            padding: 12px calc(12px + var(--th-panel-safe-right)) 12px calc(12px + var(--th-panel-safe-left));
            padding-bottom: calc(12px + var(--th-panel-safe-bottom));
        }

        .qs-builder-overlay {
            padding: 0;
            align-items: stretch;
            justify-content: stretch;
        }
        .control-panel.qs-builder-panel,
        .control-panel.qs-sub-panel {
            top: 0 !important;
            left: 0 !important;
            transform: none !important;
            width: 100vw;
            max-width: none;
            height: 100dvh;
            max-height: none;
            border-radius: 0;
            border-left: none;
            border-right: none;
        }
        .qs-builder-panel .panel-content,
        .qs-sub-panel .panel-content {
            height: calc(100% - var(--th-panel-header-height));
            overflow: hidden;
            -webkit-overflow-scrolling: touch;
            padding-bottom: calc(12px + var(--th-panel-safe-bottom));
        }
    }
    #control-panel-container .panel-header,
    #qr-welcome-popup .panel-header,
    .qs-builder-overlay .panel-header {
        background: var(--panel-header-bg); padding: calc(12px + var(--th-panel-safe-top)) 15px 12px; display: grid;
        grid-template-columns: 50px 1fr 50px; align-items: center; text-align: center;
        cursor: move; min-height: var(--th-panel-header-height); user-select: none; -webkit-user-select: none; touch-action: none;
    }
    #control-panel-container .header-title,
    #qr-welcome-popup .header-title,
    .qs-builder-overlay .header-title { font-size: inherit !important; font-weight: 600; grid-column: 2; color: var(--panel-text-main); }
    #control-panel-container .close-button,
    #control-panel-container .back-button,
    #control-panel-container .back-to-presets,
    #control-panel-container .theme-switcher button,
    #qr-welcome-popup .close-button,
    #qr-welcome-popup .back-button,
    #qr-welcome-popup .back-to-presets,
    #qr-welcome-popup .theme-switcher button,
    .qs-builder-overlay .close-button,
    .qs-builder-overlay .back-button,
    .qs-builder-overlay .back-to-presets,
    .qs-builder-overlay .theme-switcher button {
        background: none; border: none; color: var(--panel-text-main); font-size: inherit !important;
        cursor: pointer; opacity: 0.7; transition: opacity 0.2s; height: 100%; display: grid; place-items: center;
        width: 100%; padding: 0; touch-action: manipulation;
    }
    #control-panel-container .theme-switcher,
    #qr-welcome-popup .theme-switcher,
    .qs-builder-overlay .theme-switcher { grid-column: 1; justify-self: start; }
    #control-panel-container .close-button,
    #qr-welcome-popup .close-button,
    .qs-builder-overlay .close-button { grid-column: 3; justify-self: end; }
    #control-panel-container .back-button,
    #control-panel-container .back-to-presets,
    #qr-welcome-popup .back-button,
    #qr-welcome-popup .back-to-presets,
    .qs-builder-overlay .back-button,
    .qs-builder-overlay .back-to-presets { grid-column: 1; justify-self: start; }
    #control-panel-container .close-button:hover,
    #control-panel-container .back-button:hover,
    #control-panel-container .back-to-presets:hover,
    #control-panel-container .theme-switcher button:hover,
    #qr-welcome-popup .close-button:hover,
    #qr-welcome-popup .back-button:hover,
    #qr-welcome-popup .back-to-presets:hover,
    #qr-welcome-popup .theme-switcher button:hover,
    .qs-builder-overlay .close-button:hover,
    .qs-builder-overlay .back-button:hover,
    .qs-builder-overlay .back-to-presets:hover,
    .qs-builder-overlay .theme-switcher button:hover { opacity: 1; }
    #control-panel-container .panel-content,
    #qr-welcome-popup .panel-content,
    .qs-builder-overlay .panel-content { padding: 15px; }
    #control-panel-container .panel-child .panel-content,
    #qr-welcome-popup .panel-child .panel-content,
    .qs-builder-overlay .panel-child .panel-content { height: calc(100% - var(--th-panel-header-height)); overflow-y: auto; }
    #control-panel-container .panel-main,
    #control-panel-container .panel-child,
    #qr-welcome-popup .panel-main,
    #qr-welcome-popup .panel-child,
    .qs-builder-overlay .panel-main,
    .qs-builder-overlay .panel-child { transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); height: calc(100% - 35px); }
    #control-panel-container .panel-child,
    #qr-welcome-popup .panel-child,
    .qs-builder-overlay .panel-child {
        position: absolute; top: 0; left: 0; width: 100%;
        transform: translateX(100%); background: var(--panel-bg);
        z-index: 10;
    }
    #control-panel-container .control-panel.show-child .panel-main,
    .qs-builder-overlay .control-panel.show-child .panel-main { transform: translateX(-100%); }
    #control-panel-container .control-panel.show-child .panel-child.active,
    .qs-builder-overlay .control-panel.show-child .panel-child.active { transform: translateX(0); }
    #control-panel-container .control-panel.show-editor .panel-child[data-panel-id="presets"],
    .qs-builder-overlay .control-panel.show-editor .panel-child[data-panel-id="presets"] { transform: translateX(-100%); }
    #control-panel-container .control-panel.show-editor .panel-child[data-panel-id="preset-editor"],
    .qs-builder-overlay .control-panel.show-editor .panel-child[data-panel-id="preset-editor"] { transform: translateX(0); }

    .status-display {
        background: transparent; padding: 0; margin-bottom: 20px;
        font-size: 0.9em; line-height: 1.6; display: flex; flex-direction: column;
        gap: 12px; align-items: stretch;
    }
    .status-display p { margin: 0; }
    .status-label { font-weight: 600; color: var(--panel-text-accent) !important; font-size: 0.8em; opacity: 0.8; letter-spacing: 0.5px; text-transform: uppercase; }
    .status-value { font-weight: 700; color: var(--panel-text-main) !important; font-size: 1.1em; margin-top: 4px !important; }

    #control-panel-container .main-menu button.theme-auto-on { color: var(--panel-text-accent) !important; }
    #control-panel-container .dark-mode .main-menu button.theme-auto-on { color: var(--panel-text-highlight) !important; }
    #control-panel-container .main-menu button.theme-auto-off { color: var(--panel-text-value) !important; opacity: 0.84; }
    #control-panel-container .dark-mode .main-menu button.theme-auto-off { color: var(--panel-text-value) !important; opacity: 0.82; }

    .status-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; width: 100%; }
    .status-item {
        padding: 12px 14px; border-radius: 12px;
        background: linear-gradient(135deg, rgba(255,255,255,0.62) 0%, var(--panel-soft-module) 100%);
        border: 1px solid rgba(190, 205, 225, 0.45);
        box-shadow: 0 4px 15px rgba(20, 28, 40, 0.06), inset 0 0 0 1px rgba(255,255,255,0.35);
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        display: flex; flex-direction: column;
        align-items: flex-start; justify-content: center;
        position: relative; overflow: hidden;
        backdrop-filter: blur(10px);
        cursor: pointer;
    }
    .status-item:hover {
        background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%);
        transform: translateY(-2px);
        box-shadow: 0 8px 22px rgba(20, 28, 40, 0.08), inset 0 0 0 1px rgba(255,255,255,0.5);
        border-color: var(--panel-text-accent);
    }
    .status-item::before {
        content: ''; position: absolute; left: 0; top: 15%; bottom: 15%; width: 3px;
        background: var(--panel-text-accent); border-radius: 0 3px 3px 0; opacity: 0.5;
    }
    .status-item .status-label {
        font-size: 0.7em; text-transform: uppercase; letter-spacing: 0.8px;
        color: var(--panel-text-accent); margin-bottom: 3px; font-weight: 700;
        padding-left: 10px; opacity: 0.9;
    }
    .status-item .status-value {
        font-size: 1.1em; font-weight: 700; color: var(--panel-text-main);
        line-height: 1.2; padding-left: 10px;
        text-shadow: 0 1px 0 rgba(255,255,255,0.5);
    }
    .dark-mode .status-item .status-value { text-shadow: none; }
    .status-item.full-width {
        flex-direction: row; justify-content: space-between; align-items: center;
        grid-column: span 2;
        background: linear-gradient(120deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 100%);
    }
    .status-item.full-width::before { background: var(--panel-text-accent); }
    .status-item.full-width .status-label { margin-bottom: 0; color: var(--panel-text-accent); }
    .status-item.full-width .status-value { margin-top: 0 !important; color: var(--panel-text-highlight); font-size: 1.2em; }

    .dark-mode .status-item {
        background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
        border-color: rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 15px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.05);
    }
    .dark-mode .status-item:hover {
        background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%);
        border-color: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
    }
    .dark-mode .status-item.full-width {
         background: linear-gradient(120deg, rgba(163, 186, 221, 0.18) 0%, transparent 100%);
    }
    .dark-mode .status-item.full-width .status-label { color: #b7c9e6; }
    .dark-mode .status-item.full-width .status-value { color: #d2def0; }
        .control-panel[data-ui-skin="xiangyata"] .status-item.full-width::before { background: var(--panel-text-accent); }
        .control-panel[data-ui-skin="xiangyata"] .status-item.full-width .status-label { color: var(--panel-text-accent); }
        .control-panel[data-ui-skin="xiangyata"] .status-item.full-width .status-value { color: var(--panel-text-highlight); }
        .control-panel.dark-mode[data-ui-skin="xiangyata"] .status-item.full-width {
            background: linear-gradient(120deg, rgba(210, 176, 124, 0.2) 0%, transparent 100%);
        }
        .control-panel.dark-mode[data-ui-skin="xiangyata"] .status-item.full-width .status-label { color: #d9bb88; }
        .control-panel.dark-mode[data-ui-skin="xiangyata"] .status-item.full-width .status-value { color: #f0dcc0; }

        .control-panel[data-ui-skin="xiangyata"] .main-menu button.theme-auto-on { color: var(--panel-text-accent) !important; }
        .control-panel.dark-mode[data-ui-skin="xiangyata"] .main-menu button.theme-auto-on { color: var(--panel-text-highlight) !important; }
        .control-panel[data-ui-skin="xiangyata"] .main-menu button.theme-auto-off { color: var(--panel-text-value) !important; }
        .control-panel.dark-mode[data-ui-skin="xiangyata"] .main-menu button.theme-auto-off { color: var(--panel-text-value) !important; }

    #control-panel-container .main-menu { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    #control-panel-container .panel-settings-content { display: flex; flex-direction: column; gap: 12px; }
    #control-panel-container .panel-settings-card { padding: 14px; border: 1px solid var(--panel-border); border-radius: 12px; background: var(--panel-soft-module); }
    #control-panel-container .panel-settings-title { margin: 0 0 10px; padding: 1px 0 1px 10px; border-left: 3px solid var(--panel-text-accent); color: var(--panel-text-main); font-size: 1.02em; font-weight: 700; text-align: left; }
    #control-panel-container .panel-settings-note { margin: 0 0 10px; color: var(--panel-text-value); font-size: .86em; line-height: 1.55; }
    #control-panel-container #panel-floating-icon { max-width: 112px; flex-shrink: 0; }
    #control-panel-container .panel-theme-mode-field { display: grid; gap: 6px; }
    #control-panel-container .panel-theme-mode-field label { color: var(--panel-text-main); font-weight: 600; }
    #control-panel-container .panel-theme-mode-field small { color: var(--panel-text-value); line-height: 1.4; }
    #control-panel-container :is(#panel-theme-mode, #panel-floating-icon) { width: 100%; min-height: 40px; margin-top: 3px; padding: 0 12px; border: var(--panel-button-border); border-radius: 9px; background: var(--panel-button-bg); color: var(--panel-text-main); font-family: var(--font-main); font-size: .94em; outline: none; }
    #control-panel-container :is(#panel-theme-mode, #panel-floating-icon):focus { border-color: var(--panel-text-accent); box-shadow: 0 0 0 2px var(--highlight-bg); }
    #control-panel-container .panel-setting-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-height: 48px; padding: 7px 0; }
    #control-panel-container .panel-setting-row + .panel-setting-row { border-top: 1px solid var(--panel-border); }
    #control-panel-container .panel-setting-row > div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    #control-panel-container .panel-setting-row strong { color: var(--panel-text-main); font-weight: 600; }
    #control-panel-container .panel-setting-row small { color: var(--panel-text-value); line-height: 1.4; }
    #control-panel-container .panel-setting-switch { position: relative; flex: 0 0 48px; width: 48px; height: 28px; padding: 0; border: 1px solid var(--panel-border); border-radius: 999px; background: color-mix(in srgb, var(--panel-text-value) 28%, var(--panel-button-bg)); cursor: pointer; transition: background .2s ease, border-color .2s ease, box-shadow .2s ease; }
    #control-panel-container .panel-setting-switch span { position: absolute; left: 3px; top: 3px; width: 20px; height: 20px; border-radius: 50%; background: var(--panel-bg); box-shadow: 0 1px 4px rgba(20,28,40,.22); transition: transform .2s ease; }
    #control-panel-container .panel-setting-switch[aria-checked="true"] { border-color: var(--panel-text-accent); background: linear-gradient(135deg, var(--panel-text-accent), var(--panel-text-highlight)); box-shadow: 0 2px 7px var(--highlight-border); }
    #control-panel-container .panel-setting-switch[aria-checked="true"] span { transform: translateX(20px); }
    #control-panel-container .panel-setting-switch:focus-visible { outline: 2px solid var(--panel-text-accent); outline-offset: 2px; }
    #control-panel-container .main-menu button, #control-panel-container .button-grid-2 button, #control-panel-container .preset-options button, #control-panel-container .help-content button, #control-panel-container #qr-go-to-settings, #control-panel-container .preset-list-item button {
        font-family: var(--font-main); background-color: var(--panel-button-bg); border: var(--panel-button-border);
        color: var(--panel-text-main); padding: 12px; border-radius: 8px; cursor: pointer;
        transition: all 0.2s; font-size: 1em; display: flex; align-items: center; justify-content: center;
    }
    #control-panel-container .dark-mode .main-menu button,
    #control-panel-container .dark-mode .button-grid-2 button,
    #control-panel-container .dark-mode .preset-options button,
    #control-panel-container .dark-mode .help-content button,
    #control-panel-container .dark-mode #qr-go-to-settings {
        color: var(--panel-text-main);
        border-color: rgba(188, 207, 235, 0.44);
    }
    #control-panel-container .dark-mode .main-menu button:hover,
    #control-panel-container .dark-mode .button-grid-2 button:hover,
    #control-panel-container .dark-mode .preset-options button:hover,
    #control-panel-container .dark-mode .help-content button:hover,
    #control-panel-container .dark-mode #qr-go-to-settings:hover {
        background: var(--panel-button-hover-bg);
        border-color: var(--panel-text-accent);
        color: var(--panel-text-highlight);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
    }

    .preset-list-item button {
        background: transparent;
        border: 1px solid transparent;
        padding: 0; width: 34px; height: 34px; border-radius: 8px;
        color: var(--panel-text-value); box-shadow: none; display: grid; place-items: center;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); font-size: 1.1em; opacity: 0.8;
        position: relative; overflow: hidden;
    }
    .dark-mode .preset-list-item button { background: transparent; border-color: transparent; }

    .preset-list-item button:hover {
        background: rgba(0,0,0,0.08);
        transform: translateY(-1px);
        opacity: 1;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }
    .dark-mode .preset-list-item button:hover {
        background: rgba(255,255,255,0.15);
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }

    .preset-list-item button:active { transform: translateY(0); box-shadow: none; }

    .preset-list-item button[data-action="unbind_preset"] { color: #e74c3c !important; }
    .preset-list-item button[data-action="unbind_preset"] i { color: #e74c3c !important; }
    .preset-list-item button[data-action="unbind_preset"]:hover { background: rgba(231, 76, 60, 0.15) !important; color: #c0392b !important; border: 1px solid rgba(231, 76, 60, 0.2) !important; }

    .preset-list-item button[data-action="delete_preset"] { color: #e53e3e !important; }
    .preset-list-item button[data-action="delete_preset"] i { color: #e53e3e !important; }
    .preset-list-item button[data-action="delete_preset"]:hover { background: rgba(229, 62, 62, 0.15) !important; color: #c53030 !important; border: 1px solid rgba(229, 62, 62, 0.2) !important; }

    .preset-list-item button[data-action="set_global"] { color: #6f8eb5 !important; }
    .preset-list-item button[data-action="set_global"] i { color: #6f8eb5 !important; }
    .preset-list-item button[data-action="set_global"]:hover { background: rgba(111, 142, 181, 0.16) !important; color: #5f7da3 !important; border: 1px solid rgba(111, 142, 181, 0.3) !important; }

    .preset-list-item button[data-action="bind_preset"] { color: #2ecc71 !important; }
    .preset-list-item button[data-action="bind_preset"] i { color: #2ecc71 !important; }
    .preset-list-item button[data-action="bind_preset"]:hover { background: rgba(46, 204, 113, 0.15) !important; color: #27ae60 !important; border: 1px solid rgba(46, 204, 113, 0.2) !important; }

    .preset-list-item button[data-action="export_preset"]:hover { background: rgba(92, 119, 152, 0.14) !important; color: var(--panel-text-accent) !important; border: 1px solid rgba(92, 119, 152, 0.25) !important; }
    .preset-list-item button[data-action="edit_preset"]:hover { background: rgba(92, 119, 152, 0.14) !important; color: var(--panel-text-accent) !important; border: 1px solid rgba(92, 119, 152, 0.25) !important; }

    button[data-action="create_preset"], button[data-action="import_preset"], button[data-action="create_quick_switch_profile"] {
        background: linear-gradient(135deg, var(--panel-text-accent), var(--panel-text-highlight));
        color: #ffffff !important;
        border: none; font-weight: 600;
        box-shadow: 0 4px 12px rgba(43, 58, 83, 0.24);
        border-radius: 10px;
        padding: 10px 18px;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    button[data-action="create_preset"]:hover, button[data-action="import_preset"]:hover, button[data-action="create_quick_switch_profile"]:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 12px rgba(0,0,0,0.2);
        filter: brightness(1.05);
    }
    .dark-mode button[data-action="create_preset"], .dark-mode button[data-action="import_preset"], .dark-mode button[data-action="create_quick_switch_profile"] {
        color: #091220 !important;
        border: 1px solid rgba(230, 240, 255, 0.42);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.32);
    }

    .quick-switch-intro {
        margin-bottom: 10px;
        opacity: 0.84;
        font-size: 0.9em;
        color: var(--panel-text-value);
    }
    .quick-switch-toolbar {
        margin-bottom: 14px;
    }
    .quick-switch-section-title {
        font-size: 0.84em;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--panel-text-accent);
        margin-bottom: 10px;
        opacity: 0.9;
    }
    .quick-switch-builtin-group + .quick-switch-builtin-group {
        margin-top: 14px;
    }
    .quick-switch-builtin-group-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 2px 8px;
        color: var(--panel-text-value);
        font-size: 0.8em;
        font-weight: 700;
    }
    .quick-switch-builtin-group-title::after {
        content: '';
        height: 1px;
        flex: 1 1 auto;
        background: var(--panel-border);
        opacity: 0.75;
    }
    .quick-switch-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        border: 1px solid var(--panel-border);
        border-radius: 12px;
        background: var(--panel-soft-module);
        padding: 10px 12px;
        margin-bottom: 10px;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }
    .quick-switch-row.is-on {
        border-color: var(--highlight-border);
        box-shadow: inset 0 0 0 1px var(--highlight-border);
        background: linear-gradient(120deg, var(--highlight-bg), transparent 80%);
    }
    .quick-switch-meta {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
    .quick-switch-name {
        font-size: 0.98em;
        font-weight: 600;
        color: var(--panel-text-main);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .quick-switch-desc {
        font-size: 0.76em;
        color: var(--panel-text-value);
        opacity: 0.86;
    }
    .quick-switch-toggle {
        border: 1px solid var(--panel-border);
        background: var(--panel-button-bg);
        color: var(--panel-text-value);
        width: 72px;
        height: 34px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        padding: 3px 8px 3px 5px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .quick-switch-toggle .quick-switch-dot {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--panel-text-value);
        box-shadow: 0 2px 6px rgba(0,0,0,0.16);
        transition: transform 0.2s ease, background 0.2s ease;
    }
    .quick-switch-toggle .quick-switch-text {
        font-size: 0.8em;
        font-weight: 600;
        letter-spacing: 0.04em;
    }
    .quick-switch-toggle.is-on {
        border-color: var(--panel-text-accent);
        color: var(--panel-text-accent);
        background: var(--highlight-bg);
        padding: 3px 5px 3px 8px;
        flex-direction: row-reverse;
    }
    .quick-switch-toggle.is-on .quick-switch-dot {
        transform: translateX(0);
        background: var(--panel-text-accent);
    }
    .quick-switch-actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
    }
    #control-panel-container .quick-request-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    #control-panel-container .quick-request-section {
        padding: 12px;
        border: 1px solid var(--panel-border);
        border-radius: 12px;
        background: var(--panel-soft-module);
    }
    #control-panel-container .quick-request-section.is-custom {
        border-style: dashed;
    }
    #control-panel-container .quick-request-section-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 10px;
        color: var(--panel-text-main);
        font-size: 0.86em;
        font-weight: 700;
    }
    #control-panel-container .quick-request-badge {
        padding: 2px 7px;
        border: 1px solid var(--panel-border);
        border-radius: 999px;
        color: var(--panel-text-value);
        font-size: 0.72em;
        font-weight: 500;
    }
    #control-panel-container .quick-request-badge.is-custom {
        color: var(--panel-text-accent);
        background: var(--highlight-bg);
    }
    #control-panel-container .custom-quick-requests-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 10px;
    }
    #control-panel-container .custom-quick-request-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 34px 34px;
        gap: 6px;
    }
    #control-panel-container .custom-quick-request-row button,
    #control-panel-container .custom-quick-request-add {
        min-height: 36px;
        border: var(--panel-button-border);
        border-radius: 9px;
        background: var(--panel-button-bg);
        color: var(--panel-text-main);
        cursor: pointer;
    }
    #control-panel-container .custom-quick-request-run {
        display: flex;
        align-items: center;
        min-width: 0;
        padding: 0 11px;
        text-align: left;
    }
    #control-panel-container .custom-quick-request-run span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    #control-panel-container .custom-quick-request-run i {
        margin-right: 8px;
        color: var(--panel-text-accent);
    }
    #control-panel-container .custom-quick-request-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    }
    #control-panel-container .custom-quick-request-icon.is-delete {
        color: #c95a5a;
    }
    #control-panel-container .custom-quick-request-add {
        width: 100%;
        border-style: dashed;
        color: var(--panel-text-accent);
    }
    #control-panel-container .custom-quick-request-empty {
        padding: 8px;
        color: var(--panel-text-value);
        font-size: 0.82em;
        text-align: center;
        opacity: 0.78;
    }
    #control-panel-container .custom-quick-request-row button:hover,
    #control-panel-container .custom-quick-request-add:hover {
        border-color: var(--panel-text-accent);
        background: var(--panel-button-hover-bg);
    }
    .custom-quick-request-overlay {
        position: fixed;
        inset: 0;
        z-index: 10050;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(4, 8, 14, 0.52);
    }
    .custom-quick-request-dialog {
        box-sizing: border-box;
        width: min(520px, 100%);
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        padding: 18px;
        border: 1px solid var(--panel-border, rgba(218, 165, 32, 0.34));
        border-radius: 14px;
        background: var(--panel-bg, #f6ece1);
        color: var(--panel-text-main, #4a3424);
        box-shadow: 0 18px 50px rgba(0,0,0,0.28);
        font-family: var(--font-main, sans-serif);
    }
    .custom-quick-request-dialog-title {
        margin-bottom: 14px;
        font-size: 1.05em;
        font-weight: 700;
        text-align: center;
    }
    .custom-quick-request-dialog label {
        display: block;
        margin: 10px 0 5px;
        font-size: 0.84em;
        font-weight: 600;
    }
    .custom-quick-request-dialog input,
    .custom-quick-request-dialog textarea {
        box-sizing: border-box;
        width: 100%;
        padding: 9px 10px;
        border: 1px solid var(--panel-border, rgba(218, 165, 32, 0.34));
        border-radius: 8px;
        outline: none;
        background: var(--panel-button-bg, #fff);
        color: var(--panel-text-main, #4a3424);
        font: inherit;
    }
    .custom-quick-request-dialog textarea {
        resize: vertical;
        line-height: 1.45;
    }
    .custom-quick-request-dialog input:focus,
    .custom-quick-request-dialog textarea:focus {
        border-color: var(--panel-text-accent, #d85c3b);
    }
    .custom-quick-request-dialog-hint {
        margin-top: 7px;
        color: var(--panel-text-value, #745845);
        font-size: 0.76em;
        line-height: 1.45;
    }
    .custom-quick-request-dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
    }
    .custom-quick-request-dialog-actions button {
        min-width: 86px;
        height: 36px;
        border: 1px solid var(--panel-border, rgba(218, 165, 32, 0.34));
        border-radius: 8px;
        background: var(--panel-button-bg, #fff);
        color: var(--panel-text-main, #4a3424);
        cursor: pointer;
    }
    .custom-quick-request-dialog-actions .custom-quick-request-save {
        border-color: var(--panel-text-accent, #d85c3b);
        background: var(--highlight-bg, rgba(216, 92, 59, 0.14));
        color: var(--panel-text-accent, #d85c3b);
        font-weight: 700;
    }

    .quick-switch-sub-btn {
        border: 1px solid var(--panel-border);
        background: var(--panel-button-bg);
        color: var(--panel-text-value);
        border-radius: 999px;
        min-width: 54px;
        height: 30px;
        padding: 0 10px;
        font-size: 0.74em;
        font-weight: 600;
        letter-spacing: 0.04em;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .quick-switch-sub-btn:hover {
        border-color: var(--panel-text-accent);
        color: var(--panel-text-accent);
        background: var(--highlight-bg);
    }
    .quick-switch-sub-btn.has-warning {
        border-color: #d59a45;
        color: #b87922;
        background: rgba(213, 154, 69, 0.12);
    }
    .quick-switch-edit-btn {
        width: 30px;
        min-width: 30px;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 0.78em;
    }
    .quick-switch-mode-btn {
        border: 1px solid var(--panel-border);
        border-radius: 999px;
        background: var(--panel-button-bg);
        color: var(--panel-text-main);
        min-width: 110px;
        height: 34px;
        padding: 0 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .quick-switch-mode-btn:hover {
        border-color: var(--panel-text-accent);
        color: var(--panel-text-accent);
        background: var(--highlight-bg);
    }
    .quick-switch-mode-label {
        font-size: 0.82em;
        font-weight: 600;
        letter-spacing: 0.02em;
        white-space: nowrap;
    }
    .quick-switch-divider {
        margin: 12px 0 10px;
        position: relative;
        text-align: center;
    }
    .quick-switch-divider::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        border-top: 1px dashed var(--panel-border);
    }
    .quick-switch-divider span {
        position: relative;
        z-index: 1;
        font-size: 0.74em;
        color: var(--panel-text-value);
        background: var(--panel-bg);
        padding: 0 8px;
        letter-spacing: 0.06em;
    }
    .quick-switch-scope-tabs {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        margin: 0 0 10px;
        padding: 3px;
        border: 1px solid var(--panel-border);
        border-radius: 10px;
        background: var(--panel-soft-module);
    }
    .quick-switch-scope-tabs button {
        min-width: 0;
        height: 30px;
        padding: 0 6px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: var(--panel-text-value);
        font-size: 0.75em;
        font-weight: 600;
        cursor: pointer;
    }
    .quick-switch-scope-tabs button.active {
        color: var(--panel-text-accent);
        border-color: var(--panel-border);
        background: var(--panel-button-bg);
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }
    .quick-switch-scope-empty {
        padding: 10px;
        text-align: center;
        color: var(--panel-text-value);
        font-size: 0.82em;
        opacity: 0.75;
    }
    .quick-switch-custom-row.is-unavailable {
        opacity: 0.68;
    }
    .quick-switch-toggle:disabled {
        cursor: not-allowed;
        filter: grayscale(0.55);
    }
    .quick-switch-delete-btn {
        width: 30px;
        height: 30px;
        border: 1px solid rgba(201, 90, 90, 0.35);
        border-radius: 50%;
        background: rgba(201, 90, 90, 0.08);
        color: #c96f6f;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .quick-switch-delete-btn:hover {
        border-color: #c95a5a;
        background: rgba(201, 90, 90, 0.16);
        color: #b54343;
        transform: translateY(-1px);
    }
    .quick-switch-empty {
        padding: 10px 4px;
        opacity: 0.72;
        font-size: 0.9em;
        color: var(--panel-text-value);
    }

    .qs-builder-overlay {
        position: fixed;
        inset: 0;
        z-index: 10030;
        background: rgba(4, 8, 14, 0.46);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
    }
    .qs-character-bind-field {
        margin: 4px 0 10px;
    }
    .qs-character-bind-launch {
        width: 100%;
        min-height: 42px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 0 12px;
        border: 1px solid var(--panel-border);
        border-radius: 10px;
        background: var(--panel-button-bg);
        color: var(--panel-text-main);
        font-size: 0.84em;
        font-weight: 650;
        text-align: left;
    }
    .qs-character-bind-launch:hover {
        border-color: var(--panel-text-accent);
        background: var(--highlight-bg);
    }
    .qs-character-bind-launch-meta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--panel-text-accent);
        font-size: 0.88em;
        white-space: nowrap;
    }
    .qs-character-bind-page {
        position: absolute;
        inset: 0;
        z-index: 40;
        display: none;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        border-radius: inherit;
        background: var(--panel-bg);
        color: var(--panel-text-main);
    }
    .qs-character-bind-page.is-open {
        display: flex;
    }
    .qs-character-bind-page-header {
        flex: 0 0 auto;
        min-height: calc(54px + var(--th-panel-safe-top));
        display: grid;
        grid-template-columns: 72px minmax(0, 1fr) 72px;
        align-items: center;
        padding: var(--th-panel-safe-top) calc(12px + var(--th-panel-safe-right)) 0 calc(12px + var(--th-panel-safe-left));
        border-bottom: 1px solid var(--panel-border);
        background: var(--panel-header-bg);
    }
    .qs-character-bind-page-title {
        min-width: 0;
        color: var(--panel-text-main);
        font-weight: 700;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .qs-character-bind-page-back,
    .qs-character-bind-page-done {
        height: 34px;
        padding: 0 8px;
        border: 0;
        background: transparent;
        color: var(--panel-text-value);
        font-weight: 650;
    }
    .qs-character-bind-page-back {
        justify-self: start;
        width: 34px;
        padding: 0;
        border-radius: 50%;
    }
    .qs-character-bind-page-done {
        justify-self: end;
        color: var(--panel-text-accent);
    }
    .qs-character-bind-panel {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 10px calc(10px + var(--th-panel-safe-right)) calc(10px + var(--th-panel-safe-bottom)) calc(10px + var(--th-panel-safe-left));
        border: 0;
        border-radius: 0;
        background: transparent;
    }
    .qs-character-bind-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
        color: var(--panel-text-main);
        font-size: 0.82em;
        font-weight: 700;
    }
    .qs-character-bind-summary {
        flex: 0 0 auto;
        color: var(--panel-text-accent);
        font-size: 0.88em;
        font-weight: 600;
    }
    .qs-character-bind-search-wrap {
        position: relative;
        margin-bottom: 8px;
    }
    .qs-character-bind-search-wrap > i {
        position: absolute;
        left: 11px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--panel-text-value);
        opacity: 0.7;
        pointer-events: none;
    }
    .qs-character-bind-search {
        width: 100%;
        height: 34px;
        margin: 0 !important;
        padding: 0 34px !important;
        border: 1px solid var(--panel-border) !important;
        border-radius: 9px !important;
        background: var(--panel-button-bg) !important;
        color: var(--panel-text-main) !important;
        font-size: 0.8em !important;
        box-sizing: border-box;
        outline: none;
    }
    .qs-character-bind-search:focus {
        border-color: var(--panel-text-accent) !important;
        box-shadow: 0 0 0 2px var(--highlight-bg);
    }
    .qs-character-bind-search::-webkit-search-cancel-button {
        display: none;
    }
    .qs-character-bind-search-clear {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 22px;
        height: 22px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: var(--panel-text-value);
        opacity: 0;
        pointer-events: none;
    }
    .qs-character-bind-search-wrap.has-value .qs-character-bind-search-clear {
        opacity: 0.8;
        pointer-events: auto;
    }
    .qs-character-bind-filters {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 5px;
        margin-bottom: 8px;
        padding: 3px;
        border: 1px solid var(--panel-border);
        border-radius: 9px;
        background: color-mix(in srgb, var(--panel-button-bg) 65%, transparent);
    }
    .qs-character-bind-filters button {
        min-width: 0;
        height: 28px;
        padding: 0 6px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--panel-text-value);
        font-size: 0.72em;
        font-weight: 600;
        white-space: nowrap;
    }
    .qs-character-bind-filters button.active {
        background: var(--panel-button-bg);
        color: var(--panel-text-accent);
        box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    }
    .qs-character-bind-list {
        display: grid;
        align-content: start;
        gap: 5px;
        flex: 1 1 auto;
        min-height: 0;
        max-height: none;
        overflow: auto;
        padding: 2px;
    }
    .qs-character-bind-row {
        display: grid !important;
        grid-template-columns: 24px minmax(0, 1fr) auto !important;
        align-items: center;
        gap: 8px;
        margin: 0 !important;
        padding: 8px !important;
        border: 1px solid transparent;
        border-radius: 9px;
        background: color-mix(in srgb, var(--panel-button-bg) 52%, transparent);
        cursor: pointer;
        transition: border-color 0.16s ease, background-color 0.16s ease, transform 0.16s ease;
    }
    .qs-character-bind-row.is-filter-hidden {
        display: none !important;
    }
    .qs-character-bind-row:hover {
        background: var(--highlight-bg);
        border-color: var(--highlight-border);
    }
    .qs-character-bind-row.is-bound {
        border-color: var(--panel-text-accent);
        background: var(--highlight-bg);
    }
    .qs-character-bind-check {
        position: absolute;
        width: 1px !important;
        height: 1px !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        opacity: 0;
        pointer-events: none;
        clip: rect(0 0 0 0);
    }
    .qs-character-bind-check-wrap {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        min-width: 24px;
        min-height: 24px;
        max-width: 24px;
        max-height: 24px;
        margin: 0 !important;
        padding: 0 !important;
        cursor: pointer;
    }
    .qs-character-bind-checkmark {
        width: 20px !important;
        height: 20px !important;
        min-width: 20px !important;
        min-height: 20px !important;
        max-width: 20px !important;
        max-height: 20px !important;
        aspect-ratio: 1 / 1;
        display: inline-flex !important;
        flex: 0 0 20px;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--panel-border);
        border-radius: 6px;
        background: var(--panel-button-bg);
        color: transparent;
        font-size: 0.65em;
        box-sizing: border-box;
        transition: all 0.16s ease;
    }
    .qs-character-bind-check:checked + .qs-character-bind-checkmark {
        border-color: var(--panel-text-accent);
        background: var(--panel-text-accent);
        color: #fff;
    }
    .qs-character-bind-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--panel-text-main);
        font-size: 0.8em;
        font-weight: 600;
    }
    .qs-character-bind-status {
        color: var(--panel-text-value);
        font-size: 0.7em;
        white-space: nowrap;
    }
    .qs-character-bind-status.is-bound {
        color: var(--panel-text-accent);
        font-weight: 600;
    }
    .qs-character-bind-filter-empty,
    .qs-character-bind-empty {
        padding: 8px;
        text-align: center;
        color: var(--panel-text-value);
        font-size: 0.78em;
    }
    .qs-builder-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(520px, 92vw);
        height: min(86vh, 860px);
        max-width: 92vw;
        max-height: min(86vh, 860px);
        overflow: hidden;
    }
    .qs-builder-panel .panel-content,
    .qs-sub-panel .panel-content {
        height: calc(100% - 56px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
    }
    .qs-builder-panel,
    .qs-sub-panel {
        display: flex;
        flex-direction: column;
        transition: none !important;
        animation: none !important;
    }
    .qs-builder-name-input,
    .qs-builder-search-input {
        width: 100%;
        min-height: 38px;
        border-radius: 10px;
        border: var(--panel-button-border);
        background: var(--panel-button-bg);
        color: var(--panel-text-main);
        padding: 9px 12px;
        font-size: 0.92em;
        margin-bottom: 10px;
    }
    .qs-builder-overlay select.qs-builder-name-input {
        appearance: none !important;
        -webkit-appearance: none !important;
        width: 100% !important;
        min-height: 38px !important;
        margin: 0 0 10px !important;
        padding: 9px 12px !important;
        border: var(--panel-button-border) !important;
        border-radius: 10px !important;
        background: var(--panel-button-bg) !important;
        background-image: none !important;
        box-shadow: none !important;
        color: var(--panel-text-main) !important;
        font: inherit !important;
        line-height: normal !important;
        text-indent: 0 !important;
        filter: none !important;
    }
    .qs-builder-overlay select.qs-builder-name-input option {
        background: var(--panel-bg) !important;
        color: var(--panel-text-main) !important;
    }
    .qs-builder-name-input:focus,
    .qs-builder-search-input:focus {
        border-color: var(--panel-text-accent);
        box-shadow: 0 0 0 2px var(--highlight-bg);
        outline: none;
    }
    .qs-builder-search-wrap {
        position: relative;
        margin-bottom: 8px;
    }
    .qs-builder-search-wrap > i {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--panel-text-value);
        opacity: 0.75;
        pointer-events: none;
    }
    .qs-builder-search-wrap .qs-builder-search-input {
        padding-left: 34px;
        padding-right: 34px;
        margin-bottom: 0;
    }
    .qs-builder-search-clear {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 1px solid var(--panel-border);
        background: var(--panel-button-bg);
        color: var(--panel-text-value);
        opacity: 0;
        pointer-events: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        transition: opacity 0.16s ease, background-color 0.16s ease, color 0.16s ease, border-color 0.16s ease;
    }
    .qs-builder-search-clear i {
        font-size: 11px;
        line-height: 1;
        transform: none;
    }
    .qs-builder-search-wrap.has-value .qs-builder-search-clear {
        opacity: 0.75;
        pointer-events: auto;
    }
    .qs-builder-search-clear:hover {
        opacity: 1;
        background: var(--highlight-bg);
        border-color: var(--panel-text-accent);
        color: var(--panel-text-main);
    }
    .qs-builder-top label {
        font-size: 0.85em;
        color: var(--panel-text-accent);
        font-weight: 700;
        display: block;
        margin-bottom: 6px;
    }
    .qs-builder-hint {
        font-size: 0.8em;
        color: var(--panel-text-value);
        opacity: 0.86;
        margin-top: 6px;
        margin-bottom: 10px;
    }
    .qs-builder-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
        flex-wrap: wrap;
    }
    .qs-mini-btn {
        min-height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 0.78em;
        border: var(--panel-button-border);
        background: var(--panel-button-bg);
        color: var(--panel-text-value);
        cursor: pointer;
        transition: transform 0.14s ease, border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
    }
    .qs-mini-btn:hover {
        border-color: var(--panel-text-accent);
        background: var(--highlight-bg);
        color: var(--panel-text-accent);
        box-shadow: 0 4px 10px rgba(20, 28, 40, 0.08);
    }
    .qs-mini-btn:active {
        transform: translateY(1px) scale(0.985);
    }
    .qs-mini-btn:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px var(--highlight-border);
    }
    .qs-mini-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
    }
    .qs-mini-btn:disabled:hover {
        border-color: var(--panel-border);
        background: var(--panel-button-bg);
        color: var(--panel-text-value);
    }
    .qs-builder-list {
        border: 1px solid var(--panel-border);
        border-radius: 12px;
        background: var(--panel-soft-module);
        flex: 1 1 auto;
        min-height: 180px;
        max-height: none;
        overflow: auto;
        padding: 6px;
    }
    .qs-builder-group {
        border-radius: 10px;
        border: 1px solid transparent;
        margin-bottom: 6px;
        background: color-mix(in srgb, var(--panel-soft-module) 85%, transparent);
    }
    .qs-builder-group.is-ungrouped {
        border: none;
        margin-bottom: 0;
        background: transparent;
    }
    .qs-builder-group-toggle {
        width: 100%;
        min-height: 32px;
        border-radius: 9px;
        border: 1px solid var(--panel-border);
        background: var(--panel-button-bg);
        color: var(--panel-text-main);
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        font-size: 0.82em;
        font-weight: 700;
        letter-spacing: 0.02em;
    }
    .qs-builder-group-caret {
        width: 14px;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        transition: transform 0.18s ease;
    }
    .qs-builder-group-title {
        flex: 1 1 auto;
        text-align: left;
    }
    .qs-builder-group-count {
        font-size: 0.75em;
        color: var(--panel-text-value);
        opacity: 0.9;
    }
    .qs-builder-group:not(.is-collapsed) .qs-builder-group-caret {
        transform: rotate(90deg);
    }
    .qs-builder-group-body {
        margin-top: 4px;
        display: grid;
        gap: 4px;
    }
    .qs-builder-group.is-collapsed .qs-builder-group-body {
        display: none;
    }
    .qs-builder-group.is-collapsed.is-filter-expanded .qs-builder-group-body {
        display: grid;
    }
    .qs-builder-row {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        border-radius: 10px;
        padding: 8px 10px 8px 8px;
        border: 1px solid transparent;
    }
    .qs-builder-row.is-filter-hidden {
        display: none !important;
    }
    .qs-builder-row:hover {
        background: var(--highlight-bg);
        border-color: var(--highlight-border);
    }
    .qs-builder-check-wrap {
        display: grid;
        justify-content: center;
        align-content: center;
        width: 100%;
        height: 100%;
        margin: 0;
        cursor: pointer;
    }
    .qs-builder-check {
        position: absolute;
        opacity: 0;
        pointer-events: none;
    }
    .qs-builder-check-dot {
        width: 16px;
        height: 16px;
        min-width: 16px;
        min-height: 16px;
        flex: 0 0 16px;
        box-sizing: border-box;
        border-radius: 50%;
        border: 1px solid var(--panel-border);
        background: transparent;
        display: inline-block;
        transition: all 0.2s ease;
    }
    .qs-builder-check:checked + .qs-builder-check-dot {
        background: var(--panel-text-accent);
        border-color: var(--panel-text-accent);
        box-shadow: inset 0 0 0 3px rgba(255,255,255,0.75);
    }
    .qs-builder-labels {
        min-width: 0;
    }
    .qs-builder-name {
        color: var(--panel-text-main);
        font-size: 0.92em;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .qs-builder-id {
        color: var(--panel-text-value);
        font-size: 0.72em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        opacity: 0.75;
        margin-top: 2px;
    }
    .qs-builder-state {
        border-radius: 999px;
        min-width: 58px;
        height: 30px;
        border: 1px solid var(--panel-border);
        background: var(--panel-button-bg);
        color: var(--panel-text-value);
        font-size: 0.8em;
        font-weight: 700;
        padding: 0 11px;
    }
    .qs-builder-state.is-on {
        background: var(--highlight-bg);
        border-color: var(--panel-text-accent);
        color: var(--panel-text-accent);
    }
    .qs-customize-section-list {
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        padding: 4px 6px 10px;
    }
    .qs-customize-major {
        margin-bottom: 18px;
        padding: 12px;
        border: 1px solid var(--panel-border);
        border-radius: 14px;
        background: color-mix(in srgb, var(--panel-soft-module) 88%, transparent);
    }
    .qs-customize-major.is-ungrouped {
        padding: 0;
        border: 0;
        background: transparent;
    }
    .qs-customize-major-title {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 14px;
        color: var(--panel-text-accent);
        font-size: 1.08em;
        font-weight: 800;
        text-align: center;
    }
    .qs-customize-major-title::before,
    .qs-customize-major-title::after {
        content: '';
        height: 1px;
        flex: 1 1 auto;
        background: var(--panel-border);
    }
    .qs-customize-section {
        margin-bottom: 18px;
    }
    .qs-customize-section:last-child {
        margin-bottom: 0;
    }
    .qs-customize-section-title {
        margin-bottom: 10px;
        color: var(--panel-text-value);
        font-size: 0.92em;
        font-weight: 700;
        text-align: center;
    }
    .qs-customize-major-description,
    .qs-customize-section-description {
        margin: -4px 0 10px;
        color: var(--panel-text-value);
        font-size: 0.78em;
        font-weight: 400;
        line-height: 1.5;
        text-align: center;
        white-space: pre-line;
        overflow-wrap: anywhere;
    }
    .qs-customize-major-description {
        margin: -8px 0 14px;
    }
    .qs-customize-choice-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
        gap: 10px;
    }
    .qs-customize-choice {
        min-width: 0;
        min-height: 46px;
        padding: 8px 12px;
        border: 1px solid var(--panel-border);
        border-radius: 10px;
        background: var(--panel-button-bg);
        color: var(--panel-text-main);
        font-size: 0.9em;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: pointer;
        transition: transform 0.16s ease, border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
    }
    .qs-customize-choice:hover {
        transform: translateY(-1px);
        border-color: var(--panel-text-accent);
    }
    .qs-customize-choice.is-on {
        border-color: transparent;
        background: linear-gradient(135deg, var(--panel-text-accent), var(--panel-text-highlight));
        color: #fff;
        box-shadow: 0 5px 12px rgba(43, 58, 83, 0.18);
    }
    .dark-mode .qs-customize-choice.is-on,
    .dark-mode .qs-customize-choice.is-on:hover {
        color: #162033 !important;
    }

    #control-panel-container .pt-entry-grouping-root .pt-entry-group-header,
    #control-panel-container .pt-entry-grouping-root .th-qs-group-header {
        list-style: none;
        margin: 6px 0;
        padding: 7px 12px;
        border-radius: 10px;
        border: 1px solid color-mix(in srgb, var(--pt-border, rgba(0, 0, 0, .26)) 86%, transparent);
        background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--pt-section-bg, rgba(0, 0, 0, .2)) 92%, rgba(255,255,255,0.06)) 0%,
            color-mix(in srgb, var(--pt-section-bg, rgba(0, 0, 0, .2)) 82%, rgba(255,255,255,0.02)) 100%
        );
        color: var(--pt-text, inherit);
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.86em;
        font-weight: 600;
        box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 2px 6px rgba(0,0,0,0.16);
        -webkit-user-select: none;
        user-select: none;
        pointer-events: auto;
        cursor: pointer;
        transition: background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
    }
    #control-panel-container .pt-entry-grouping-root .pt-entry-group-header:hover,
    #control-panel-container .pt-entry-grouping-root .th-qs-group-header:hover {
        border-color: color-mix(in srgb, var(--pt-border, rgba(0, 0, 0, .26)) 62%, var(--pt-text, #fff) 12%);
        background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--pt-section-bg, rgba(0, 0, 0, .24)) 90%, rgba(255,255,255,0.12)) 0%,
            color-mix(in srgb, var(--pt-section-bg, rgba(0, 0, 0, .24)) 84%, rgba(255,255,255,0.03)) 100%
        );
    }
    #control-panel-container .pt-entry-grouping-root .pt-entry-group-header:focus-visible,
    #control-panel-container .pt-entry-grouping-root .th-qs-group-header:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--pt-text, #fff) 22%, transparent), 0 2px 8px rgba(0,0,0,0.2);
    }
    #control-panel-container .pt-entry-grouping-root .pt-entry-group-header .pt-entry-group-toggle,
    #control-panel-container .pt-entry-grouping-root .th-qs-group-header .th-qs-group-caret {
        width: 12px;
        display: inline-flex;
        justify-content: center;
        opacity: 0.85;
        transition: transform 0.18s ease;
    }
    #control-panel-container .pt-entry-grouping-root .pt-entry-group-header:not(.is-collapsed) .pt-entry-group-toggle,
    #control-panel-container .pt-entry-grouping-root .th-qs-group-header:not(.is-collapsed) .th-qs-group-caret {
        transform: rotate(90deg);
    }
    #control-panel-container .pt-entry-grouping-root .pt-entry-group-header .pt-entry-group-name,
    #control-panel-container .pt-entry-grouping-root .th-qs-group-header .th-qs-group-title {
        flex: 1 1 auto;
        text-align: left;
    }
    #control-panel-container .pt-entry-grouping-root .pt-entry-group-header .pt-entry-group-count,
    #control-panel-container .pt-entry-grouping-root .th-qs-group-header .th-qs-group-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 26px;
        height: 20px;
        padding: 0 7px;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--pt-border, rgba(0,0,0,.25)) 58%, transparent);
        background: color-mix(in srgb, var(--pt-section-bg, rgba(0,0,0,.24)) 70%, rgba(255,255,255,0.18));
        font-size: 0.74em;
        font-weight: 700;
        line-height: 1;
        letter-spacing: 0.01em;
        opacity: 0.96;
    }
    #control-panel-container .pt-entry-grouping-root .th-qs-group-item-collapsed {
        display: none !important;
    }

    .qs-builder-footer {
        flex: 0 0 auto;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: auto;
        padding-top: 10px;
        border-top: 1px solid var(--panel-border);
        background: color-mix(in srgb, var(--panel-bg) 90%, transparent);
    }
    .qs-cancel-btn,
    .qs-save-btn {
        min-width: 92px;
        min-height: 36px;
        border-radius: 10px;
        font-weight: 600;
        position: relative;
        overflow: hidden;
        transition: transform 0.16s ease, box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        will-change: transform;
    }
    .qs-cancel-btn::after,
    .qs-save-btn::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.22) 40%, transparent 80%);
        transform: translateX(-120%);
        transition: transform 0.42s ease;
        pointer-events: none;
    }
    .qs-cancel-btn {
        background: transparent;
        border: var(--panel-button-border);
        color: var(--panel-text-value);
    }
    .qs-save-btn {
        border: none;
        color: #fff;
        text-shadow: 0 1px 2px rgba(0,0,0,0.22);
        background: linear-gradient(135deg, var(--panel-text-accent), var(--panel-text-highlight));
    }
    .dark-mode .qs-save-btn {
        color: #ffffff;
        background: linear-gradient(135deg, #7d9fcd, #9fb7dc);
        border: 1px solid rgba(220, 234, 255, 0.34);
        text-shadow: 0 1px 2px rgba(0,0,0,0.4);
    }
    .qs-cancel-btn:hover,
    .qs-save-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.18);
    }
    .qs-cancel-btn:hover::after,
    .qs-save-btn:hover::after {
        transform: translateX(120%);
    }
    .qs-cancel-btn:active,
    .qs-save-btn:active {
        transform: translateY(0) scale(0.98);
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    }
    .qs-cancel-btn:focus-visible,
    .qs-save-btn:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px var(--highlight-bg), 0 0 0 4px var(--panel-text-accent);
    }
    .qs-cancel-btn:hover {
        color: var(--panel-text-main);
        border-color: var(--panel-text-accent);
        background: var(--highlight-bg);
    }
    .qs-save-btn:hover {
        filter: brightness(1.05);
    }
    @media (max-width: 680px) {
        .qs-builder-panel {
            width: 100%;
            height: 100dvh;
            max-height: 92vh;
        }
        .qs-builder-list {
            min-height: 0;
        }
        .qs-builder-row {
            grid-template-columns: 30px minmax(0, 1fr);
            grid-template-areas:
                'check name'
                '. state';
            row-gap: 6px;
            padding-right: 8px;
        }
        .qs-builder-check-wrap { grid-area: check; }
        .qs-builder-labels { grid-area: name; }
        .qs-builder-state { grid-area: state; justify-self: start; }
    }

    .qs-sub-list {
        border: 1px solid var(--panel-border);
        border-radius: 12px;
        background: var(--panel-soft-module);
        max-height: 50vh;
        overflow: auto;
        padding: 4px;
    }
    .qs-sub-row {
        display: grid !important;
        grid-template-columns: 30px minmax(0, 1fr) auto !important;
        align-items: center;
        column-gap: 10px;
        margin: 0 !important;
        padding: 9px 8px !important;
        box-sizing: border-box;
        border-radius: 10px;
        border: 1px solid transparent;
        width: 100%;
        min-width: 0;
    }
    .qs-sub-row:hover {
        background: var(--highlight-bg);
        border-color: var(--highlight-border);
    }
    .qs-sub-check {
        position: absolute;
        opacity: 0;
        pointer-events: none;
    }
    .qs-sub-check-wrap {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        margin: 0 !important;
        padding: 0 !important;
        cursor: pointer;
    }
    .qs-sub-dot {
        width: 14px;
        height: 14px;
        min-width: 14px;
        min-height: 14px;
        flex: 0 0 14px;
        box-sizing: border-box;
        border-radius: 50%;
        border: 1px solid var(--panel-border);
        background: transparent;
        display: inline-block;
        transition: all 0.2s ease;
    }
    .qs-sub-check:checked + .qs-sub-dot {
        background: var(--panel-text-accent);
        border-color: var(--panel-text-accent);
        box-shadow: inset 0 0 0 2px rgba(255,255,255,0.8);
    }
    .qs-sub-name {
        min-width: 0;
        color: var(--panel-text-main);
        font-size: 0.9em;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .qs-sub-labels {
        min-width: 0;
        overflow: hidden;
    }
    .qs-sub-id {
        margin-top: 2px;
        color: var(--panel-text-value);
        font-size: 0.72em;
        opacity: 0.75;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .qs-sub-target {
        justify-self: end;
        margin: 0 !important;
        color: var(--panel-text-value);
        font-size: 0.76em;
        background: var(--panel-button-bg);
        border: 1px solid var(--panel-border);
        border-radius: 999px;
        padding: 5px 10px;
        white-space: nowrap;
        cursor: pointer;
    }
    .qs-sub-target.is-on {
        color: var(--panel-text-accent);
        border-color: var(--panel-text-accent);
        background: var(--highlight-bg);
    }

    #control-panel-container .main-menu button { justify-content: center; align-content: center; flex-wrap: wrap; }
    #control-panel-container .button-grid-2 button { justify-content: center; }
    #control-panel-container .main-menu button:hover, #control-panel-container .button-grid-2 button:hover, #control-panel-container .preset-options button:hover, #control-panel-container #qr-go-to-settings:hover, #control-panel-container .preset-list-item button:hover {
        background-color: var(--panel-button-hover-bg); transform: translateY(-2px);
    }
    #control-panel-container .main-menu i, #control-panel-container .button-grid-2 i { margin-right: 12px; line-height: 1; vertical-align: middle; }
    #control-panel-container .button-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (min-width: 600px) {
       #control-panel-container .button-grid-2 button {
           justify-content: center;
       }
    }
    .preset-options .setting-group { margin-bottom: 20px; }
    .preset-options .setting-group-title { margin: 0 0 10px; font-size: 1em; font-weight: 600; color: var(--panel-text-accent); text-align: center; }
    .preset-options .button-group { display: flex; flex-wrap: wrap; gap: 8px; }
    .quick-settings-group .button-group { flex-grow: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); }
    .preset-options button.active {
        background: linear-gradient(135deg, var(--panel-text-accent), var(--panel-text-highlight));
        color: #ffffff !important;
        border-color: transparent;
        box-shadow: 0 4px 12px rgba(43, 58, 83, 0.22);
    }
    .preset-options button.active:hover {
        color: #ffffff !important;
    }
    .dark-mode .preset-options button.active {
        background: linear-gradient(135deg, var(--panel-text-accent), var(--panel-text-highlight));
        color: #091220 !important;
        border-color: rgba(230, 240, 255, 0.42);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }
    .dark-mode .preset-options button.active:hover {
        background: linear-gradient(135deg, var(--panel-text-accent), var(--panel-text-highlight));
        color: #091220 !important;
        border-color: rgba(230, 240, 255, 0.42);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }
    .preset-options .custom-input-container { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .preset-options .custom-input-group { display: grid; grid-template-columns: 1fr auto 1fr 1fr; gap: 5px 10px; align-items: center; }
    .preset-options .quick-settings-group { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
    .preset-options .quick-settings-group span { font-weight: 600; color: var(--panel-text-accent); }
    .preset-options .quick-settings-group .button-group { flex-grow: 1; }
    .preset-options .custom-input-group span { text-align: center; color: var(--panel-text-value); }
    .preset-options input { background: var(--panel-button-bg); border: var(--panel-button-border); color: var(--panel-text-main); border-radius: 6px; padding: 8px; width: 100%; box-sizing: border-box; min-width: 100px; }
    .help-content { display: flex; flex-direction: column; gap: 14px; }
    .help-hero { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid var(--highlight-border); border-radius: 14px; background: linear-gradient(135deg, var(--highlight-bg), var(--panel-soft-module)); }
    .help-hero-icon { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; border-radius: 12px; background: var(--panel-button-bg); color: var(--panel-text-accent); font-size: 1.15em; border: 1px solid var(--panel-border); }
    .help-hero-title { color: var(--panel-text-main); font-size: 1.08em; font-weight: 700; }
    .help-hero p { margin: 3px 0 0 !important; color: var(--panel-text-value) !important; font-size: 0.86em; }
    .help-section { display: flex; flex-direction: column; gap: 8px; }
    .help-title { display: flex; align-items: center; gap: 8px; margin: 4px 0 2px; padding: 0 2px 7px; font-size: 1em; color: var(--panel-text-accent); border-bottom: 1px solid var(--panel-border); font-weight: 700; }
    .help-title i { width: 18px; text-align: center; opacity: 0.9; }
    .help-faq { overflow: hidden; border: 1px solid var(--panel-border); border-radius: 11px; background: var(--panel-soft-module); transition: border-color 0.2s ease, background-color 0.2s ease; }
    .help-faq[open] { border-color: var(--highlight-border); background: var(--highlight-bg); }
    .help-faq.is-critical { border-left: 3px solid var(--panel-text-accent); }
    .help-faq summary { display: grid; grid-template-columns: minmax(0, 1fr) auto 14px; align-items: center; gap: 10px; padding: 11px 13px; color: var(--panel-text-main); font-weight: 600; line-height: 1.4; cursor: pointer; list-style: none; user-select: none; }
    .help-faq summary::-webkit-details-marker { display: none; }
    .help-faq summary > span:first-child { grid-column: 1; min-width: 0; }
    .help-faq summary::after { content: ''; grid-column: 3; width: 8px; height: 8px; justify-self: center; border-right: 2px solid var(--panel-text-value); border-bottom: 2px solid var(--panel-text-value); transform: rotate(45deg) translate(-1px, -1px); transition: transform 0.2s ease; }
    .help-faq[open] summary::after { transform: rotate(225deg) translate(-1px, -1px); }
    .help-faq summary:hover { color: var(--panel-text-accent); }
    .help-answer { padding: 0 13px 12px; border-top: 1px dashed var(--panel-border); }
    .help-content p, .help-content li { color: var(--panel-text-main); margin: 8px 0 0; line-height: 1.65; }
    .help-answer ol, .help-answer ul { margin: 8px 0 0 !important; padding-left: 1.35em !important; }
    .help-answer code { padding: 1px 5px; border: 1px solid var(--panel-border); border-radius: 5px; background: var(--panel-button-bg); color: var(--panel-text-accent); font-family: Consolas, monospace; }
    .help-tag { grid-column: 2; display: inline-flex; align-items: center; justify-content: center; justify-self: end; min-width: 38px; padding: 2px 7px; border-radius: 999px; font-size: 0.7em; font-weight: 700; line-height: 1.4; white-space: nowrap; }
    .help-tag.tag-must { color: #fff; background: #d5533f; box-shadow: 0 2px 8px rgba(213,83,63,0.25); }
    .help-tag.tag-important { color: #7a4c00; background: #ffd67a; }
    .help-tag.tag-tip { color: var(--panel-text-accent); background: var(--panel-button-bg); border: 1px solid var(--highlight-border); }
    .help-support-links { display: grid; gap: 10px; margin-top: 10px; padding-top: 16px; border-top: 1px dashed var(--panel-border); }
    .help-resource-card, .help-tutorial-card, .help-changelog-card { display: grid; grid-template-columns: 28px minmax(0, 1fr) 136px; align-items: center; gap: 10px; padding: 12px; border: 1px solid var(--panel-border); border-radius: 11px; background: var(--panel-soft-module); }
    .help-resource-card > i, .help-tutorial-card > i, .help-changelog-card > i { width: 28px; color: var(--panel-text-accent); font-size: 1.1em; text-align: center; }
    .help-resource-card > div, .help-tutorial-card > div, .help-changelog-card > div { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 2px; }
    .help-resource-card span, .help-tutorial-card span, .help-changelog-card > div > span { color: var(--panel-text-value); font-size: 0.78em; line-height: 1.4; }
    .help-resource-card a { display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%; min-height: 38px; padding: 7px 10px; border: 1px solid var(--highlight-border); border-radius: 8px; background: var(--highlight-bg); color: var(--panel-text-accent); font-size: 0.82em; font-weight: 600; text-decoration: none; white-space: nowrap; }
    .help-resource-card a:hover { background: var(--panel-button-hover-bg); }
    .help-tutorial-card button { display: inline-flex !important; align-items: center; justify-content: center; gap: 7px; width: 100%; min-height: 38px !important; padding: 7px 13px !important; white-space: nowrap; }
    .help-tutorial-card button i { flex: 0 0 auto; margin: 0 !important; line-height: 1; }
    .help-changelog-card button { display: inline-flex !important; align-items: center; justify-content: center; gap: 7px; width: 100%; min-height: 38px !important; padding: 7px 13px !important; white-space: nowrap; }
    .help-changelog-card button i { margin: 0 !important; }
    .help-version-tag { position: relative; top: -2px; display: inline-flex; margin-left: 5px; padding: 1px 6px; border-radius: 999px; color: #fff !important; background: #d5533f; font-size: 0.66em !important; vertical-align: middle; }
    .help-primary-guide { padding: 12px; border: 1px solid color-mix(in srgb, var(--panel-text-accent) 55%, var(--panel-border)); border-radius: 14px; background: color-mix(in srgb, var(--highlight-bg) 72%, var(--panel-soft-module)); }
    .help-primary-guide .help-title { margin-top: 0; }
    .help-alert { display: flex; align-items: flex-start; gap: 8px; padding: 10px 11px; border-radius: 9px; background: rgba(213, 83, 63, 0.13); border: 1px solid rgba(213, 83, 63, 0.35); color: var(--panel-text-main); line-height: 1.55; }
    .help-alert i { flex: 0 0 auto; margin-top: 3px; color: #d5533f; }
    .help-code-block { margin-top: 10px; padding: 10px 12px; overflow-wrap: anywhere; border: 1px solid var(--panel-border); border-radius: 8px; background: rgba(0, 0, 0, 0.08); color: var(--panel-text-main); font-family: Consolas, monospace; font-size: 0.85em; line-height: 1.5; }
    .help-note { padding: 7px 9px; border-left: 3px solid var(--panel-text-accent); background: var(--panel-button-bg); border-radius: 0 7px 7px 0; }
    @media (max-width: 480px) {
        .help-faq summary { grid-template-columns: minmax(0, 1fr) auto 12px; align-items: start; gap: 7px; padding: 10px; }
        .help-tag { margin-top: 1px; }
        .help-support-links { margin-top: 12px; padding-top: 14px; }
        .help-resource-card, .help-tutorial-card, .help-changelog-card { grid-template-columns: 26px minmax(0, 1fr); grid-template-areas: 'icon content' 'action action'; align-items: center; }
        .help-resource-card > i, .help-tutorial-card > i, .help-changelog-card > i { grid-area: icon; width: 26px; }
        .help-resource-card > div, .help-tutorial-card > div, .help-changelog-card > div { grid-area: content; }
        .help-resource-card a, .help-tutorial-card button, .help-changelog-card button { grid-area: action; width: 100%; text-align: center; justify-content: center; }
    }
    #qr-welcome-popup .changelog-panel { width: min(92%, 680px); max-width: 680px; height: min(86dvh, 780px); max-height: calc(100dvh - var(--th-panel-safe-top) - var(--th-panel-safe-bottom) - 28px); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; }
    .changelog-panel .panel-header { flex: 0 0 auto; }
    #qr-welcome-popup .changelog-content { min-height: 0; height: auto; overflow-x: hidden; overflow-y: auto !important; display: block; overscroll-behavior: contain; touch-action: pan-y; scrollbar-gutter: stable; -webkit-overflow-scrolling: touch; }
    .changelog-version-banner { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 10px 12px; border: 1px solid var(--highlight-border); border-radius: 10px; background: var(--highlight-bg); color: var(--panel-text-value); }
    .changelog-version-banner b { color: var(--panel-text-accent); font-size: 1.08em; }
    .changelog-latest-tag { display: inline-flex; align-items: center; justify-content: center; padding: 2px 7px; border-radius: 999px; background: #d5533f; color: #fff; font-size: 0.7em; font-weight: 700; white-space: nowrap; }
    .changelog-entry { display: block; margin-bottom: 10px; overflow: hidden; border: 1px solid var(--panel-border); border-radius: 12px; background: var(--panel-soft-module); }
    .changelog-entry:last-child { margin-bottom: 0; }
    .changelog-entry[open] { border-color: var(--highlight-border); }
    .changelog-entry > summary { display: grid; grid-template-columns: minmax(0, 1fr) auto 14px; align-items: center; gap: 9px; padding: 12px 13px; color: var(--panel-text-main); font-weight: 700; cursor: pointer; list-style: none; }
    .changelog-entry > summary::-webkit-details-marker { display: none; }
    .changelog-entry > summary::after { content: ''; grid-column: 3; width: 8px; height: 8px; justify-self: center; border-right: 2px solid var(--panel-text-value); border-bottom: 2px solid var(--panel-text-value); transform: rotate(45deg) translate(-1px, -1px); transition: transform 0.2s ease; }
    .changelog-entry[open] > summary::after { transform: rotate(225deg) translate(-1px, -1px); }
    .changelog-entry > summary > span:first-child { grid-column: 1; min-width: 0; }
    .changelog-entry > summary .changelog-latest-tag { grid-column: 2; justify-self: end; }
    .changelog-entry-body { padding: 0 14px 14px; border-top: 1px dashed var(--panel-border); color: var(--panel-text-main); }
    .changelog-entry-body p, .changelog-entry-body li { margin: 8px 0 0; line-height: 1.68; color: var(--panel-text-main); }
    .changelog-entry-body ul { margin: 7px 0 0 !important; padding-left: 1.35em !important; }
    .changelog-entry-body ul ul { margin-top: 4px !important; }
    .changelog-intro { color: var(--panel-text-value) !important; font-weight: 600; }
    .changelog-lead { margin: 10px 0; padding: 10px 11px; border-left: 3px solid var(--panel-text-accent); border-radius: 0 8px 8px 0; background: var(--highlight-bg); }
    .changelog-section { margin-top: 14px; padding-top: 2px; }
    .changelog-section + .changelog-section { border-top: 1px solid var(--panel-border); padding-top: 12px; }
    .changelog-section h2 { margin: 0 0 7px; color: var(--panel-text-accent); font-size: 1.04em; line-height: 1.45; }
    #qr-welcome-popup .changelog-section h3 {
        all: unset !important;
        display: block !important;
        box-sizing: border-box !important;
        margin: 13px 0 5px !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: none !important;
        box-shadow: none !important;
        color: var(--panel-text-highlight) !important;
        font-family: var(--font-main) !important;
        font-size: .94em !important;
        font-style: normal !important;
        font-weight: 700 !important;
        line-height: 1.45 !important;
        text-align: left !important;
        text-decoration: none !important;
        text-shadow: none !important;
        letter-spacing: normal !important;
        text-transform: none !important;
    }
    #qr-welcome-popup .changelog-section h3::before,
    #qr-welcome-popup .changelog-section h3::after { content: none !important; display: none !important; }
    .changelog-subtitle { margin: 14px 0 5px; padding-left: 9px; border-left: 3px solid var(--panel-text-accent); color: var(--panel-text-highlight); font-size: 0.96em; font-weight: 700; line-height: 1.45; }
    .changelog-section code { padding: 1px 5px; border: 1px solid var(--panel-border); border-radius: 5px; background: var(--panel-button-bg); color: var(--panel-text-accent); font-family: Consolas, monospace; }
    .changelog-section pre { margin: 10px 0 0; padding: 10px 12px; overflow-x: auto; border: 1px solid var(--panel-border); border-radius: 8px; background: rgba(0, 0, 0, 0.08); }
    .changelog-section pre code { padding: 0; border: 0; background: none; color: var(--panel-text-main); line-height: 1.55; }
    .changelog-section.is-warning h2 { color: #d5533f; }
    .changelog-emphasis { padding: 8px 10px; border-radius: 8px; background: rgba(213, 83, 63, 0.12); border: 1px solid rgba(213, 83, 63, 0.28); font-weight: 700; }
    .changelog-footer { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 14px calc(11px + var(--th-panel-safe-bottom)); border-top: 1px solid var(--panel-border); background: var(--panel-header-bg); }
    .changelog-footer-tip { color: var(--panel-text-value); font-size: 0.78em; line-height: 1.4; }
    .changelog-footer-actions { flex: 0 0 auto; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
    .changelog-confirm { flex: 0 0 auto; min-width: 112px; min-height: 38px; padding: 8px 13px; border: 1px solid var(--highlight-border); border-radius: 9px; color: var(--panel-text-main); font-weight: 700; cursor: pointer; }
    .changelog-confirm.is-read, .changelog-confirm.is-close { background: linear-gradient(135deg, var(--panel-text-accent), var(--panel-text-highlight)); color: #fff; }
    .changelog-confirm.is-dismiss { background: var(--panel-button-bg); color: var(--panel-text-value); }
    .changelog-confirm:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
    .changelog-confirm:disabled { cursor: not-allowed; opacity: 0.48; filter: grayscale(0.25); }
    .changelog-panel.dark-mode .changelog-confirm.is-read,
    .changelog-panel.dark-mode .changelog-confirm.is-close { background: linear-gradient(135deg, #4d6f9f, #7392bd); border-color: rgba(189, 214, 248, 0.58); color: #ffffff !important; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.42); }
    .changelog-panel.dark-mode .changelog-confirm.is-dismiss { background: rgba(188, 207, 235, 0.16); border-color: rgba(188, 207, 235, 0.4); color: #f2f7ff !important; }
    .changelog-panel.dark-mode .changelog-confirm:disabled { color: #e4edfa !important; opacity: 0.58; }
    @media (max-width: 768px), (max-height: 620px) {
        #qr-welcome-popup .changelog-panel { width: 100vw; max-width: none; height: 100dvh; max-height: 100dvh; }
        #qr-welcome-popup .changelog-content { height: auto !important; }
    }
    @media (max-width: 480px) {
        .changelog-entry > summary { grid-template-columns: minmax(0, 1fr) auto 12px; gap: 7px; padding: 10px; }
        .changelog-footer { align-items: stretch; flex-direction: column; }
        .changelog-footer-actions { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
        .changelog-confirm { width: 100%; min-width: 0; }
        .changelog-confirm.is-close:only-child { grid-column: 1 / -1; }
    }
    .tutorial-content {
        min-height: 360px;
        display: flex;
        flex-direction: column;
        gap: 14px;
    }
    .tutorial-progress { display: flex; align-items: center; gap: 10px; }
    .tutorial-progress-track {
        flex: 1;
        height: 8px;
        border-radius: 999px;
        background: var(--highlight-bg);
        overflow: hidden;
        border: 1px solid var(--highlight-border);
    }
    #tutorial-progress-bar {
        height: 100%;
        width: 20%;
        background: linear-gradient(90deg, var(--panel-text-accent), var(--panel-text-highlight));
        transition: width 0.25s ease;
    }
    .tutorial-progress-text {
        font-size: 0.85em;
        color: var(--panel-text-value);
        white-space: nowrap;
    }
    .tutorial-stage {
        flex: 1;
        background: var(--panel-soft-module);
        border: 1px solid var(--panel-border);
        border-radius: 12px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .tutorial-icon {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--highlight-bg);
        color: var(--panel-text-accent);
        border: 1px solid var(--highlight-border);
    }
    .tutorial-stage #tutorial-step-title {
        margin: 0;
        color: var(--panel-text-main);
        font-size: 1.08em;
        font-weight: 700;
        line-height: 1.35;
    }
    .tutorial-stage p {
        margin: 0;
        line-height: 1.6;
        color: var(--panel-text-value);
    }
    .tutorial-list {
        margin: 6px 0 0;
        padding-left: 16px;
        color: var(--panel-text-main);
        display: grid;
        gap: 4px;
    }
    .tutorial-tip {
        margin-top: auto;
        background: var(--highlight-bg);
        border: 1px dashed var(--highlight-border);
        border-radius: 10px;
        padding: 10px;
        font-size: 0.9em;
        color: var(--panel-text-value);
    }
    .tutorial-actions {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
    }
    .tutorial-btn {
        border-radius: 10px;
        border: var(--panel-button-border);
        background: var(--panel-button-bg);
        color: var(--panel-text-main);
        min-height: 42px;
        font-weight: 600;
        font-family: var(--font-main);
        cursor: pointer;
    }
    .tutorial-btn.primary {
        background: linear-gradient(135deg, var(--panel-text-accent), var(--panel-text-highlight));
        color: #fff;
        border: none;
    }
    .tutorial-btn.subtle { opacity: 0.9; }
    .tutorial-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    @media (max-width: 480px) {
       .preset-options .button-group {
           display: grid;
           grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
       }
       .tutorial-content { min-height: 0; }
       .tutorial-actions { grid-template-columns: 1fr; }
       .tutorial-stage { padding: 12px; }
    }
   .command-setting-group { margin-bottom: 15px; }
   .command-setting-group label { display: block; font-weight: 600; color: var(--panel-text-accent); margin-bottom: 8px; }
   .command-setting-group textarea {
        width: 100%; height: 120px; background: var(--panel-button-bg);
        border: var(--panel-button-border); color: var(--panel-text-main);
        border-radius: 6px; padding: 8px; box-sizing: border-box; resize: vertical;
        font-size: 0.9em;
    }
   .preset-list-item {
       background: var(--panel-bg); border: 1px solid var(--panel-border);
       box-shadow: 0 2px 8px rgba(0,0,0,0.04);
       border-radius: 12px; padding: 15px; margin-bottom: 12px;
       display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center;
       transition: transform 0.2s;
   }
   .preset-list-item:hover { transform: translateY(-1px); }
   .active-item { border-left: 4px solid var(--panel-text-accent) !important; background: linear-gradient(90deg, var(--highlight-bg), transparent) !important; }
    .preset-info { display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
    .preset-name { font-weight: bold; color: var(--panel-text-main); font-size: 1.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .preset-tags { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
     .tag { font-size: 0.7em; padding: 2px 6px; border-radius: 4px; background: rgba(92, 119, 152, 0.1); color: var(--panel-text-value); border: 1px solid rgba(92, 119, 152, 0.15); }
     .tag.active { background: var(--panel-text-accent); color: var(--panel-bg); border-color: transparent; }
     .tag.global { background: #6c89af; color: white; border-color: transparent; }
    .preset-actions {
        display: flex; gap: 8px; align-items: center;
        padding: 0;
        background: transparent;
    }
    .dark-mode .preset-actions { background: rgba(255,255,255,0.03); }
   .input-full-width { width: 100%; margin-bottom: 10px; }

   /* 面板被挂到酒馆宿主页面：以根节点和 !important 隔离主题美化，只保留本面板自己的变量。 */
   #control-panel-container,
   #qr-welcome-popup,
   .qs-builder-overlay,
   #control-panel-container *,
   #control-panel-container *::before,
   #control-panel-container *::after,
   #qr-welcome-popup *,
   #qr-welcome-popup *::before,
   #qr-welcome-popup *::after,
   .qs-builder-overlay *,
   .qs-builder-overlay *::before,
   .qs-builder-overlay *::after {
       box-sizing: border-box;
       text-shadow: none !important;
       scrollbar-width: none !important;
       -ms-overflow-style: none !important;
   }
   #control-panel-container::-webkit-scrollbar,
   #qr-welcome-popup::-webkit-scrollbar,
   .qs-builder-overlay::-webkit-scrollbar,
   #control-panel-container *::-webkit-scrollbar,
   #qr-welcome-popup *::-webkit-scrollbar,
   .qs-builder-overlay *::-webkit-scrollbar {
       width: 0 !important;
       height: 0 !important;
       display: none !important;
       background: transparent !important;
   }
   #control-panel-container :is(button, input, textarea, select),
   #qr-welcome-popup :is(button, input, textarea, select),
   .qs-builder-overlay :is(button, input, textarea, select) {
       font: inherit !important;
       letter-spacing: normal !important;
       text-transform: none !important;
       filter: none !important;
       -webkit-text-fill-color: currentColor !important;
   }
   #control-panel-container :is(input, textarea, select),
   #qr-welcome-popup :is(input, textarea, select),
   .qs-builder-overlay :is(input, textarea, select) {
       background-color: var(--panel-button-bg) !important;
       background-image: none !important;
       border: var(--panel-button-border) !important;
       border-radius: 8px !important;
       color: var(--panel-text-main) !important;
       box-shadow: none !important;
       outline: none !important;
   }
   #control-panel-container :is(input, textarea, select):focus,
   #qr-welcome-popup :is(input, textarea, select):focus,
   .qs-builder-overlay :is(input, textarea, select):focus {
       border-color: var(--panel-text-accent) !important;
       box-shadow: 0 0 0 2px var(--highlight-bg) !important;
   }
   #control-panel-container input[type="number"] {
       appearance: textfield !important;
       -moz-appearance: textfield !important;
   }
   #control-panel-container input[type="number"]::-webkit-inner-spin-button,
   #control-panel-container input[type="number"]::-webkit-outer-spin-button {
       margin: 0 !important;
       -webkit-appearance: none !important;
   }

   #control-panel-container .preset-options .length-definition-row {
       grid-template-columns: 52px minmax(0, 1fr) minmax(0, 1fr) !important;
       column-gap: 12px !important;
       row-gap: 0 !important;
       margin: 0 0 9px !important;
   }
   #control-panel-container .preset-options .length-definition-row.is-paragraph-row { margin-top: -2px !important; }
   #control-panel-container .preset-options .length-definition-row.is-series-start { margin-top: 15px !important; }
   #control-panel-container .preset-options .current-length-row {
       grid-template-columns: minmax(0, 1fr) 18px minmax(0, 1fr) 30px !important;
       column-gap: 9px !important;
       margin: 0 !important;
   }
   #control-panel-container .preset-options .custom-input-container { gap: 10px !important; margin-top: 14px !important; }
   #control-panel-container .preset-options .custom-input-group input {
       width: 100% !important;
       min-width: 0 !important;
       height: 44px !important;
       margin: 0 !important;
       padding: 9px 12px !important;
       line-height: 24px !important;
   }
   #control-panel-container .preset-options .length-definition-row > span:first-child {
       justify-self: start;
       font-weight: 650;
       white-space: nowrap;
   }
   #control-panel-container .preset-options .quick-settings-group { align-items: center; }

   #control-panel-container .nsfw-status-item .status-value { display: flex; align-items: center; gap: 7px; }
   #control-panel-container .nsfw-status-item { gap: 7px; }
   #control-panel-container .nsfw-state-dot {
       width: 8px;
       height: 8px;
       flex: 0 0 8px;
       border-radius: 50%;
       background: var(--panel-text-value);
       opacity: .42;
   }
   #control-panel-container .nsfw-status-item.is-active .nsfw-state-dot {
       background: #ef6574;
       opacity: 1;
       box-shadow: 0 0 8px rgba(239, 101, 116, .7);
   }
   #control-panel-container .nsfw-home-modes {
       display: grid;
       grid-template-columns: repeat(3, minmax(0, 1fr));
       gap: 5px;
       width: 100%;
       padding-left: 10px;
   }
   #control-panel-container .nsfw-home-modes button {
       min-height: 29px !important;
       margin: 0 !important;
       padding: 4px 7px !important;
       border: 1px solid var(--panel-border) !important;
       border-radius: 7px !important;
       background: var(--panel-button-bg) !important;
       color: var(--panel-text-value) !important;
       box-shadow: none !important;
       cursor: pointer;
   }
   #control-panel-container .nsfw-home-modes button.active {
       border-color: var(--panel-text-accent) !important;
       background: var(--highlight-bg) !important;
       color: var(--panel-text-accent) !important;
       font-weight: 700 !important;
   }
   #control-panel-container .nsfw-worldbook-status {
       width: 100%;
       margin: 2px 0 0;
       padding-left: 10px;
       color: var(--panel-text-value);
       font-size: .76em;
       line-height: 1.4;
   }
   #control-panel-container .nsfw-worldbook-modes button { font-size: .76em !important; }
   #control-panel-container .nsfw-editor-live {
       display: inline-flex;
       align-items: center;
       gap: 7px;
       margin: 0 0 10px;
       padding: 6px 9px;
       border: 1px solid var(--panel-border);
       border-radius: 999px;
       color: var(--panel-text-value);
       font-size: .82em;
   }
   #control-panel-container .nsfw-editor-live i { width: 8px; height: 8px; border-radius: 50%; background: var(--panel-text-value); opacity: .42; }
   #control-panel-container .nsfw-editor-live.is-active i { background: #ef6574; opacity: 1; box-shadow: 0 0 8px rgba(239, 101, 116, .7); }
   #control-panel-container .setting-help {
       margin: 0 0 12px;
       color: var(--panel-text-value);
       font-size: .84em;
       line-height: 1.55;
   }
   #control-panel-container .nsfw-mode-buttons { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
   #control-panel-container .nsfw-config-grid { display: grid; gap: 12px; margin-top: 14px; }
   #control-panel-container .nsfw-keyword-field { display: grid; gap: 5px; color: var(--panel-text-accent); font-weight: 650; }
   #control-panel-container .nsfw-keyword-field small { color: var(--panel-text-value); font-size: .78em; font-weight: 400; line-height: 1.45; }
   #control-panel-container .nsfw-keyword-field textarea {
       width: 100% !important;
       min-height: 76px !important;
       padding: 10px 12px !important;
       resize: vertical;
       line-height: 1.55 !important;
   }
   #control-panel-container .nsfw-hold-row { margin-top: 14px !important; }
   #control-panel-container .nsfw-worldbook-config {
       display: grid;
       gap: 10px;
       margin-top: 16px;
       padding-top: 15px;
       border-top: 1px solid var(--panel-border);
   }
   #control-panel-container .nsfw-worldbook-config .setting-group-title { margin: 0; }
   #control-panel-container .nsfw-worldbook-config .setting-help { margin-bottom: 0; }
   #control-panel-container .nsfw-worldbook-marker-field { margin-top: 2px; }
   #control-panel-container .nsfw-worldbook-marker-field textarea { min-height: 58px !important; }
   #control-panel-container .nsfw-reset-keywords { width: 100%; margin-top: 12px; }
   #control-panel-container .nsfw-default-summary { margin: 9px 2px 0; }
   @media (max-width: 480px) {
       #control-panel-container .preset-options .length-definition-row {
           grid-template-columns: 48px minmax(0, 1fr) minmax(0, 1fr) !important;
           column-gap: 8px !important;
       }
       #control-panel-container .preset-options .quick-settings-group {
           display: grid;
           grid-template-columns: 1fr;
           align-items: stretch;
       }
       #control-panel-container .preset-options .quick-settings-group > span { text-align: left; }
   }
`;
