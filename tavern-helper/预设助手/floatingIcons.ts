// 实际显示 42px，128px 图标足够覆盖高分屏；原图保留用于设计修改。
import riyuexi from './icons/floating-icon.png?url';
import aurora from './icons/floating-icon-aurora.png?url';
import ivory from './icons/floating-icon-ivory.png?url';

export const floatingIcons = {
  riyuexi: { label: '日月西', url: riyuexi },
  aurora: { label: '极光海', url: aurora },
  ivory: { label: '象牙塔', url: ivory },
};

export type FloatingIcon = keyof typeof floatingIcons;

export function normalizeFloatingIcon(value: unknown): FloatingIcon {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(floatingIcons, value)
    ? (value as FloatingIcon)
    : 'riyuexi';
}
