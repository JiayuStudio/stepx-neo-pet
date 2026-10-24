package com.diandian.neopet;

/** UpdatePolicy 的纯逻辑回归（JDK 可直接编译运行，不依赖 Android / org.json）。
 *  与 tools/test-update.mjs（TS 同规则）覆盖同一组判定。 */
public class UpdatePolicyTest {
    private static int checks = 0;

    private static void check(boolean value, String message) {
        if (!value) throw new AssertionError(message);
        checks++;
    }

    public static void main(String[] args) {
        // 标签严格性
        check(UpdatePolicy.parseTag("v0.3.4") != null, "v-prefixed tag accepted");
        check(UpdatePolicy.parseTag("0.3.4") != null, "bare tag accepted");
        check(UpdatePolicy.parseTag("v1.2") == null, "two-part tag rejected");
        check(UpdatePolicy.parseTag("1.2.3.4") == null, "four-part tag rejected");
        check(UpdatePolicy.parseTag("v1.2.x") == null, "non-numeric tag rejected");
        check(UpdatePolicy.parseTag("") == null, "empty tag rejected");
        check(UpdatePolicy.parseTag(null) == null, "null tag rejected");
        check(UpdatePolicy.parseTag("release-0.3.4") == null, "junk-prefixed tag rejected");
        check(UpdatePolicy.parseTag("v0.3.4-beta") == null, "suffixed tag rejected");

        // 数值比较（禁止降级误报）
        check(UpdatePolicy.compare(new int[]{0, 3, 10}, new int[]{0, 3, 9}) > 0, "0.3.10 newer than 0.3.9");
        check(UpdatePolicy.compare(new int[]{0, 3, 9}, new int[]{0, 3, 10}) < 0, "0.3.9 older than 0.3.10");
        check(UpdatePolicy.compare(new int[]{0, 3, 4}, new int[]{0, 3, 4}) == 0, "same version equal");
        check(UpdatePolicy.compare(new int[]{1, 0, 0}, new int[]{0, 99, 99}) > 0, "major dominates");
        check(UpdatePolicy.isNewer("0.3.4", "0.3.5"), "0.3.5 is newer");
        check(!UpdatePolicy.isNewer("0.3.5", "0.3.4"), "older release is not an update");
        check(!UpdatePolicy.isNewer("0.3.4", "0.3.4"), "same release is not an update");
        check(UpdatePolicy.apkAssetName(new int[]{0, 3, 5}).equals("diandian-native-0.3.5.apk"), "apk asset name pattern");

        // 可信 URL：本仓库 https GitHub 路径，其余拒绝
        String html = "https://github.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.5";
        String apk = "https://github.com/JiayuStudio/stepx-neo-pet/releases/download/v0.3.5/diandian-native-0.3.5.apk";
        String repo = "https://github.com/JiayuStudio/stepx-neo-pet";
        check(UpdatePolicy.isTrustedHtmlUrl(html, "v0.3.5"), "trusted html url");
        check(!UpdatePolicy.isTrustedHtmlUrl("https://github.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.4", "v0.3.5"), "html tag mismatch rejected");
        check(!UpdatePolicy.isTrustedHtmlUrl("https://evil.example.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.5", "v0.3.5"), "html fake host rejected");
        check(!UpdatePolicy.isTrustedHtmlUrl("https://github.com/other-owner/stepx-neo-pet/releases/tag/v0.3.5", "v0.3.5"), "html other repo rejected");
        check(!UpdatePolicy.isTrustedHtmlUrl("https://github.com/JiayuStudio/stepx-neo-pet/releases/tag/../v0.3.5", "v0.3.5"), "html path traversal rejected");
        check(UpdatePolicy.isTrustedApkUrl(apk, "v0.3.5", new int[]{0, 3, 5}), "trusted apk url");
        check(!UpdatePolicy.isTrustedApkUrl(apk, "v0.3.5", new int[]{0, 3, 4}), "apk version mismatch rejected");
        check(!UpdatePolicy.isTrustedApkUrl("http://github.com/JiayuStudio/stepx-neo-pet/releases/download/v0.3.5/diandian-native-0.3.5.apk", "v0.3.5", new int[]{0, 3, 5}), "apk plain http rejected");
        check(!UpdatePolicy.isTrustedApkUrl("https://evil.example.com/diandian-native-0.3.5.apk", "v0.3.5", new int[]{0, 3, 5}), "apk fake host rejected");
        check(UpdatePolicy.isTrustedReleaseUrl(repo + "/releases"), "releases index trusted");
        check(!UpdatePolicy.isTrustedReleaseUrl("javascript:alert(1)"), "javascript url rejected");
        check(!UpdatePolicy.isTrustedReleaseUrl("https://evil.example.com/x"), "untrusted host rejected");

        // URL 收紧：userinfo / 端口 / query / fragment / 反斜杠 / 编码 / dotsegment
        check(!UpdatePolicy.isTrustedHtmlUrl("https://user@github.com/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.5", "v0.3.5"), "userinfo rejected");
        check(!UpdatePolicy.isTrustedHtmlUrl("https://github.com:8443/JiayuStudio/stepx-neo-pet/releases/tag/v0.3.5", "v0.3.5"), "explicit port rejected");
        check(!UpdatePolicy.isTrustedHtmlUrl(repo + "/releases/tag/v0.3.5?x=1", "v0.3.5"), "query rejected");
        check(!UpdatePolicy.isTrustedHtmlUrl(repo + "/releases/tag/v0.3.5#top", "v0.3.5"), "fragment rejected");
        check(!UpdatePolicy.isTrustedHtmlUrl("https://github.com\\JiayuStudio/stepx-neo-pet/releases/tag/v0.3.5", "v0.3.5"), "backslash rejected");
        check(!UpdatePolicy.isTrustedHtmlUrl(repo + "/releases/tag/v0.3.5%2e", "v0.3.5"), "percent-encoded path rejected");
        check(!UpdatePolicy.isTrustedHtmlUrl(repo + "/releases/./tag/v0.3.5", "v0.3.5"), "dot segment rejected");
        check(!UpdatePolicy.isTrustedHtmlUrl(repo + "/releases/../evil/tag/v0.3.5", "v0.3.5"), "dotdot segment rejected");
        check(!UpdatePolicy.isTrustedHtmlUrl(repo + "/releases/tag/latest", "v0.3.5"), "non-strict tag page rejected");
        check(!UpdatePolicy.isTrustedHtmlUrl(repo + "/releases/tag/v0.3", "v0.3.5"), "two-part tag page rejected");
        check(!UpdatePolicy.isTrustedReleaseUrl(repo + "/releases/tag/latest"), "releases open with non-strict tag rejected");
        check(!UpdatePolicy.isTrustedReleaseUrl(repo + "/releases/anything-else"), "arbitrary releases subpath rejected");
        check(!UpdatePolicy.isTrustedReleaseUrl(repo + "/releases/download/v0.3.5/diandian-native-0.3.4.apk"), "download tag/file version mismatch rejected");
        check(UpdatePolicy.isTrustedReleaseUrl(repo + "/releases/tag/v0.3.5"), "strict tag page accepted");
        check(UpdatePolicy.isTrustedReleaseUrl(repo + "/releases/download/v0.3.5/diandian-native-0.3.5.apk"), "matching download accepted");

        System.out.println(checks + " UpdatePolicy (java) checks passed");
    }
}
