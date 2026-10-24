# 拓麻歌子 · Neo 背屏电子宠物

让 STEPX Neo 背面的 17×23 点阵住进一只可以照料、成长和换装的小伙伴。正面是 Mori 3D 养成世界，背面是对应的像素形象，两边共用同一份进度。

![APP 图标](docs/app-icon.png)

**当前版本：0.3.7** · [下载 APK](https://github.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.7) · [更新记录](CHANGELOG.md) · [StepX Neo 研究所](https://github.com/JiayuStudio/stepx-neo-lab)

[![拓麻歌子宣传片](docs/promo-poster.png)](https://github.com/JiayuStudio/stepx-neo-pet/releases/download/v0.3.4/tamagochi-promo-60s.mp4)

[观看／下载 60 秒宣传片](https://github.com/JiayuStudio/stepx-neo-pet/releases/download/v0.3.4/tamagochi-promo-60s.mp4) · 竖屏动画演示，非真机实拍；配乐由 Suno 生成。

## 可以做什么

- 喂食、陪玩、洗澡、休息、拥抱和探索，照顾饱食、心情、清洁、精力与健康。
- 三个成长阶段、三种性格、五段回忆剧情和照料事件。
- 接星星、记忆信号两款小游戏，获得星屑，兑换饰品和房间摆件。
- 四个主题世界，JSON 存档导出与恢复。
- 新领养从蛋开始，经历裂纹、破壳与幼体；已有存档可继续使用。
- 星跃、方跃、芽灵、绒兔、焰狐、泡獭、眠鸮、角龙共8只原创宠物，可切换耳机。
- 每只15种场景、每段8帧，共120段基础动画；成长、性格、饰品与耳机外观同步。饥饿、不开心、生病、死亡均有独立动画。
- 手机导航避开状态栏，前台背屏预览与原生显示共用点阵数据。
- 原生前台服务负责养成计时和背屏逐帧输出；离开正面页面后仍可运行。通知和 App 内均有停止入口。

## 安装与开始陪伴

适用于带有兼容背屏接口的 STEPX Neo，最低 Android 14。其他手机的点阵硬件不在支持范围内。

1. 从 [v0.3.7 发布页](https://github.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.7) 下载 `diandian-native-0.3.7.apk`，按 Android 提示安装。已有同签名原生版可覆盖升级；升级前可在“存档”导出备份。
2. 打开“拓麻歌子”，允许通知，点“开启背屏”。一次只运行一个背屏播放器。
3. 打开“后台设置”，允许后台运行并关闭本应用的电池优化。
4. 把背屏朝上或竖直放置，保持无遮挡，锁屏观察动作是否继续。
5. 点“停止陪伴”会清除自定义画面并恢复之前的系统背屏模式。

游戏和存档离线运行，不需要账号或 API Key。检查更新会联网读取本仓库正式 Release，不需要账号；未申请摄像头、麦克风或定位权限。卸载前请导出存档。

## 锁屏后不动时

部分 Neo 固件会冻结后台进程，仅开启“允许后台运行”仍可能暂停动画。APK 无权自行更改这个系统策略。需要时，可在已授权的 ADB 连接下，为这个 App 单独加入 Neo 冻结例外：

```sh
adb shell dumpsys activity freeze whiteAdd com.diandian.neopet
adb shell dumpsys activity freeze whitelist
```

确认名单中出现包名后，正常打开 App，再开启背屏。若系统不支持命令或拒绝执行，请停止并检查固件兼容性。撤销此例外：

```sh
adb shell dumpsys activity freeze whiteRemove com.diandian.neopet
```

强行停止、重启或固件策略变化后可能需要重新打开 App。背屏朝下、省电、过热等系统条件也可能关闭实际发光。当前版本没有承诺永久后台存活，也不自动在开机后启动。

## 本版变化与验证

0.3.7 更换原创萌宠 APP 图标。界面采用暖纸色、彩色块、马克笔粗描边和硬阴影，保留八宠物、点阵动画、成长、饰品与耳机组合。修复回忆按钮的点击事件序列化问题。

APP 内“检查更新”读取本仓库最新正式 Release，比较版本并提供匹配的 APK 下载入口，不会自动安装。首版公开后及后续版本都会同步更新源与发布包。

本轮通过生产构建、原生构建、签名和更新策略检查。此前对八宠物120段动画做过结构检查，55,488帧逐像素比对通过；浏览器实际验证角色切换、六种照料、回忆打开/关闭、备份恢复，以及342px/390px布局。

0.3.7 的真机背屏、锁屏持续刷新、覆盖安装和长期耗电仍待验证。旧版的真机结果不替代本版验收。

## 从源码构建

需要 Node.js 22.18+ 或 24、Python 3、JDK 17+、Android SDK API 36 和 build-tools 36.0.0。配置 `JAVA_HOME` 与 `ANDROID_HOME`。

```sh
cd web
npm ci --ignore-scripts
npm run build
cd ..
node tools/build-engine.mjs
node tools/export-art.mjs
node tools/test-art.mjs
python3 tools/test-mori.py
python3 tools/build.py
```

APK 输出至 `artifacts/`。默认构建会在仓库旁的 `.private/diandian-android/` 生成自己的开发签名；自行构建的签名与发布 APK 不同，不能直接覆盖安装发布版。请先导出存档，或持续使用同一签名构建。发布签名可通过 `tools/build.py --release --keystore ... --ks-key-alias ... --ks-pass-env ...` 显式指定。

| 路径 | 内容 |
| --- | --- |
| `app/` | Android 原生服务、界面桥接、背屏接口和离线页面 |
| `web/src/` | React 界面、3D 场景与小游戏 |
| `vendor/mori-game/` | 保留的上游养成模块 |
| `engine/` | 独立于 WebView 的养成运行宿主 |
| `studio-art/mori.ts` | 可编辑的 17×23 点阵绘制与动画 |
| `tests/`、`tools/` | 验证与构建脚本 |

## 开源来源

实际复用 [Tamagochi / Mori](https://github.com/Tech-aficionado/Tamagochi---Open-Source-Game) 的养成模块、3D 场景、小游戏和界面，按 MIT 许可适配。背屏会话与构建工具基于 [backscreen-toolbox](https://github.com/stepx-advance/backscreen-toolbox)，养成脚本由未修改的 Rhino 运行。来源、固定版本和修改范围见 [NOTICE.md](NOTICE.md)。

本项目原创部分采用 [MIT 许可](LICENSE)，第三方代码与资源遵循各自许可。Rhino 的 MPL-2.0 许可和对应源码随仓库提供。项目未使用商业拓麻歌子角色或 ROM。
