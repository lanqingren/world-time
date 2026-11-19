import type { ViewState } from "../clock/view";
import { cityById, cityForTz } from "./cities";
import { sunInfo } from "./sun";
import { dayWord, diffText, periodZh, systemTz, weekdayZh, zoneParts } from "./time";

export interface Target {
  tz: string;
  name: string;
  lat: number;
  lon: number;
  follow: boolean; // following the computer's own time zone
}

export function resolveTarget(cityId: string | null): Target {
  const c = cityById(cityId);
  if (c) return { tz: c.tz, name: c.zh, lat: c.lat, lon: c.lon, follow: false };
  const tz = systemTz();
  const local = cityForTz(tz);
  const offset = zoneParts(tz, new Date()).offsetMin;
  return { tz, name: local?.zh ?? "本地", lat: local?.lat ?? 30, lon: local?.lon ?? offset / 4, follow: true };
}

export function makeState(at: Date, t: Target, opts: { hour12: boolean; seconds: boolean }): ViewState {
  const localTz = systemTz();
  const parts = zoneParts(t.tz, at);
  const lp = t.tz === localTz ? parts : zoneParts(localTz, at);
  const dw = dayWord(parts, lp);
  const weekday = (dw ? `${dw} ` : "") + weekdayZh(parts);
  const isLocal = t.follow || t.tz === localTz;
  const sub = isLocal
    ? `${weekday} · ${parts.month}月${parts.day}日`
    : `${weekday} · ${diffText(parts.offsetMin - lp.offsetMin, cityForTz(localTz)?.zh ?? "本地")}`;
  return {
    at,
    parts,
    hour12: opts.hour12,
    seconds: opts.seconds,
    city: t.name,
    weekday,
    period: periodZh(parts.hour),
    sub,
    sun: sunInfo(at, t.lat, t.lon),
  };
}
