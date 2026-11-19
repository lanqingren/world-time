// One menu for both the right click on the clock and the menu bar (macOS) / tray (Windows) icon.
import { invoke } from "@tauri-apps/api/core";
import { CheckMenuItem, Menu, MenuItem } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { SCALES, STYLES, type Appearance, type Settings } from "../core/settings";

export interface MenuHost {
  settings: Settings;
  header(): string; // 纽约 21:47
  visible(): boolean;
  change<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>;
  openPicker(): void;
  toggleVisible(): Promise<void>;
  autostart: { enabled(): Promise<boolean>; set(on: boolean): Promise<void> };
  quit(): void;
}

export interface ClockMenu {
  popup(): Promise<void>;
  refresh(): Promise<void>;
}

const APPEARANCES: { value: Appearance; name: string }[] = [
  { value: "system", name: "跟随系统" },
  { value: "light", name: "浅色" },
  { value: "dark", name: "深色" },
];

export async function createMenu(host: MenuHost): Promise<ClockMenu> {
  const s = host.settings;

  // check items that behave like radio buttons
  async function group<K extends keyof Settings>(key: K, options: { value: Settings[K]; name: string }[]) {
    const items = await Promise.all(
      options.map((o) => CheckMenuItem.new({ text: o.name, checked: s[key] === o.value, action: () => void host.change(key, o.value) })),
    );
    const sync = () => Promise.all(items.map((item, i) => item.setChecked(s[key] === options[i].value)));
    return { items, sync };
  }
  const toggle = (key: "seconds" | "hour12" | "clickThrough", text: string) =>
    CheckMenuItem.new({ text, checked: s[key], action: () => void host.change(key, !s[key]) });

  const header = await MenuItem.new({ text: host.header(), enabled: false });
  const style = await group("style", STYLES.map((x) => ({ value: x.id, name: x.name })));
  const appearance = await group("appearance", APPEARANCES);
  const scale = await group("scale", SCALES);
  const seconds = await toggle("seconds", "显示秒");
  const hour12 = await toggle("hour12", "12 小时制");
  const through = await toggle("clickThrough", "鼠标穿透（再打开一次本程序可关掉）");
  const autostart: CheckMenuItem = await CheckMenuItem.new({
    text: "开机自动启动",
    checked: await host.autostart.enabled().catch(() => false),
    action: async () => {
      const on = !(await host.autostart.enabled().catch(() => false));
      await host.autostart.set(on).catch(console.error);
      await autostart.setChecked(await host.autostart.enabled().catch(() => on));
    },
  });
  const visibility = await MenuItem.new({ text: "隐藏时钟", action: () => void host.toggleVisible() });

  const menu = await Menu.new({
    items: [
      header,
      { item: "Separator" },
      { text: "换城市…", action: () => host.openPicker() },
      { text: "样式", items: style.items },
      { text: "外观", items: appearance.items },
      { text: "大小", items: scale.items },
      { item: "Separator" },
      seconds,
      hour12,
      { item: "Separator" },
      through,
      autostart,
      { item: "Separator" },
      visibility,
      { text: "退出", action: () => host.quit() },
    ],
  });
  await (await TrayIcon.getById("main"))?.setMenu(menu);

  return {
    // not menu.popup(): that keeps a lock until the menu closes and the minute refresh deadlocks on it
    popup: () => invoke("popup_menu", { rid: menu.rid }),
    async refresh() {
      await Promise.all([
        header.setText(host.header()),
        style.sync(),
        appearance.sync(),
        scale.sync(),
        seconds.setChecked(s.seconds),
        hour12.setChecked(s.hour12),
        through.setChecked(s.clickThrough),
        visibility.setText(host.visible() ? "隐藏时钟" : "显示时钟"),
      ]);
    },
  };
}
