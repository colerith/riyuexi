export const summaryFormat = `
[总结格式]
以下是“故事总结”总结格式，你将在收到\`大总结/期末总结\`指令后中止其余创作并输出以下：
<details>
<summary>🌙 故事总结 - 总结编号</summary>
\`\`\`
[时空坐标]
始于: YYYY年MM月DD日 HH:MM
终于: YYYY年MM月DD日 HH:MM

[场景索引]
场景A → 场景B → 场景C

[核心回响记录]

【事件概括标题】
- 时间: 事件发生时间段
- 人物: 核心人物 (身份/设定)、次要人物
- 叙事节点: 客观、精炼地概述事件的起因、经过与结果。聚焦于“发生了什么”
- 关系引力: 分析此事件如何改变了角色间的核心张力与互动模式。聚焦于“关系发生了什么变化”
- 内在罗盘: 分析此事件如何揭示或挑战了角色的内在动机、欲望或恐惧。聚焦于“角色的内心被揭示了什么”
- 核心对话、承诺等

(……根据事件数量，重复以上结构)
\`\`\`
</details>

要求：只对核心事件进行汇总，跨度适中

---
`;

export const getOutlineTemplate = () => `
格式如下：

<details><summary>🏛️ 世界蓝图</summary>

# 故事框架
## 故事背景
（描述故事发生的时代、地点、社会环境等）
## 故事基调
（确定故事的氛围：如轻松喜剧、黑暗沉重、温馨治愈、色情甜腻等）
## 登场人物
- 主要人物：
- 次要人物：

## 第一幕：{本幕主题}
- 剧情点 1.1:
- 剧情点 1.2:
……

## 第二幕：{本幕主题}
- 剧情点 2.1:
- 剧情点 2.2:
……
…
## 最终幕：{本幕主题}
- 剧情点 n.1:
- 剧情点 n.2:
……

<seeds>
（在此处整理关键伏笔）
</seeds>
</details>

# 月读执行指南
1. **剧情节奏**：保持合理的剧情推进，避免章节跳跃过快。
2. **事件驱动**：主动安排角色间的互动与关键事件。
3. **内容填充**：适时引入支线冲突或NSFW情节，丰富体验。
4. **人设一致**：维持所有角色行为与设定的高度一致性 (防OOC)。
`;

