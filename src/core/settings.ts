import { load, type Store } from "@tauri-apps/plugin-store";

export type StyleId = "glass" | "analog" | "flip" | "sky" | "bare";
export type Appearance = "system" | "light" | "dark";

export interface Settings {
  cityId: string | null; // null: follow the computer's time zone
  style: StyleId;
  appearance: Appearance;
  scale: number;
  seconds: boolean;
  hour12: boolean;
  details: boolean; // the city and date beside the time; off, the clock shows only the time
  clickThrough: boolean;
  pos: { x: number; y: number } | null; // top-left of the clock, in points on macOS and pixels on Windows
}

export const DEFAULTS: Settings = {
  cityId: null,
  style: "glass",
  appearance: "system",
  scale: 1,
  seconds: false,
  hour12: false,
  details: false,
  clickThrough: false,
  pos: null,
};

export const STYLES: { id: StyleId; name: string }[] = [
  { id: "glass", name: "玻璃" },
  { id: "analog", name: "指针" },
  { id: "flip", name: "翻页" },
  { id: "sky", name: "天空" },
  { id: "bare", name: "纯文字" },
];

export const SCALES: { value: number; name: string }[] = [
  { value: 0.8, name: "小" },
  { value: 1, name: "中" },
  { value: 1.25, name: "大" },
  { value: 1.5, name: "特大" },
];

let store: Store | null = null;

export async function loadSettings(): Promise<Settings> {
  store = await load("settings.json", { defaults: {}, autoSave: 300 });
  const s: Settings = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    const v = await store.get(key);
    if (v !== undefined && v !== null) (s as unknown as Record<string, unknown>)[key] = v;
  }
  if (!STYLES.some((x) => x.id === s.style)) s.style = DEFAULTS.style;
  if (!SCALES.some((x) => x.value === s.scale)) s.scale = DEFAULTS.scale;
  return s;
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await store?.set(key, value);
}
