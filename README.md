# World Time

悬浮在桌面上的时钟，Windows 和 macOS 都能用。只显示一个城市，有 5 套样式：玻璃、指针、翻页、天空、纯文字。深色、浅色默认跟随系统。

![5 套样式](design/real-app-styles.jpg)

## 下载

- Windows：到 [Releases](https://github.com/lanqingren/world-time/releases) 下载 `World Time_<版本>_x64-setup.exe`，双击安装。
- macOS：目前在本地打包，见下面“打包”。

## 用法

- 右键时钟：换城市、样式、外观、大小、显示秒、12 小时制、鼠标穿透、开机自动启动、隐藏、退出。菜单栏（Windows 是任务栏右下角）的图标里也有同一个菜单。
- 按住时钟拖动，位置会记住。
- 开了鼠标穿透或者把时钟隐藏了，再打开一次程序就能恢复。

## 打包

- macOS：`pnpm install`，然后 `pnpm tauri build --bundles app`。
- Windows：推一个 `v*` 标签（例如 `v0.1.0`），GitHub Actions 会打好安装包并发到 Releases。

数字字体用的是 [Geist](https://github.com/vercel/geist-font)（SIL Open Font License 1.1，见 `src/assets/fonts/OFL.txt`）。城市的中英文名来自 [Unicode CLDR](https://cldr.unicode.org/)（Unicode License v3），坐标来自 [IANA 时区数据库](https://www.iana.org/time-zones)，由 `scripts/build_cities.py` 生成。