export const summaryActions: { [key: string]: () => Promise<void> } = {
  summarize_full: async () => {
    const content = `【期末总结-全文】
停止剧情，停止输出其他所有内容，开始执行**全文大总结**

大总结应当遵循以下原则：
- **大总结应该包括全部上文，之前的大总结和新增内容汇总在一起**
- 按逻辑顺序组织信息，并包含具体的前后时间，可分辨不同时间发生的事情
- 保留关键事件和重要细节，避免冗余描述
- 直接陈述事实，避免评价
- 使用简洁清晰的语言，避免修饰
- 突出事件发展脉络和关键转折点
- 保留重要的约定、物品、事件以及情感发展
- 不回避任何敏感内容，保证记录完全还原前文
- 可以精简合并较为久远之前的事件
- 无需加粗标注
- 以流水账形式记录

格式如下：\n${summaryFormat}`;
    await triggerSlash(`/send ${content}|/trigger`);
    toastr.info('“总结全文”指令已发送');
  },
  summarize_chapter: async () => {
    const content = `【故事总结-本章】
停止剧情，停止输出其他所有内容，开始执行**本章大总结**

新增大总结应当遵循以下原则：
- 注明这是第几次大总结
- **只需总结上次大总结到目前的新增部分剧情**
- 按逻辑顺序组织信息，并包含具体的前后时间，可以分辨不同日期与时间发生的事情
- 保留关键事件和重要细节，省略冗余描述
- 直接陈述事实，避免评价
- 使用简洁清晰的语言，避免修饰
- 突出事件发展脉络和关键转折点
- 保留重要的约定、物品、事件以及情感发展
- 不回避任何敏感内容，保证记录完全还原前文
- 可以精简合并较为久远之前的事件
- 无需加粗标注

格式如下：\n${summaryFormat}`;
    await triggerSlash(`/send ${content}|/trigger`);
    toastr.info('“总结本章”指令已发送');
  },
  hide_messages: async () => {
    const range = await triggerSlash(
      '/input okButton="确定" cancelButton="取消" 输入要隐藏的楼层范围（例如：0-10），一般保留最近的5-10楼',
    );
    if (range) {
      await applyVisibilityForRangeInput(range, true);
    }
  },
  unhide_messages: async () => {
    const range = await triggerSlash(
      '/input okButton="确定" cancelButton="取消" 输入要取消隐藏的楼层范围（例如：0-10）',
    );
    if (range) {
      await applyVisibilityForRangeInput(range, false);
    }
  },
  show_hide_stats: async () => {
    const stats = getHideAndSummaryStats();
    const report = buildHideStatsReport(stats);
    console.info('[预设助手][楼层统计]\n' + report);
    await triggerSlash(`/popup large=on wider=on ${report}`);
    toastr.info(
      `已统计：未隐藏 ${stats.unhidden} 层，已隐藏 ${stats.hidden} 层，故事总结 ${stats.summaryFloors.length} 层`,
    );
  },
  hide_keep_last_3: async () => {
    await applyKeepLatestVisible(3);
  },
  hide_keep_last_5: async () => {
    await applyKeepLatestVisible(5);
  },
  hide_previous_except_story_summary: async () => {
    const all = getAllChatMessages();
    if (all.length <= 1) {
      toastr.info('当前楼层过少，无需执行。');
      return;
    }

    const lastId = all[all.length - 1].message_id;
    const updates = all
      .filter(message => message.message_id < lastId)
      .map(message => {
        const keepVisible = isCharStorySummaryMessage(message);
        if ((keepVisible && !message.is_hidden) || (!keepVisible && message.is_hidden)) {
          return null;
        }
        return { message_id: message.message_id, is_hidden: !keepVisible };
      })
      .filter(Boolean) as Array<{ message_id: number; is_hidden: boolean }>;

    if (updates.length > 0) {
      await setChatMessages(updates, { refresh: 'all' });
    }

    const stats = getHideAndSummaryStats();
    toastr.success(
      `已处理前文：共调整 ${updates.length} 层；当前未隐藏 ${stats.unhidden} 层，故事总结可见 ${stats.summaryFloors.filter(item => !item.hidden).length} 层`,
    );
  },
  build_outline: async () => {
    const blueprintDraft = await triggerSlash('/input 请输入你的大纲构想。留空则由象牙塔自由发挥。');
    let sendContent = '';
    if (blueprintDraft) {
      sendContent = `
停止剧情，停止输出其他所有内容，进入【大纲模式】，开始执行**故事大纲编写**：

根据用户输入扩写为一个完整大纲，必须严格遵循用户的以下输入：
【用户的要求内容：${blueprintDraft}】

构建原则：
- 严格遵循用户的核心要求。
- 整合已有角色、背景设定，确保逻辑自洽。
- 设计清晰的主线，并填充有意义的支线情节。
- 确保故事充满戏剧张力与互动可能。
- 用**加粗**标注关键转折或高潮。

${getOutlineTemplate()}
`;
    } else {
      sendContent = `
停止剧情，停止输出其他所有内容，进入【大纲模式】，开始执行**故事大纲编写**：

构建原则：
- 整合已有角色、背景设定，确保逻辑自洽。
- 设计清晰的主线，并填充有意义的支线情节。
- 确保故事充满戏剧张力与互动可能。
- 用**加粗**标注关键转折或高潮。

${getOutlineTemplate()}
`;
    }
    await triggerSlash(`/send ${sendContent}|/trigger`);
    toastr.info('“构建大纲”指令已发送');
  },
  modify_outline: async () => {
    const modnote = await triggerSlash('/input 请输入具体的修改指令。取消则退出。');
    if (!modnote) return;
    const sendContent = `
停止剧情，停止输出其他所有内容，进入【大纲模式】，开始执行**大纲修改**：

请根据以下用户的修改意见，对**当前已生成的大纲**进行增删、细化与重排；必须严格遵循意见，同时保持世界观、人物设定与逻辑连续性：
【修改意见：${modnote}】

修改原则：
- 严格执行用户的修改指令。
- 自动补全修改后产生的逻辑缺口，确保故事连贯。
- 用**加粗**标注所有被修改或新增的关键剧情。
- 保持角色设定的核心不变。

${getOutlineTemplate()}
`;
    await triggerSlash(`/send ${sendContent}|/trigger`);
    toastr.info('“修改大纲”指令已发送');
  },
};

