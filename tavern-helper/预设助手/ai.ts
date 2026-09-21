import { defaultCommands } from './constants';
import type { QRPreset } from './types';

export async function injectSettingsToAI(currentSettings: QRPreset) {
  updateVariablesWith(
    vars => {
      const nextVars = { ...vars };
      console.log('预设助手 [注入设置]: 开始将设置注入AI全局变量...', currentSettings);
      nextVars['字数总要求'] =
        `[${currentSettings.wordCount.min}-${currentSettings.wordCount.max}]字，[${currentSettings.paragraphCount.min}-${currentSettings.paragraphCount.max}]段`;
      if (currentSettings.paragraphStyle === 'long') {
        nextVars['单段落字数'] = currentSettings.commands.paragraph_patch_long || defaultCommands.paragraph_patch_long;
      } else if (currentSettings.paragraphStyle === 'short') {
        nextVars['单段落字数'] =
          currentSettings.commands.paragraph_patch_short || defaultCommands.paragraph_patch_short;
      } else if (currentSettings.paragraphStyle === 'free') {
        nextVars['单段落字数'] = currentSettings.commands.paragraph_patch_free || defaultCommands.paragraph_patch_free;
      } else {
        nextVars['单段落字数'] =
          currentSettings.commands.paragraph_patch_medium || defaultCommands.paragraph_patch_medium;
      }
      if (currentSettings.aiMode === 'dialogue') {
        nextVars['talk'] =
          '\n- 停止所有创作任务，当前为元对话，月读需以人格在正文中直接回应，禁止输出摘要\n- 你会铭记用户的所有要求\n';
      } else if (currentSettings.aiMode === 'outline') {
        nextVars['talk'] =
          '\n- 停止所有创作任务，当前为元对话，月读需听从用户指令，在正文中输出故事大纲，禁止输出摘要等其他内容\n';
      } else if (currentSettings.aiMode === 'summary') {
        nextVars['talk'] =
          '\n- 停止所有创作任务，当前为元对话，月读需听从用户指令，在正文中按总结格式输出大总结，禁止输出摘要等其他内容\n';
      } else {
        nextVars['talk'] = '';
      }
      switch (currentSettings.perspective) {
        case 'third_person_omniscient':
          nextVars['叙述视角'] = currentSettings.commands.perspective_third_person_omniscient;
          nextVars['char代词'] = '他/她/char_name';
          break;
        case 'third_person_limited':
          nextVars['叙述视角'] = currentSettings.commands.perspective_third_person_limited;
          nextVars['char代词'] = '他/她/char_name';
          break;
        case 'first_person_limited':
          nextVars['叙述视角'] = currentSettings.commands.perspective_first_person_limited;
          nextVars['char代词'] = '我';
          break;
        case 'floating_person':
          nextVars['叙述视角'] = currentSettings.commands.perspective_floating_person;
          nextVars['char代词'] = '我/他/她/char_name';
          break;
      }
      switch (currentSettings.userPronoun) {
        case 'third_person':
          nextVars['user代词'] = currentSettings.commands.userPronoun_third_person;
          break;
        case 'second_person':
          nextVars['user代词'] = currentSettings.commands.userPronoun_second_person;
          break;
        case 'first_person':
          nextVars['user代词'] = currentSettings.commands.userPronoun_first_person;
          break;
        case 'floating_person':
          nextVars['user代词'] = currentSettings.commands.userPronoun_floating_person;
          break;
      }
      if (currentSettings.takeover === 'open') {
        nextVars['user_input'] = currentSettings.commands.takeover_open;
        nextVars['演绎授权'] = '演绎<user>言行';
      } else if (currentSettings.takeover === 'half_open') {
        nextVars['user_input'] = currentSettings.commands.takeover_half_open;
        nextVars['演绎授权'] = '演绎<user>行动';
      } else if (currentSettings.takeover === 'assist') {
        nextVars['user_input'] = currentSettings.commands.takeover_assist;
        nextVars['演绎授权'] = '辅助<user>行动';
      } else {
        nextVars['user_input'] = currentSettings.commands.takeover_closed;
        nextVars['演绎授权'] = '不演绎<user>言行';
      }
      if (currentSettings.narrate === 'open') {
        nextVars['转述开关'] = currentSettings.commands.narrate_open;
        nextVars['转述授权'] = '开放转述<user>';
      } else if (currentSettings.narrate === 'balanced') {
        nextVars['转述开关'] = currentSettings.commands.narrate_balanced;
        nextVars['转述授权'] = '平衡转述<user>';
      } else if (currentSettings.narrate === 'light') {
        nextVars['转述开关'] = currentSettings.commands.narrate_light;
        nextVars['转述授权'] = '轻度转述<user>';
      } else {
        nextVars['转述开关'] = currentSettings.commands.narrate_closed;
        nextVars['转述授权'] = '禁止转述<user>';
      }
      return nextVars;
    },
    { type: 'global' },
  );
  console.log('预设助手 [注入设置]: AI全局变量注入完成。');
}
