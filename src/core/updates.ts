// Updates come from the GitHub releases, whose latest.json lists the signed downloads. The clock
// looks a little after it starts and every few hours, and installs a new version without asking.
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

const FIRST_CHECK = 15_000; // ms after start
const EVERY = 6 * 3600_000;

export interface Updates {
  label(): string; // the menu line: 检查更新（当前 0.1.4）, 正在检查更新… ...
  run(): void; // check now
}

export async function startUpdates(changed: () => void): Promise<Updates> {
  const version = await getVersion();
  let label = `检查更新（当前 ${version}）`;
  let running = false;
  const say = (text: string) => {
    label = text;
    changed();
  };

  async function run() {
    if (running) return;
    running = true;
    let installing = false;
    say("正在检查更新…");
    try {
      const update = await check();
      if (!update) {
        say(`已是最新版本（${version}）`);
        return;
      }
      installing = true;
      say(`正在更新到 ${update.version}…`);
      await update.downloadAndInstall();
      // macOS swaps the app in place and starts it again here; on Windows the installer has
      // already closed the clock and opens the new one when it's done
      await relaunch();
    } catch (e) {
      console.error(e);
      say(installing ? "更新没装上，点这里重试" : "检查更新失败，点这里重试");
    } finally {
      running = false;
    }
  }

  setTimeout(run, FIRST_CHECK);
  setInterval(run, EVERY);
  return { label: () => label, run: () => void run() };
}