type ChatMessageLite = {
  message_id: number;
  role: 'system' | 'assistant' | 'user';
  is_hidden: boolean;
  message?: string;
};

function getAllChatMessages(): ChatMessageLite[] {
  const lastId = getLastMessageId();
  if (lastId < 0) return [];
  return getChatMessages(`0-${lastId}`) as ChatMessageLite[];
}

function parseMessageRangeInput(input: string, maxMessageId: number): number[] {
  const normalized = String(input || '')
    .replace(/[，、；;]/g, ',')
    .trim();
  if (!normalized) return [];

  const ids = new Set<number>();
  normalized
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .forEach(part => {
      const rangeMatch = part.match(/^(-?\d+)\s*-\s*(-?\d+)$/);
      if (rangeMatch) {
        const start = Number.parseInt(rangeMatch[1], 10);
        const end = Number.parseInt(rangeMatch[2], 10);
        if (Number.isNaN(start) || Number.isNaN(end)) return;
        const from = _.clamp(Math.min(start, end), 0, maxMessageId);
        const to = _.clamp(Math.max(start, end), 0, maxMessageId);
        for (let current = from; current <= to; current += 1) {
          ids.add(current);
        }
        return;
      }

      const single = Number.parseInt(part, 10);
      if (Number.isNaN(single)) return;
      ids.add(_.clamp(single, 0, maxMessageId));
    });

  return Array.from(ids).sort((a, b) => a - b);
}

function extractStorySummaryLabel(text: string): string | null {
  const detailsSummary = text.match(/<summary>[^<]*故事总结\s*[-:：]\s*([^<\n]+)<\/summary>/i);
  if (detailsSummary && detailsSummary[1]) {
    return detailsSummary[1].trim();
  }
  const bracketSummary = text.match(/【\s*故事总结\s*[-:：]\s*([^】\n]+)】/);
  if (bracketSummary && bracketSummary[1]) {
    return bracketSummary[1].trim();
  }
  return null;
}

function isCharStorySummaryMessage(message: ChatMessageLite): boolean {
  if (message.role !== 'assistant') return false;
  const text = message.message || '';
  return /故事总结/.test(text);
}

function getHideAndSummaryStats() {
  const all = getAllChatMessages();
  const hidden = all.filter(item => item.is_hidden).length;
  const unhidden = all.length - hidden;
  const summaryFloors = all
    .filter(item => isCharStorySummaryMessage(item))
    .map(item => ({
      messageId: item.message_id,
      label: extractStorySummaryLabel(item.message || '') || '未识别编号',
      hidden: item.is_hidden,
    }));

  return {
    total: all.length,
    hidden,
    unhidden,
    summaryFloors,
  };
}

function buildHideStatsReport(stats: ReturnType<typeof getHideAndSummaryStats>) {
  const summaryLines =
    stats.summaryFloors.length > 0
      ? stats.summaryFloors.map(item => `${item.messageId}: ${item.label}${item.hidden ? ' [已隐藏]' : ''}`).join('\n')
      : '无';

  return (
    `[楼层可见性统计]\n` +
    `总楼层: ${stats.total}\n` +
    `未隐藏: ${stats.unhidden}\n` +
    `已隐藏: ${stats.hidden}\n\n` +
    `[Char 输出的故事总结楼层]\n` +
    summaryLines
  );
}

async function applyVisibilityForRangeInput(input: string, hidden: boolean) {
  const all = getAllChatMessages();
  if (all.length === 0) {
    toastr.info('当前没有可处理的楼层。');
    return;
  }

  const targetIds = parseMessageRangeInput(input, all[all.length - 1].message_id);
  if (targetIds.length === 0) {
    toastr.warning('未识别到有效楼层范围，请使用如 0-10、5、2,4,6-8 这样的格式。');
    return;
  }

  const targetSet = new Set(targetIds);
  const updates = all
    .filter(message => targetSet.has(message.message_id) && message.is_hidden !== hidden)
    .map(message => ({
      message_id: message.message_id,
      is_hidden: hidden,
    }));

  if (updates.length === 0) {
    toastr.info(hidden ? '指定楼层已经是隐藏状态。' : '指定楼层已经是显示状态。');
    return;
  }

  await setChatMessages(updates, { refresh: 'all' });
  toastr.success(`${hidden ? '已隐藏' : '已取消隐藏'} ${updates.length} 层`);
}

