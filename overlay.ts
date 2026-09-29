/** 只拦截浮层向宿主泄漏的滚动，不修改宿主的 overflow、宽度或滚动位置。 */
export function containOverlayScroll(root: HTMLElement) {
  if (root.dataset.scrollContained === 'true') return;
  root.dataset.scrollContained = 'true';
  const view = root.ownerDocument.defaultView!;
  const canScroll = (target: EventTarget | null, dx: number, dy: number) => {
    let node = target as HTMLElement | null;
    while (node && root.contains(node)) {
      if (node.nodeType === 1) {
        const css = view.getComputedStyle(node);
        const horizontal = Math.abs(dx) > Math.abs(dy);
        const delta = horizontal ? dx : dy;
        const overflow = horizontal ? css.overflowX : css.overflowY;
        const position = horizontal ? node.scrollLeft : node.scrollTop;
        const limit = horizontal ? node.scrollWidth - node.clientWidth : node.scrollHeight - node.clientHeight;
        if (
          /auto|scroll/.test(overflow) &&
          limit > 1 &&
          ((delta < 0 && position > 0) || (delta > 0 && position < limit - 1))
        )
          return true;
      }
      if (node === root) break;
      node = node.parentElement;
    }
    return false;
  };
  let x = 0;
  let y = 0;
  root.addEventListener(
    'touchstart',
    event => {
      x = event.touches[0]?.clientX ?? 0;
      y = event.touches[0]?.clientY ?? 0;
    },
    { passive: true },
  );
  root.addEventListener(
    'touchmove',
    event => {
      // 保留双指缩放；只隔离单指滚动。
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = x - touch.clientX;
      const dy = y - touch.clientY;
      x = touch.clientX;
      y = touch.clientY;
      if ((dx || dy) && !canScroll(event.target, dx, dy) && event.cancelable) event.preventDefault();
    },
    { passive: false },
  );
  root.addEventListener(
    'wheel',
    event => {
      if (event.ctrlKey) return;
      if (!canScroll(event.target, event.deltaX, event.deltaY) && event.cancelable) event.preventDefault();
    },
    { passive: false },
  );
}
