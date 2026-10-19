# Mori 点阵形象

`mori.ts` 是可编辑的 17×23 点阵绘制源，按 `web/src/scene/PetScene.tsx` 的实际模型转绘：单一圆身体、小尖耳、短手脚、腮红、胸前心形／菱形或头顶天线。蝴蝶结在左上方，嫩芽冠在头顶，月亮饰品在胸前右侧。

背屏是单色亮度矩阵，保留轮廓和位置特征，不复现正面的主题颜色。七种动作都有本体变化；成长阶段略微改变大小，性格与穿戴取自同一份原生存档。

```sh
node tools/export-art.mjs
node tools/test-art.mjs
python3 tools/test-appearance.py
```

生成文件为 `app/assets/pet-frames.json`，键名采用 `动作/成长阶段/性格/穿戴`。`idle` 是同角色的安全默认帧组。事件提示由原生层另行叠加，不参与本体动画是否有效的检查。
