import data from "../data/cities.json";

export interface City {
  id: string;
  zh: string;
  en: string;
  tz: string;
  cc: string;
  cn: string; // country, Chinese
  ce: string; // country, English
  lat: number;
  lon: number;
  p: number; // popularity, higher first
  kw?: string;
}

export const CITIES = data as City[];

const byId = new Map(CITIES.map((c) => [c.id, c]));

export function cityById(id: string | null | undefined): City | undefined {
  return id ? byId.get(id) : undefined;
}

/** The city that stands for a zone: Beijing for Asia/Shanghai, otherwise the zone's own city. */
export function cityForTz(tz: string): City | undefined {
  if (tz === "Asia/Shanghai" || tz === "Asia/Chongqing" || tz === "Asia/Harbin" || tz === "PRC") return byId.get("Asia/Shanghai#beijing");
  return byId.get(tz) ?? CITIES.find((c) => c.tz === tz);
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s,.'’-]+/g, "");

const index = CITIES.map((c) => ({
  c,
  names: [c.zh, c.en, ...(c.kw ? c.kw.split(" ") : [])].map(norm),
  places: [c.cn, c.ce, c.tz.replace(/_/g, " ")].map(norm),
}));

export function searchCities(query: string, limit = 80): City[] {
  const q = norm(query);
  if (!q) return CITIES.filter((c) => c.p >= 2).slice(0, limit);
  const scored: { c: City; s: number }[] = [];
  for (const { c, names, places } of index) {
    let s = 0;
    for (const n of names) {
      if (n === q) s = Math.max(s, 100);
      else if (n.startsWith(q)) s = Math.max(s, 70);
      else if (n.includes(q)) s = Math.max(s, 40);
    }
    for (const n of places) {
      if (n === q) s = Math.max(s, 35);
      else if (n.startsWith(q)) s = Math.max(s, 25);
      else if (n.includes(q)) s = Math.max(s, 12);
    }
    if (s) scored.push({ c, s: s + c.p * 3 });
  }
  scored.sort((a, b) => b.s - a.s || a.c.zh.length - b.c.zh.length);
  return scored.slice(0, limit).map((x) => x.c);
}
