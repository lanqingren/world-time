import { hoursText } from "../core/time";
import type { SkyPhase } from "../core/sun";
import { el, setText, type ClockView, type ViewState } from "./view";

const PHASES: SkyPhase[] = ["day", "dawn", "dusk", "night"];
// star positions inside the 336×152 card, kept clear of the text on the left
const STARS = [
  [196, 18], [226, 46], [244, 14], [312, 64], [214, 92], [250, 78], [300, 104],
  [322, 20], [236, 124], [290, 132], [204, 60], [318, 128], [268, 104], [188, 116],
];
// the sun travels along a half circle: centre and radius in card pixels
const ARC = { cx: 256, cy: 124, r: 58 };

export function skyView(): ClockView {
  const root = el("div", "clock sky");
  const layers = {} as Record<SkyPhase, HTMLElement>;
  for (const p of PHASES) layers[p] = el("div", `sky-bg ${p}`);
  const stars = el("div", "s-stars");
  STARS.forEach(([x, y], i) => {
    const star = el("i", "s-star");
    star.style.left = `${x}px`;
    star.style.top = `${y}px`;
    star.style.animationDelay = `${(i * 0.73) % 4}s`;
    if (i % 5 === 0) star.classList.add("big");
    stars.appendChild(star);
  });
  root.append(...PHASES.map((p) => layers[p]), stars);
  root.insertAdjacentHTML(
    "beforeend",
    `<div class="s-arc"></div><div class="s-hz"></div><div class="s-sun"></div><div class="s-moon"></div>
     <div class="s-city"></div><div class="s-time num"><span class="s-ap"></span><span class="s-hm"></span><span class="s-ss"></span></div><div class="s-sub"></div>`,
  );
  const sun = root.querySelector<HTMLElement>(".s-sun")!;
  const city = root.querySelector(".s-city")!;
  const ap = root.querySelector(".s-ap")!;
  const hm = root.querySelector(".s-hm")!;
  const ss = root.querySelector<HTMLElement>(".s-ss")!;
  const sub = root.querySelector(".s-sub")!;
  let phase: SkyPhase | null = null;

  return {
    root,
    update(s: ViewState) {
      if (s.sun.phase !== phase) {
        phase = s.sun.phase;
        PHASES.forEach((p) => layers[p].classList.toggle("on", p === phase));
        root.dataset.phase = phase;
      }
      const f = s.sun.dayFrac;
      if (f === null) {
        sun.style.opacity = "0";
      } else {
        const a = Math.PI - f * Math.PI;
        sun.style.opacity = "1";
        sun.style.left = `${ARC.cx + ARC.r * Math.cos(a) - 14}px`;
        sun.style.top = `${ARC.cy - ARC.r * Math.sin(a) - 14}px`;
      }
      const t = hoursText(s.parts, s.hour12);
      root.classList.toggle("time-only", !s.details);
      setText(city, s.city);
      setText(ap, s.hour12 && !s.details ? t.ampm : "");
      setText(hm, `${t.hh}:${t.mm}`);
      ss.hidden = !s.seconds;
      if (s.seconds) setText(ss, t.ss);
      setText(sub, s.hour12 ? `${t.ampm} · ${s.sub}` : s.sub);
    },
  };
}
