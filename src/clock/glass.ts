import { hoursText } from "../core/time";
import { el, setText, MOON_SVG, SUN_SVG, type ClockView, type ViewState } from "./view";

export function glassView(): ClockView {
  const root = el(
    "div",
    "clock glass",
    `<div class="g-time num"><span class="g-ap"></span><span class="g-hm"></span><span class="g-ss"></span></div>
     <div class="g-meta"><div class="g-city"><span class="g-icon"></span><span class="g-name"></span></div><div class="g-sub"></div></div>`,
  );
  const ap = root.querySelector(".g-ap")!;
  const hm = root.querySelector(".g-hm")!;
  const ss = root.querySelector<HTMLElement>(".g-ss")!;
  const icon = root.querySelector(".g-icon")!;
  const name = root.querySelector(".g-name")!;
  const sub = root.querySelector(".g-sub")!;
  let day: boolean | null = null;

  return {
    root,
    update(s: ViewState) {
      const t = hoursText(s.parts, s.hour12);
      root.classList.toggle("time-only", !s.details);
      // with the time on its own, 上午/下午 goes in front of it
      setText(ap, s.hour12 && !s.details ? t.ampm : "");
      setText(hm, `${t.hh}:${t.mm}`);
      ss.hidden = !s.seconds;
      if (s.seconds) setText(ss, t.ss);
      setText(name, s.city);
      setText(sub, s.hour12 ? `${t.ampm} · ${s.sub}` : s.sub);
      if (day !== s.sun.isDay) {
        day = s.sun.isDay;
        icon.innerHTML = day ? SUN_SVG : MOON_SVG;
      }
    },
  };
}
