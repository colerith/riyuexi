export const AVATAR_STYLES = [
  'openPeeps',
  'notionists',
  'pixelArt',
  'micah',
  'lorelei',
  'adventurer',
  'funEmoji',
  'personas',
] as const;
export const AVATAR_COUNT = AVATAR_STYLES.length * 40;
export const HOT_COMMENT_LIKES = 2000;
export function avatarAt(index: number): string {
  const style = AVATAR_STYLES[index % AVATAR_STYLES.length];
  return 'https://cdn.jsdelivr.net/gh/colerith/riyuexi@main/段评/assets/avatars-v1/' + style + '.webp';
}
export function avatarCell(index: number): { column: number; row: number } {
  const cell = Math.floor(index / AVATAR_STYLES.length) % 40;
  return { column: cell % 5, row: Math.floor(cell / 5) };
}
export const EMOTIONS: Record<string, readonly string[]> = {
  开心: ['(≧▽≦)', '(｡･ω･｡)', 'ヽ(✿ﾟ▽ﾟ)ノ', '(๑˃̵ᴗ˂̵)و'],
  嗑糖: ['(〃▽〃)', '(*/ω＼*)', '(♡˙︶˙♡)', '(´,,•ω•,,)'],
  爆笑: ['(ಡωಡ)', '(*≧▽≦)', '(≧∇≦)ﾉ', 'ヾ(≧▽≦*)o'],
  震惊: ['Σ(°△°|||)', '(⊙_⊙)', 'Σ(っ°Д°;)っ', '(ﾟДﾟ≡ﾟДﾟ)'],
  心疼: ['(｡•́︿•̀｡)', '(╥﹏╥)', '(っ˘̩╭╮˘̩)っ', '(；ω；)'],
  吐槽: ['(¬_¬)', '(눈_눈)', '(；¬д¬)', '(￣ヘ￣)'],
  无语: ['(￣ー￣)', '(ー_ー)!!', '(。_。)', '( ˙-˙ )'],
  生气: ['(╬￣皿￣)', '(ง •̀_•́)ง', '(＃｀д´)ﾉ', '(๑•̀ㅂ•́)و'],
  吃瓜: ['(・ω・)', '(￢‿￢)', '(｡･∀･)ﾉ', '(￣▽￣)'],
  悬疑: ['(￢_￢)', '(・・?)', '(⊙ˍ⊙)', '(。-`ω´-)'],
};
const ALIASES: Record<string, string> = {
  happy: '开心',
  sweet: '嗑糖',
  love: '嗑糖',
  funny: '爆笑',
  laugh: '爆笑',
  shock: '震惊',
  sad: '心疼',
  cry: '心疼',
  roast: '吐槽',
  speechless: '无语',
  angry: '生气',
  gossip: '吃瓜',
  mystery: '悬疑',
  甜: '嗑糖',
  磕糖: '嗑糖',
  磕cp: '嗑糖',
  嗑cp: '嗑糖',
  好笑: '爆笑',
  好虐: '心疼',
  疑惑: '悬疑',
};
export function hash(text: string, initial = 2166136261): number {
  let value = initial;
  for (const char of text) value = Math.imul(value ^ char.codePointAt(0)!, 16777619);
  return value >>> 0;
}
export function stableKey(text: string): string {
  return `${hash(text).toString(36)}-${hash(text, 5381).toString(36)}`;
}
export function resolveFace(value: string, seed: string): string {
  const keyword = value
    .trim()
    .replace(/^(?:情绪|心情|emotion)\s*[:：=]\s*/i, '')
    .replace(/^[#＃]/, '')
    .toLowerCase();
  const pool = EMOTIONS[ALIASES[keyword] || keyword];
  if (pool) return pool[hash(seed) % pool.length];
  // 兼容旧版直接填写颜文字；未知关键词或 emoji 回退内置库。
  if (value && /[()（）ω▽︿﹏]/u.test(value) && !/\p{Extended_Pictographic}/u.test(value)) return value;
  return EMOTIONS.吃瓜[hash(seed) % EMOTIONS.吃瓜.length];
}
export function parseIdentity(value: string): { name: string; title: string } {
  const match = value.trim().match(/^(.*?)\s*[【[]([^\]】]+)[\]】]\s*$/u);
  return match && match[1].trim()
    ? { name: match[1].trim(), title: match[2].trim() }
    : { name: value.trim(), title: '' };
}
export function normalizeTags(fields: string[]): string[] {
  return [
    ...new Set(
      fields.flatMap(field =>
        field
          .replace(/^(?:标签|tags?)\s*[:：=]\s*/i, '')
          .split(/[#＃,，、;；]+/u)
          .map(tag =>
            tag
              .trim()
              .replace(/^[[【]+|[\]】]+$/gu, '')
              .trim(),
          )
          .filter(Boolean),
      ),
    ),
  ]
    .slice(0, 6)
    .map(tag => `#${tag}`);
}
interface CommunityData {
  seed: string;
  epoch: number;
  liked: Record<string, true>;
}
export interface CommunityStore {
  profile(name: string): { avatar: string; column: number; row: number; level: number; color: number };
  comment(key: string): { likes: number; liked: boolean; date: string; dateTime: string };
  toggle(key: string): void;
}
const imageCache = new Map<number, string>();
export function createCommunityStore(read: () => unknown, write: (data: CommunityData) => void): CommunityStore {
  const raw = read();
  const value = raw && typeof raw === 'object' ? (raw as Partial<CommunityData>) : {};
  const liked: Record<string, true> = Object.create(null);
  if (value.liked && typeof value.liked === 'object') {
    for (const [key, flag] of Object.entries(value.liked))
      if (/^[a-z0-9]+-[a-z0-9]+$/.test(key) && flag === true) liked[key] = true;
  }
  let data: CommunityData = {
    seed: typeof value.seed === 'string' ? value.seed : `${Date.now()}-${Math.random()}`,
    epoch:
      typeof value.epoch === 'number' && Number.isFinite(value.epoch) && value.epoch > 0
        ? Math.min(value.epoch, Date.now())
        : Date.now(),
    liked,
  };
  // 只在首次建立库时保存；渲染本身不写变量。
  if (value.seed !== data.seed || value.epoch !== data.epoch) write(data);
  return {
    profile(name) {
      const seed = hash(`${data.seed}|user|${name.trim().normalize('NFKC')}`);
      const index = seed % AVATAR_COUNT;
      if (!imageCache.has(index)) imageCache.set(index, avatarAt(index));
      return {
        avatar: imageCache.get(index)!,
        ...avatarCell(index),
        level: 1 + (seed % 9),
        color: hash(`${name}|badge`) % 5,
      };
    },
    comment(key) {
      const seed = hash(`${data.seed}|comment|${key}`);
      const liked = data.liked[key] === true;
      const date = new Date(data.epoch - (hash(`${key}|date`) % (60 * 24 * 60)) * 60000);
      const pad = (n: number) => String(n).padStart(2, '0');
      return {
        likes: Math.floor(Math.pow((seed % 10000) / 10000, 3) * 6800) + Number(liked),
        liked,
        date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`,
        dateTime: date.toISOString(),
      };
    },
    toggle(key) {
      const next = { ...data, liked: { ...data.liked } };
      if (next.liked[key]) delete next.liked[key];
      else next.liked[key] = true;
      // 保存失败时不假装点赞已持久化。
      write(next);
      data = next;
    },
  };
}
