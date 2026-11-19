import type { SunInfo } from "../core/sun";
import type { ZoneParts } from "../core/time";

export interface ViewState {
  at: Date;
  parts: ZoneParts;
  hour12: boolean;
  seconds: boolean;
  city: string; // 纽约
  weekday: string; // 周三, or 明天 周四
  period: string; // 上午 / 晚上 ...
  sub: string; // 周三 · 比北京慢 13 小时
  sun: SunInfo;
}

export interface ClockView {
  root: HTMLElement;
  update(s: ViewState): void;
  destroy?(): void;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

/** Only touch the DOM when the text really changes. */
export function setText(node: Element, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

export const SUN_SVG =
  '<svg viewBox="0 0 16 16" class="ico sun"><circle cx="8" cy="8" r="3.4"/><path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M3.2 12.8l1.1-1.1M11.7 4.3l1.1-1.1"/></svg>';
export const MOON_SVG = '<svg viewBox="0 0 16 16" class="ico moon"><path d="M10.9 1.6a6.4 6.4 0 1 0 3.5 10.6A5.2 5.2 0 0 1 10.9 1.6z"/></svg>';
