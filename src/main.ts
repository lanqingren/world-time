// The floating clock window: sizes itself to the clock, remembers where it was put,
// and is driven from the right-click / menu bar menu.
import { invoke } from "@tauri-apps/api/core";
import { LogicalPosition, LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";
import { emitTo, listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { availableMonitors, Effect, EffectState, getCurrentWindow, primaryMonitor, type Monitor } from "@tauri-apps/api/window";
import { disable as autostartOff, enable as autostartOn, isEnabled as autostartEnabled } from "@tauri-apps/plugin-autostart";
import { createView, usesNativeGlass } from "./clock";
import type { ClockView } from "./clock/view";
import { isMac } from "./core/platform";
import { loadSettings, saveSetting, type Settings } from "./core/settings";
import { makeState, resolveTarget, type Target } from "./core/state";
import { hoursText, systemTz, zoneParts } from "./core/time";
import { createMenu, type ClockMenu } from "./ui/menu";

// room around the clock for its CSS shadow, in CSS px before scaling
const PAD = { t: 24, r: 32, b: 44, l: 32 };
// gap between the clock and the screen corner on first launch
const MARGIN = 20;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const win = getCurrentWindow();
const html = document.documentElement;
const stage = document.getElementById("stage")!;
const zoom = document.getElementById("zoom")!;
const dark = matchMedia("(prefers-color-scheme: dark)");

let s: Settings;
let target: Target;
let view: ClockView | null = null;
let menu: ClockMenu | null = null;
let shown = true;
let card: Rect | null = null; // the visible clock inside the window, CSS px

const nativeGlass = () => isMac && usesNativeGlass(s.style);
const pad = () => (nativeGlass() ? { t: 0, r: 0, b: 0, l: 0 } : PAD);

// ── screen coordinates ──────────────────────────────────────────────────────
// Points on macOS and pixels on Windows: the units each system lays its displays
// out in, so they stay consistent across monitors with different scaling.

function monitorRect(m: Monitor, workArea = false): Rect {
  const a = workArea && m.workArea ? m.workArea : m;
  const k = isMac ? m.scaleFactor : 1;
  return { x: a.position.x / k, y: a.position.y / k, w: a.size.width / k, h: a.size.height / k };
}

const inside = (r: Rect, x: number, y: number) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

async function windowOrigin(): Promise<{ x: number; y: number }> {
  const p = await win.outerPosition();
  if (!isMac) return p;
  const sf = await win.scaleFactor();
  return { x: p.x / sf, y: p.y / sf };
}

/** Screen units per CSS px. */
const unit = async () => (isMac ? 1 : await win.scaleFactor());

// ── size and place the window ───────────────────────────────────────────────

async function startSpot(c: Rect, k: number, mons: Rect[]): Promise<{ x: number; y: number }> {
  if (s.pos && mons.some((m) => inside(m, s.pos!.x + 10, s.pos!.y + 10))) return s.pos;
  const m = await primaryMonitor();
  const a = m ? monitorRect(m, true) : { x: 0, y: 0, w: 1440, h: 900 };
  return { x: a.x + a.w - (c.w + MARGIN) * k, y: a.y + MARGIN * k };
}

async function fit() {
  const box = stage.getBoundingClientRect();
  const p = pad();
  const z = s.scale;
  const next: Rect = { x: p.l * z, y: p.t * z, w: box.width - (p.l + p.r) * z, h: box.height - (p.t + p.b) * z };
  const k = await unit();
  const mons = (await availableMonitors()).map((m) => monitorRect(m));
  let x: number;
  let y: number;
  if (!card) {
    const spot = await startSpot(next, k, mons);
    x = spot.x - next.x * k;
    y = spot.y - next.y * k;
  } else {
    // keep the clock where it is: its right edge on the right half of a screen, otherwise its left edge
    const o = await windowOrigin();
    const left = o.x + card.x * k;
    const top = o.y + card.y * k;
    const w = card.w * k;
    const mon = mons.find((m) => inside(m, left + w / 2, top));
    const right = mon ? left + w / 2 > mon.x + mon.w / 2 : false;
    x = right ? left + w - (next.x + next.w) * k : left - next.x * k;
    y = top - next.y * k;
  }
  // and keep all of it on its screen, e.g. when a wider style starts where a narrower one was left
  const c: Rect = { x: x + next.x * k, y: y + next.y * k, w: next.w * k, h: next.h * k };
  const area = mons.find((m) => inside(m, c.x + c.w / 2, c.y + c.h / 2));
  if (area) {
    x += Math.min(Math.max(c.x, area.x), area.x + area.w - c.w) - c.x;
    y += Math.min(Math.max(c.y, area.y), area.y + area.h - c.h) - c.y;
  }
  card = next;
  await win.setSize(new LogicalSize(Math.ceil(box.width), Math.ceil(box.height)));
  await win.setPosition(isMac ? new LogicalPosition(x, y) : new PhysicalPosition(Math.round(x), Math.round(y)));
}

// fits never overlap, and a burst of changes ends in exactly one more fit
let fitting: Promise<void> | null = null;
let fitAgain = false;
function refit() {
  if (fitting) {
    fitAgain = true;
    return;
  }
  fitting = fit()
    .catch(console.error)
    .finally(() => {
      fitting = null;
      if (fitAgain) {
        fitAgain = false;
        refit();
      }
    });
}

let saveTimer = 0;
function rememberPlace() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    if (!card) return;
    const o = await windowOrigin();
    const k = await unit();
    s.pos = { x: Math.round(o.x + card.x * k), y: Math.round(o.y + card.y * k) };
    await saveSetting("pos", s.pos);
  }, 500);
}

