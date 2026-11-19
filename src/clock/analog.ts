import { el, setText, type ClockView, type ViewState } from "./view";

const NS = "http://www.w3.org/2000/svg";
const SPIN = [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }];
let faces = 0; // gradient ids must be unique in the document

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element): SVGElementTagNameMap[K] {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  parent.appendChild(n);
  return n;
}

export function analogView(): ClockView {
  // the city sits under the dial rather than on it, where the hands would cover it for hours a day
  const root = el("div", "clock analog", `<div class="a-face"></div><div class="a-label"><b></b><em></em></div>`);
  const dial = root.querySelector<HTMLElement>(".a-face")!;
  const city = root.querySelector(".a-label b")!;
  const when = root.querySelector(".a-label em")!;
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 200 200");
  dial.appendChild(s);

  const defs = svg("defs", {}, s);
  const face = `face${++faces}`;
  const grad = svg("radialGradient", { id: face, cx: "50%", cy: "38%", r: "70%" }, defs);
  svg("stop", { offset: 0, class: "s0" }, grad);
  svg("stop", { offset: 1, class: "s1" }, grad);
  svg("circle", { cx: 100, cy: 100, r: 97, fill: `url(#${face})` }, s);
  svg("circle", { cx: 100, cy: 100, r: 96.5, class: "rim" }, s);
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const a = (i * 6 * Math.PI) / 180;
    const r1 = 88;
    const r2 = major ? 74 : 84;
    svg(
      "line",
      {
        class: major ? "tick major" : "tick minor",
        x1: 100 + r1 * Math.sin(a),
        y1: 100 - r1 * Math.cos(a),
        x2: 100 + r2 * Math.sin(a),
        y2: 100 - r2 * Math.cos(a),
        "stroke-width": major ? 3.2 : 1.1,
        "stroke-linecap": major ? "butt" : "round",
      },
      s,
    );
  }

  const hourHand = el("i", "a-hand a-h");
  const minuteHand = el("i", "a-hand a-m");
  const secondHand = el("i", "a-hand a-s");
  dial.append(hourHand, minuteHand, secondHand, el("i", "a-cap"));
  let sweep: Animation | null = null;
  let synced = "";

  return {
    root,
    update(st: ViewState) {
      const p = st.parts;
      const sec = p.second + st.at.getMilliseconds() / 1000;
      const min = p.minute + sec / 60;
      hourHand.style.transform = `rotate(${((p.hour % 12) + min / 60) * 30}deg)`;
      minuteHand.style.transform = `rotate(${min * 6}deg)`;
      secondHand.hidden = !st.seconds;
      if (st.seconds) {
        sweep ??= secondHand.animate(SPIN, { duration: 60000, iterations: Infinity });
        // re-align the sweep once a minute and whenever the zone changes
        const key = `${p.minute}/${p.offsetMin}`;
        if (key !== synced) {
          synced = key;
          sweep.currentTime = sec * 1000;
        }
      } else if (sweep) {
        sweep.cancel();
        sweep = null;
        synced = "";
      }
      setText(city, st.city);
      setText(when, `${st.weekday} · ${st.period}`);
    },
    destroy() {
      sweep?.cancel();
    },
  };
}
