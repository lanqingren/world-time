// Wall-clock time in any IANA zone, using the OS time zone database through Intl.

export interface ZoneParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
  offsetMin: number; // UTC offset in minutes at this instant
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(tz, f);
  }
  return f;
}

export function zoneParts(tz: string, at: Date): ZoneParts {
  const p: Record<string, string> = {};
  for (const part of formatter(tz).formatToParts(at)) p[part.type] = part.value;
  const year = +p.year;
  const month = +p.month;
  const day = +p.day;
  const hour = +p.hour % 24;
  const minute = +p.minute;
  const second = +p.second;
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMin = Math.round((wall - Math.floor(at.getTime() / 1000) * 1000) / 60000);
  return { year, month, day, hour, minute, second, weekday: WEEKDAYS.indexOf(p.weekday), offsetMin };
}

export function systemTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidTz(tz: string): boolean {
  try {
    formatter(tz);
    return true;
  } catch {
    return false;
  }
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function weekdayZh(p: ZoneParts): string {
  return WEEK_ZH[p.weekday] ?? "";
}

/** 凌晨 / 早上 / 上午 / 中午 / 下午 / 晚上 */
export function periodZh(hour: number): string {
  if (hour < 5) return "凌晨";
  if (hour < 8) return "早上";
  if (hour < 12) return "上午";
  if (hour < 13) return "中午";
  if (hour < 18) return "下午";
  return "晚上";
}

export function hoursText(p: ZoneParts, hour12: boolean): { hh: string; mm: string; ss: string; ampm: string } {
  const h = hour12 ? ((p.hour + 11) % 12) + 1 : p.hour;
  return {
    hh: hour12 ? String(h) : pad2(h),
    mm: pad2(p.minute),
    ss: pad2(p.second),
    ampm: p.hour < 12 ? "上午" : "下午",
  };
}

/** "明天" / "昨天" / "" relative to the local calendar day. */
export function dayWord(target: ZoneParts, local: ZoneParts): string {
  const d = (Date.UTC(target.year, target.month - 1, target.day) - Date.UTC(local.year, local.month - 1, local.day)) / 86400000;
  return d === 1 ? "明天" : d === -1 ? "昨天" : "";
}

/** "比北京慢 13 小时" / "比北京快 2 小时 30 分" / "和北京时间一样" */
export function diffText(minutes: number, localName: string): string {
  if (minutes === 0) return `和${localName}时间一样`;
  const a = Math.abs(minutes);
  const h = Math.floor(a / 60);
  const m = a % 60;
  const amount = m ? (h ? `${h} 小时 ${m} 分` : `${m} 分钟`) : `${h} 小时`;
  return `比${localName}${minutes > 0 ? "快" : "慢"} ${amount}`;
}