async function applyKeepLatestVisible(keepCount: number) {
  const all = getAllChatMessages();
  if (all.length === 0) {
    toastr.info('当前没有可处理的楼层。');
    return;
  }

  const keepStartId = Math.max(0, all[all.length - 1].message_id - keepCount + 1);
  const updates = all
    .map(message => {
      const shouldHide = message.message_id < keepStartId;
      if (message.is_hidden === shouldHide) return null;
      return { message_id: message.message_id, is_hidden: shouldHide };
    })
    .filter(Boolean) as Array<{ message_id: number; is_hidden: boolean }>;

  if (updates.length > 0) {
    await setChatMessages(updates, { refresh: 'all' });
  }

  const stats = getHideAndSummaryStats();
  toastr.success(
    `已保留最近 ${keepCount} 层可见（从 ${keepStartId} 开始）；共调整 ${updates.length} 层，当前未隐藏 ${stats.unhidden} 层`,
  );
}

export const quickRequestActions: { [key: string]: string } = {
  qr_快速叙事: `<!-- Request: {userOrder} 无视叙事要求，快速推进与结束当前场景，进入下一情节；如果用户有补充要求，也要一起遵守 -->`,
  qr_慢速叙事: `<!-- Request: {userOrder} 禁止快速发展剧情。请启用显微镜视角，大幅放慢叙事进度，聚焦于当下的感官细节与微观互动，拒绝时间跳跃 -->`,
  qr_禁止重复: `<!-- Request: {userOrder} 请回顾上文，反思情节的重复性。寻找新的情节、对话和互动模式，主动打破循环，为故事注入新的活力和不可预测性。 -->`,
  qr_禁止跳楼层: `<!-- Request: {userOrder} 请根据最新的{{user}}回复以及楼层来继续创作故事，禁止跳跃回复 -->`,
  qr_规则重扫: `<!-- Request: {userOrder} 重新扫描当前【抢话/转述】开关状态。严格判明是否允许代理user行动，并立即纠正任何越权或遗漏转述的行为 -->`,
  qr_重扫规则: `<!-- Request: {userOrder} 重新扫描当前【抢话/转述】开关状态。严格判明是否允许代理user行动，并立即纠正任何越权或遗漏转述的行为 -->`,
  qr_表格提醒: `<!-- Request: {userOrder} 请完整更新表格里的信息，包括时间、角色信息、当前事件等 -->`,
  qr_状态栏提醒: `<!-- Request: {userOrder} 请读取世界书或角色描述，正确输出角色状态栏 -->`,
  qr_手机格式提醒: `<!-- Request: {userOrder} 请读取世界书，正确生成手机格式 -->`,
  qr_小剧场提醒: `<!-- Request: {userOrder} 按要求输出文末的snow小剧场格式，保证数量、题材正确，且不重复上一回合内容 -->`,
  qr_抢话提醒: `<!-- Request: {userOrder} 请充分演绎{{user}}的对话和行动 -->`,
  qr_不抢话提醒: `<!-- Request: {userOrder} 你绝不会替代{{user}}描写对话和行动，只描写char和NPC的对话和行动 -->`,
  qr_人称提醒: `<!-- Request: {userOrder} 请重新读取人称要求，区分称呼{{user}}和char的不同人称 -->`,
  qr_字数提醒: `<!-- Request: {userOrder} 请重新读取字数控制要求，严格按照字数自检输出正确的字数，禁止偷懒 -->`,
  custom_request: `<!-- Request: {userOrder} -->`,
};

export async function handleQuickRequest(action: string, customTemplate?: string) {
  const userOrder = (await triggerSlash('/input 🍬请输入你的补充提示内容（可选）')) || '';
  const template = customTemplate ?? quickRequestActions[action];
  if (template) {
    const finalMessage = template.replace('{userOrder}', userOrder).trim();
    const $textarea = $('#send_textarea');
    const currentInput = $textarea.val() as string;
    if (currentInput) {
      $textarea.val(currentInput + '\n' + finalMessage).trigger('input');
    } else {
      $textarea.val(finalMessage).trigger('input');
    }
    toastr.success('🎉 指令已生成到输入框！');
  }
}
