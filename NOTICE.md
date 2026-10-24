# 开源来源和改动

## Tamagochi / Mori

- 来源：https://github.com/Tech-aficionado/Tamagochi---Open-Source-Game
- 固定提交：4ffa9c3de87d58d6b962a4d2fcd12c3fa5250c23；上游提交时间 2026-07-27。
- MIT，Copyright (c) 2026 Tamagochi contributors。原文保留于 `web/LICENSE`、`app/assets/LICENSE-mori.txt`。
- 实际运行：`vendor/mori-game/` 的六个未修改模块经转译进入 `app/assets/mori-engine.js`。`engine/` 替换浏览器状态宿主，原生层提供文件持久化，增加调用参数和剧情解锁检查。
- 实际复用并修改：App、PetScene、ActivityArcade、GrowthStudio、FirstRunTutorial、主题、音乐、CSS 和剧情展示。添加中文、手机导航和自动消失的反馈提示。PocketVault 改用 Android 文件选择器；传输格式和验证器仍来自上游。
- 前台 `game/store.ts` 是原生状态代理，不独立存档或后台计时。原始 Zustand store 位于 vendor 中，并由独立引擎执行。

## backscreen-toolbox

- 来源：https://github.com/stepx-advance/backscreen-toolbox/releases/tag/v1.1.0
- MIT。由 0.2.0 延续 `LockedDisplaySession`、`LockedDisplayPolicy` 与构建工具的复用；RearDisplay 为加入模式归还和异常恢复的适配。
- 许可全文：`app/assets/LICENSE-backscreen-toolbox.txt`。

## Rhino

- 版本 1.7.15.1，未修改；MPL-2.0。
- 对应源码：https://github.com/mozilla/rhino/tree/Rhino1_7_15_1_Release
- 可取得的对应源码也随源码包提供：`libs/rhino-1.7.15.1-sources.jar`。
- 许可全文：`app/assets/LICENSE-rhino.txt`；二进制哈希：`vendor/rhino.json`。

## 界面依赖与点阵资源

React、Three.js、Zustand、React Three Fiber、Drei 等版本、许可列于 `vendor/web-dependencies.json`，许可正文收录 `app/assets/THIRD-PARTY-NOTICES.txt`。为修复上游依赖问题，仅更新 fflate 兼容补丁版本，锁文件保留。

点点原有应用图标沿用 Studio 工程。正面角色及场景来自 Mori；0.3.2 的背屏点阵按照该角色的身体比例、五官、性格标记与饰品位置重新绘制，源文件为 `studio-art/mori.ts`。三种成长阶段、三种性格、四种穿戴状态及七种动作组合为 252 组动画。没有使用商业拓麻歌子角色或 ROM。
