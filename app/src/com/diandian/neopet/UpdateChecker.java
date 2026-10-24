package com.diandian.neopet;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;

/** 正式 Release 更新检查（0.3.5）：异步 HTTPS 请求 GitHub 公开 API，按 UpdatePolicy 校验。
 *  只做"用户主动检查 + 系统浏览器打开可信链接"，不做 APK 内下载 / 静默安装 / 后台自动检查。
 *  不依赖账户或令牌；不触碰 PetService 等后台链路。 */
public final class UpdateChecker {
    public interface Callback {
        void onResult(JSONObject result);
    }

    private static final int TIMEOUT_MS = 10_000;
    private static final int MAX_BODY = 2_000_000;
    private static final AtomicBoolean CHECKING = new AtomicBoolean(false);

    private UpdateChecker() {}

    /** 发起检查。检查中的重复调用返回 false（不发起第二次请求）。 */
    public static boolean check(Context context, String currentVersion, Callback callback) {
        if (!CHECKING.compareAndSet(false, true)) return false;
        new Thread(() -> {
            JSONObject result = errorResult(currentVersion, "检查未完成");
            try {
                result = evaluate(currentVersion);
            } catch (Exception e) {
                result = errorResult(currentVersion, "检查失败：" + safe(e.getMessage()));
            } finally {
                CHECKING.set(false);
                deliver(context, callback, result);
            }
        }, "neo-update-check").start();
        return true;
    }

    /** 请求 + 校验（测试或调试可直接调用）。 */
    static JSONObject evaluate(String currentVersion) throws Exception {
        int[] current = UpdatePolicy.parseTag(currentVersion);
        if (current == null) return errorResult(currentVersion, "当前版本号无法比较");

        HttpURLConnection connection = (HttpURLConnection) new URL(UpdatePolicy.RELEASES_LATEST_API).openConnection();
        try {
            // 总时长 deadline 从连接前起算：连接 + 响应头 + body 读取合计不超过 2×TIMEOUT_MS
            long deadline = android.os.SystemClock.elapsedRealtime() + TIMEOUT_MS * 2L;
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            // 不跟随重定向：3xx 直接按非 200 失败，避免被导向不可信地址
            connection.setInstanceFollowRedirects(false);
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Accept", "application/vnd.github+json");
            connection.setRequestProperty("User-Agent", "tamagochi-" + currentVersion + " update check");
            int code = connection.getResponseCode();
            if (code == 403 || code == 429) {
                return errorResult(currentVersion, "GitHub 访问受限（限流），请稍后重试");
            }
            if (code != 200) {
                return errorResult(currentVersion, "检查失败：GitHub 返回 HTTP " + code);
            }
            InputStream in = connection.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
                if (out.size() > MAX_BODY) throw new IOException("响应过大");
                // 读取 timeout 不超过剩余总时长；超限即失败
                long remaining = deadline - android.os.SystemClock.elapsedRealtime();
                if (remaining <= 0) throw new IOException("总时长超限");
                connection.setReadTimeout((int) Math.max(1000, Math.min(TIMEOUT_MS, remaining)));
            }
            in.close();
            return evaluatePayload(new JSONObject(out.toString(StandardCharsets.UTF_8.name())), current, currentVersion);
        } finally {
            connection.disconnect();
        }
    }

    static JSONObject evaluatePayload(JSONObject release, int[] current, String currentVersion) throws org.json.JSONException {
        // draft / prerelease 必须是原生布尔 false（Boolean.FALSE.equals：字符串 "false" 等一律按非正式拒绝）
        if (!Boolean.FALSE.equals(release.opt("draft")) || !Boolean.FALSE.equals(release.opt("prerelease"))) {
            return errorResult(currentVersion, "没有可用的正式版本（最新发布是草稿或预发布）");
        }
        int[] latest = UpdatePolicy.parseTag(release.optString("tag_name", null));
        if (latest == null) {
            return errorResult(currentVersion, "发布标签不是可比较的 x.y.z 版本");
        }
        String currentText = UpdatePolicy.formatVersion(current);
        // 无论版本高低，都先验证发布页与匹配的 APK 附件
        String wanted = UpdatePolicy.apkAssetName(latest);
        JSONArray assets = release.optJSONArray("assets");
        JSONObject asset = null;
        if (assets != null) {
            for (int i = 0; i < assets.length(); i++) {
                JSONObject item = assets.optJSONObject(i);
                if (item != null && wanted.equals(item.optString("name"))) {
                    asset = item;
                    break;
                }
            }
        }
        if (asset == null) {
            return errorResult(currentVersion, "正式版 " + UpdatePolicy.formatVersion(latest) + " 没有匹配的 " + wanted + " 附件");
        }
        String tag = release.optString("tag_name");
        String apkUrl = asset.optString("browser_download_url", null);
        String htmlUrl = release.optString("html_url", null);
        if (!UpdatePolicy.isTrustedApkUrl(apkUrl, tag, latest) || !UpdatePolicy.isTrustedHtmlUrl(htmlUrl, tag)) {
            return errorResult(currentVersion, "发布链接未通过可信校验，已停止");
        }
        int order = UpdatePolicy.compare(latest, current);
        if (order < 0) {
            return new JSONObject()
                .put("state", "latest")
                .put("current", currentText)
                .put("latest", UpdatePolicy.formatVersion(latest))
                .put("message", "当前版本高于公开版本 " + UpdatePolicy.formatVersion(latest) + "，不需要降级");
        }
        if (order == 0) {
            return new JSONObject()
                .put("state", "latest")
                .put("current", currentText)
                .put("latest", UpdatePolicy.formatVersion(latest))
                .put("message", "已是最新版本");
        }
        return new JSONObject()
            .put("state", "newer")
            .put("current", currentText)
            .put("latest", UpdatePolicy.formatVersion(latest))
            .put("htmlUrl", htmlUrl)
            .put("apkUrl", apkUrl)
            .put("message", "发现新版本 " + UpdatePolicy.formatVersion(latest));
    }

    /** 用系统浏览器打开可信的发布页 / 下载链接；不可信链接直接拒绝。 */
    public static void openExternal(Context context, String url) {
        if (!UpdatePolicy.isTrustedReleaseUrl(url)) {
            Toast.makeText(context, "链接未通过可信校验，已停止打开", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(context, "没有可用的浏览器：" + safe(e.getMessage()), Toast.LENGTH_LONG).show();
        }
    }

    private static JSONObject errorResult(String current, String message) {
        try {
            return new JSONObject().put("state", "error").put("current", current).put("message", message);
        } catch (org.json.JSONException e) {
            return new JSONObject();
        }
    }

    private static String safe(String message) {
        if (message == null || message.isEmpty()) return "未知原因";
        return message.length() > 120 ? message.substring(0, 120) : message;
    }

    private static void deliver(Context context, Callback callback, JSONObject result) {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                callback.onResult(result);
            } catch (Exception ignored) {
                // 页面已销毁等情况：结果丢弃即可，不影响检查本身
            }
        });
    }
}
