// Development page: every style in light and dark with fixed sample times, for visual checks
// in a normal browser (pnpm dev, then open /preview.html).
import { createView } from "./clock";
import type { StyleId } from "./core/settings";
import { cityById } from "./core/cities";
import { makeState, type Target } from "./core/state";

const at = new Date(Date.UTC(2026, 10, 18, 13, 47, 32));
const target = (id: string): Target => {
  const c = cityById(id)!;
  return { tz: c.tz, name: c.zh, lat: c.lat, lon: c.lon, follow: false };
};

const cells: { style: StyleId; wall: string; tag: string; items: [string, "light" | "dark", boolean][] }[] = [
  { style: "glass", wall: "w1", tag: "A 玻璃", items: [["America/New_York", "dark", false], ["Europe/London", "light", true]] },
  { style: "analog", wall: "w2", tag: "B 指针", items: [["America/New_York", "light", true], ["Europe/London", "dark", true]] },
  { style: "flip", wall: "w3", tag: "C 翻页", items: [["America/New_York", "dark", false], ["Australia/Sydney", "light", false]] },
  { style: "sky", wall: "w4", tag: "D 天空", items: [["America/New_York", "light", false], ["Australia/Sydney", "dark", false]] },
  { style: "bare", wall: "w5", tag: "E 纯文字", items: [["America/New_York", "dark", false]] },
  { style: "sky", wall: "w4", tag: "D 天空 · 晨昏", items: [["America/Los_Angeles", "light", false], ["Asia/Kolkata", "dark", false]] },
];

const grid = document.getElementById("grid")!;
for (const c of cells) {
  const cell = document.createElement("div");
  cell.className = `cell ${c.wall}`;
  cell.innerHTML = `<div class="tag">${c.tag}</div>`;
  for (const [id, theme, seconds] of c.items) {
    const wrap = document.createElement("div");
    wrap.dataset.glass = "emu";
    wrap.dataset.theme = theme;
    const view = createView(c.style);
    wrap.appendChild(view.root);
    cell.appendChild(wrap);
    const when = id === "America/Los_Angeles" ? new Date(Date.UTC(2026, 10, 18, 14, 40, 5)) : id === "Asia/Kolkata" ? new Date(Date.UTC(2026, 10, 18, 11, 58, 5)) : at;
    view.update(makeState(when, target(id), { hour12: false, seconds }));
    // freeze the analog hands at the sample time
    document.getAnimations().forEach((a) => a.pause());
  }
  grid.appendChild(cell);
}
