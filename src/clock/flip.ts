import { hoursText } from "../core/time";
import { el, setText, type ClockView, type ViewState } from "./view";

interface Card {
  node: HTMLElement;
  value: string;
  set(v: string): void;
}

function card(): Card {
  const node = el(
    "div",
    "f-card num",
    `<div class="f-half f-top"><span></span></div><div class="f-half f-bot"><span></span></div>`,
  );
  const top = node.querySelector(".f-top span")!;
  const bot = node.querySelector(".f-bot span")!;
  let timer = 0;
  const c: Card = {
    node,
    value: "",
    set(v: string) {
      if (v === c.value) return;
      const old = c.value;
      c.value = v;
      if (!old || document.hidden) {
        top.textContent = v;
        bot.textContent = v;
        return;
      }
      // static halves: new value on top, old value below until the flap lands
      top.textContent = v;
      bot.textContent = old;
      node.querySelectorAll(".f-leaf").forEach((n) => n.remove());
      const leafTop = el("div", "f-leaf f-top", `<span>${old}</span>`);
      const leafBot = el("div", "f-leaf f-bot", `<span>${v}</span>`);
      node.append(leafTop, leafBot);
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        bot.textContent = c.value;
        leafTop.remove();
        leafBot.remove();
      }, 620);
    },
  };
  return c;
}

export function flipView(): ClockView {
  const root = el("div", "clock flip", `<div class="f-label"><b></b><em></em></div><div class="f-cards"></div>`);
  const name = root.querySelector(".f-label b")!;
  const info = root.querySelector(".f-label em")!;
  const cards = root.querySelector(".f-cards")!;
  const h = card();
  const m = card();
  const s = card();
  s.node.classList.add("f-sec");
  cards.append(h.node, m.node, s.node);
  // 上午/下午 in the corner of the hour card, as on a real flip clock, when there's no label
  const ap = el("i", "f-ap");
  h.node.append(ap);

  return {
    root,
    update(st: ViewState) {
      const t = hoursText(st.parts, st.hour12);
      root.classList.toggle("time-only", !st.details);
      setText(ap, st.hour12 && !st.details ? t.ampm : "");
      h.set(t.hh);
      m.set(t.mm);
      s.node.hidden = !st.seconds;
      if (st.seconds) s.set(t.ss);
      setText(name, st.city);
      setText(info, `${st.weekday} · ${st.hour12 ? t.ampm : st.period}`);
    },
  };
}
