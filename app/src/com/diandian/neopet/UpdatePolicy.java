package com.diandian.neopet;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 检查更新的来源与版本校验（0.3.5，纯逻辑，不依赖 Android，便于测试）。
 *
 * 与 web/src/game/updatePolicy.ts 同规则：
 *  - 只认非 draft、非 prerelease 的发布；
 *  - 标签严格可比较：v?x.y.z（三段非负整数）；
 *  - 必须存在匹配 diandian-native-x.y.z.apk 的附件；
 *  - html_url / browser_download_url 必须是本仓库可信的 https GitHub 路径，
 *    拒绝伪造主机、其他仓库与路径穿越；
 *  - 数值比较版本，禁止把较低正式版误报为更新。 */
public final class UpdatePolicy {
    public static final String OWNER = "JiayuStudio";
    public static final String REPO = "stepx-neo-pet";
    public static final String RELEASES_LATEST_API =
        "https://api.github.com/repos/" + OWNER + "/" + REPO + "/releases/latest";
    public static final String RELEASES_PAGE_URL =
        "https://github.com/" + OWNER + "/" + REPO + "/releases";
    private static final String TRUSTED_ORIGIN = "https://github.com";
    private static final Pattern TAG = Pattern.compile("^v?(\\d+)\\.(\\d+)\\.(\\d+)$");
    /* 以下路径均为仓库相对（trustedRepoPath 的返回值口径）：/releases/... */
    private static final Pattern RELEASE_TAG_PATH =
        Pattern.compile("^/releases/tag/(v?\\d+\\.\\d+\\.\\d+)$");
    private static final Pattern RELEASE_DOWNLOAD_PATH = Pattern.compile(
        "^/releases/download/(v?\\d+\\.\\d+\\.\\d+)/diandian-native-(\\d+)\\.(\\d+)\\.(\\d+)\\.apk$");
    private static final String HTML_PATH_PREFIX = "/releases/tag/";
    private static final String DOWNLOAD_PATH_PREFIX = "/releases/download/";

    private UpdatePolicy() {}

    /** 严格可比较的标签：v?x.y.z；其余一律 null */
    public static int[] parseTag(String tag) {
        if (tag == null) return null;
        Matcher m = TAG.matcher(tag);
        if (!m.matches()) return null;
        try {
            int[] v = {Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3))};
            for (int part : v) if (part < 0 || part > 999999) return null;
            return v;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** >0 表示 a 更新 */
    public static int compare(int[] a, int[] b) {
        for (int i = 0; i < 3; i++) {
            int c = Integer.compare(a[i], b[i]);
            if (c != 0) return c;
        }
        return 0;
    }

    public static boolean isNewer(String current, String latest) {
        int[] c = parseTag(current), l = parseTag(latest);
        if (c == null || l == null) return false;
        return compare(l, c) > 0;
    }

    public static String formatVersion(int[] v) {
        return v[0] + "." + v[1] + "." + v[2];
    }

    /** 期望的 APK 附件名：diandian-native-x.y.z.apk */
    public static String apkAssetName(int[] v) {
        return "diandian-native-" + formatVersion(v) + ".apk";
    }

    /** 收紧解析：必须精确是 https://github.com/<owner>/<repo>/... 下的路径。
     *  拒绝 userinfo、显式端口、query、fragment、反斜杠、百分号编码与 dot segment。 */
    private static String trustedRepoPath(String url) {
        if (url == null || !url.startsWith(TRUSTED_ORIGIN + "/")) return null;
        if (url.contains("\\")) return null;
        String rest = url.substring(TRUSTED_ORIGIN.length()); // 以 / 开头
        String repoPrefix = "/" + OWNER + "/" + REPO;
        if (!rest.startsWith(repoPrefix)) return null;
        String path = rest.substring(repoPrefix.length());
        int query = path.indexOf('?'), hash = path.indexOf('#');
        if (query >= 0 || hash >= 0) return null; // 拒 query / fragment
        path = query >= 0 ? path.substring(0, query) : hash >= 0 ? path.substring(0, hash) : path;
        if (!path.startsWith("/")) return null;
        if (path.contains("%")) return null; // 拒百分号编码路径
        for (String segment : path.split("/")) {
            if (segment.equals(".") || segment.equals("..")) return null; // 拒 dot segment
        }
        return path;
    }

    public static boolean isTrustedHtmlUrl(String url, String tag) {
        if (!TAG.matcher(tag == null ? "" : tag).matches()) return false;
        String path = trustedRepoPath(url);
        return path != null && path.equals(HTML_PATH_PREFIX + tag);
    }

    public static boolean isTrustedApkUrl(String url, String tag, int[] version) {
        if (!TAG.matcher(tag == null ? "" : tag).matches()) return false;
        String path = trustedRepoPath(url);
        return path != null && path.equals(DOWNLOAD_PATH_PREFIX + tag + "/" + apkAssetName(version));
    }

    /** 打开发布页（原生桥 openExternal）：只放行 releases 首页 / tag 页 / 对应 APK 下载链接 */
    public static boolean isTrustedReleaseUrl(String url) {
        String path = trustedRepoPath(url);
        if (path == null) return false;
        if (path.equals("/releases")) return true;
        if (RELEASE_TAG_PATH.matcher(path).matches()) return true;
        Matcher download = RELEASE_DOWNLOAD_PATH.matcher(path);
        if (!download.matches()) return false;
        String tagVersion = download.group(1).replaceFirst("^v", "");
        String fileVersion = download.group(2) + "." + download.group(3) + "." + download.group(4);
        return tagVersion.equals(fileVersion);
    }
}
