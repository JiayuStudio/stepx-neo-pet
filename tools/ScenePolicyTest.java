package com.diandian.neopet;

/** MoriAppearance.scene 的纯逻辑回归（JDK 可直接编译运行，不依赖 Android）。
 *  与 web/src/game/matrixScene.ts 的 selectScene 覆盖同一组边界。 */
public class ScenePolicyTest {
    private static int checks = 0;

    private static void eq(String actual, String expected, String message) {
        if (!actual.equals(expected)) throw new AssertionError(message + " → " + actual + " (expected " + expected + ")");
        checks++;
    }

    public static void main(String[] args) {
        // 死亡优先
        eq(MoriAppearance.scene(0, 80, 80, 80, 80), "dead", "health 0 is dead");
        eq(MoriAppearance.scene(-5, 80, 80, 80, 80), "dead", "negative health is dead");
        // 健康 / 清洁低 → 生病
        eq(MoriAppearance.scene(20, 80, 80, 80, 80), "sick", "low health is sick");
        eq(MoriAppearance.scene(80, 80, 80, 80, 10), "sick", "low hygiene is sick");
        // 需求优先级
        eq(MoriAppearance.scene(80, 80, 10, 80, 80), "hungry", "low hunger is hungry");
        eq(MoriAppearance.scene(80, 80, 80, 10, 80), "unhappy", "low joy is unhappy");
        eq(MoriAppearance.scene(80, 10, 80, 80, 80), "sleep", "low energy is sleep");
        // 健康优先于饥饿 / 心情
        eq(MoriAppearance.scene(10, 80, 5, 5, 80), "sick", "health wins over hunger and joy");
        eq(MoriAppearance.scene(80, 80, 5, 5, 10), "sick", "hygiene wins over hunger and joy");
        // 常态
        eq(MoriAppearance.scene(90, 90, 90, 90, 90), "happy", "all high is happy");
        eq(MoriAppearance.scene(60, 60, 60, 60, 60), "idle", "average below threshold is idle");
        eq(MoriAppearance.scene(30, 30, 30, 30, 30), "idle", "health 30 is not sick and average stays low");
        eq(MoriAppearance.scene(29.9, 80, 80, 80, 80), "sick", "health just below 30 is sick");
        eq(MoriAppearance.scene(80, 24, 80, 80, 80), "happy", "energy 24 is not sleep");
        eq(MoriAppearance.scene(80, 23.9, 80, 80, 80), "sleep", "energy just below 24 is sleep");
        eq(MoriAppearance.scene(80, 80, 28, 80, 80), "happy", "hunger 28 is not hungry");
        eq(MoriAppearance.scene(80, 80, 27.9, 80, 80), "hungry", "hunger just below 28 is hungry");
        eq(MoriAppearance.scene(80, 80, 80, 28, 80), "happy", "joy 28 is not unhappy");
        eq(MoriAppearance.scene(80, 80, 80, 27.9, 80), "unhappy", "joy just below 28 is unhappy");

        System.out.println(checks + " MoriAppearance scene checks passed");
    }
}
