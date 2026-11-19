import { hoursText } from "../core/time";
import { el, setText, type ClockView, type ViewState } from "./view";

export function bareView(): ClockView {
  const root = el(
    "div",
    "clock bare",
    `<div class="b-time num"><span class="b-ap"></span><span class="b-hm"></span><span class="b-ss"></span></div><div class="b-line"><b></b><em></em></div>`,
  );
  const ap = root.querySelector(".b-ap")!;
  const hm = root.querySelector(".b-hm")!;
  const ss = root.querySelector<HTMLElement>(".b-ss")!;
  const name = root.querySelector(".b-line b")!;
  const info = root.querySelector(".b-line em")!;

  return {
    root,
    update(s: ViewState) {
      const t = hoursText(s.parts, s.hour12);
      root.classList.toggle("time-only", !s.details);
      setText(ap, s.hour12 && !s.details ? t.ampm : "");
      setText(hm, `${t.hh}:${t.mm}`);
      ss.hidden = !s.seconds;
      if (s.seconds) setText(ss, t.ss);
      setText(name, s.city);
      setText(info, ` · ${s.weekday} ${s.hour12 ? t.ampm : s.period} · ${s.sub.split(" · ").pop()}`);
    },
  };
}
