// The "换城市" window: search the city list, pick one, and the clock follows it.
import { emitTo, listen } from "@tauri-apps/api/event";
import { Effect, getCurrentWindow } from "@tauri-apps/api/window";
import { cityById, cityForTz, searchCities, type City } from "./core/cities";
import { isMac } from "./core/platform";
import type { Appearance } from "./core/settings";
import { dayWord, hoursText, systemTz, zoneParts, type ZoneParts } from "./core/time";

interface OpenPayload {
  cityId: string | null;
  appearance: Appearance;
  hour12: boolean;
}

interface Row {
  id: string | null; // null: follow the computer
  tz: string;
  node: HTMLElement;
  time: HTMLElement;
}

const win = getCurrentWindow();
const html = document.documentElement;
const input = document.getElementById("q") as HTMLInputElement;
const list = document.getElementById("list")!;
const dark = matchMedia("(prefers-color-scheme: dark)");

let state: OpenPayload = { cityId: null, appearance: "system", hour12: false };
try {
  state = { ...state, ...JSON.parse(decodeURIComponent(location.hash.slice(1))) };
} catch {
  // opened without a payload: defaults are fine
}
let rows: Row[] = [];
let sel = 0;

function applyTheme() {
  html.dataset.theme = state.appearance === "system" ? (dark.matches ? "dark" : "light") : state.appearance;
}

function timeText(tz: string, now: Date, local: ZoneParts): string {
  const p = zoneParts(tz, now);
  const t = hoursText(p, state.hour12);
  const dw = dayWord(p, local);
  return `${dw ? dw + " " : ""}${state.hour12 ? t.ampm + " " : ""}${t.hh}:${t.mm}`;
}

function addRow(id: string | null, tz: string, name: string, detail: string) {
  const node = document.createElement("div");
  node.className = "row";
  const n = document.createElement("div");
  n.className = "n";
  const b = document.createElement("b");
  b.textContent = name;
  const span = document.createElement("span");
  span.textContent = detail;
  n.append(b, span);
  const time = document.createElement("div");
  time.className = "r";
  node.append(n, time);
  if (id === state.cityId) node.classList.add("cur");
  const i = rows.length;
  node.addEventListener("mousemove", () => select(i, false));
  node.addEventListener("click", () => void choose(i));
  list.appendChild(node);
  rows.push({ id, tz, node, time });
}

function render() {
  const q = input.value.trim();
  rows = [];
  list.replaceChildren();
  if (!q) {
    const tz = systemTz();
    addRow(null, tz, "跟随电脑时区", cityForTz(tz)?.zh ?? tz);
    // the chosen city first, then the popular ones
    const cur = cityById(state.cityId);
    if (cur) addRow(cur.id, cur.tz, cur.zh, place(cur));
  }
  for (const c of searchCities(q)) if (q || c.id !== state.cityId) addRow(c.id, c.tz, c.zh, place(c));
  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = `没有找到“${q}”`;
    list.appendChild(empty);
  }
  updateTimes();
  const cur = q ? -1 : rows.findIndex((r) => r.id === state.cityId);
  select(Math.max(cur, 0), true);
  list.scrollTop = 0;
}

const place = (c: City) => [c.cn, c.en !== c.zh ? c.en : ""].filter(Boolean).join(" · ");

function updateTimes() {
  const now = new Date();
  const local = zoneParts(systemTz(), now);
  for (const r of rows) r.time.textContent = timeText(r.tz, now, local);
}

function select(i: number, scroll: boolean) {
  if (!rows.length) return;
  sel = Math.min(Math.max(i, 0), rows.length - 1);
  rows.forEach((r, j) => r.node.classList.toggle("sel", j === sel));
  if (scroll) rows[sel].node.scrollIntoView({ block: "nearest" });
}

async function choose(i: number) {
  const r = rows[i];
  if (!r) return;
  await emitTo("main", "city-chosen", { id: r.id });
  await win.close();
}

input.addEventListener("input", render);
input.addEventListener("keydown", (e) => {
  if (e.isComposing) return; // typing pinyin: Enter and arrows belong to the input method
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    select(sel + (e.key === "ArrowDown" ? 1 : -1), true);
  } else if (e.key === "Enter") {
    e.preventDefault();
    void choose(sel);
  }
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !e.isComposing) void win.close();
});
dark.addEventListener("change", applyTheme);
setInterval(updateTimes, 10_000);

listen<OpenPayload>("picker-open", ({ payload }) => {
  state = payload;
  applyTheme();
  input.value = "";
  render();
  input.focus();
});

async function boot() {
  if (isMac) {
    html.dataset.mac = "";
    await win.setEffects({ effects: [Effect.Popover] }).catch(console.error);
  }
  await win.setTheme(state.appearance === "system" ? null : state.appearance).catch(console.error);
  applyTheme();
  render();
  await win.show();
  await win.setFocus();
  input.focus();
}

boot().catch(console.error);