// ── look ────────────────────────────────────────────────────────────────────

function applyTheme() {
  html.dataset.theme = s.appearance === "system" ? (dark.matches ? "dark" : "light") : s.appearance;
}

async function applyAppearance() {
  // the window's own appearance also decides whether the macOS glass is light or dark
  await win.setTheme(s.appearance === "system" ? null : s.appearance).catch(console.error);
  applyTheme();
}

async function applyEffects() {
  if (nativeGlass()) {
    await win.setEffects({ effects: [Effect.Popover], state: EffectState.Active, radius: 22 * s.scale });
    await win.setShadow(true);
  } else {
    await win.clearEffects();
    await win.setShadow(false);
  }
}

function mountView() {
  view?.destroy?.();
  view = createView(s.style);
  const p = pad();
  zoom.style.padding = `${p.t}px ${p.r}px ${p.b}px ${p.l}px`;
  zoom.replaceChildren(view.root);
  html.dataset.style = s.style;
  render();
}

function render() {
  view?.update(makeState(new Date(), target, { hour12: s.hour12, seconds: s.seconds }));
}

// ── changes from the menu and the city picker ───────────────────────────────

async function change<K extends keyof Settings>(key: K, value: Settings[K]) {
  s[key] = value;
  await saveSetting(key, value);
  switch (key) {
    case "cityId":
      target = resolveTarget(s.cityId);
      render();
      break;
    case "style":
      mountView();
      await applyEffects();
      break;
    case "appearance":
      await applyAppearance();
      break;
    case "scale":
      html.style.setProperty("--scale", String(s.scale));
      await applyEffects();
      break;
    case "seconds":
    case "hour12":
      render();
      break;
    case "clickThrough":
      await win.setIgnoreCursorEvents(s.clickThrough);
      break;
  }
  await menu?.refresh();
}

function header(): string {
  const t = hoursText(zoneParts(target.tz, new Date()), s.hour12);
  return `${target.name}  ${s.hour12 ? t.ampm + " " : ""}${t.hh}:${t.mm}`;
}

async function openPicker() {
  const payload = { cityId: s.cityId, appearance: s.appearance, hour12: s.hour12 };
  const open = await WebviewWindow.getByLabel("picker");
  if (open) {
    await emitTo("picker", "picker-open", payload);
    await open.setFocus();
    return;
  }
  // made on demand and closed after use, so it costs no memory the rest of the time
  new WebviewWindow("picker", {
    url: `picker.html#${encodeURIComponent(JSON.stringify(payload))}`,
    title: "换城市",
    width: 380,
    height: 500,
    center: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    visible: false,
    ...(isMac ? { titleBarStyle: "overlay" as const, hiddenTitle: true, transparent: true } : {}),
  });
}

async function toggleVisible() {
  shown = !shown;
  await (shown ? win.show() : win.hide());
  await menu?.refresh();
}

// ── clock ───────────────────────────────────────────────────────────────────

let minute = -1;
let tz = systemTz();
function tick() {
  const now = new Date();
  if (now.getMinutes() !== minute) {
    minute = now.getMinutes();
    // the computer may have moved to another time zone
    const sys = systemTz();
    if (sys !== tz) {
      tz = sys;
      target = resolveTarget(s.cityId);
    }
    menu?.refresh().catch(console.error);
  }
  render();
  setTimeout(tick, 1000 - (Date.now() % 1000) + 2);
}

async function boot() {
  s = await loadSettings();
  target = resolveTarget(s.cityId);
  html.dataset.glass = isMac ? "native" : "solid";
  html.style.setProperty("--scale", String(s.scale));
  await applyAppearance();
  mountView();
  await document.fonts.load('300 58px "Geist"').catch(() => {});
  await document.fonts.ready;
  await applyEffects();
  await fit();
  await win.show();
  if (s.clickThrough) await win.setIgnoreCursorEvents(true);

  dark.addEventListener("change", applyTheme);
  new ResizeObserver(refit).observe(stage);
  await win.onMoved(rememberPlace);
  await win.onScaleChanged(refit);
  await listen<{ id: string | null }>("city-chosen", ({ payload }) => void change("cityId", payload.id));
  // opening the app again is the way back when the clock is hidden or lets clicks through
  // and the menu bar icon is out of reach (e.g. tucked away by a menu bar organiser)
  await listen("reopen", async () => {
    if (!shown) await toggleVisible();
    if (s.clickThrough) await change("clickThrough", false);
  });

  stage.addEventListener("mousedown", (e) => {
    if (e.button === 0) win.startDragging().catch(console.error);
  });
  window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    menu?.popup().catch(console.error);
  });

  menu = await createMenu({
    settings: s,
    header,
    visible: () => shown,
    change,
    openPicker: () => void openPicker().catch(console.error),
    toggleVisible,
    autostart: { enabled: autostartEnabled, set: (on) => (on ? autostartOn() : autostartOff()) },
    quit: () => void invoke("quit"),
  });
  tick();
}

boot().catch(async (e) => {
  console.error(e);
  await win.show();
});
