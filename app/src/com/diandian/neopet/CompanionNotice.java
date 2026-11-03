package com.diandian.neopet;

import android.Manifest;
import android.media.AudioManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;

/** 0.3.9 本地宠物消息的系统通知（完全离线）。
 *
 * 纪律：
 *  - 只用独立 NotificationChannel，声音关闭；震动只能通过独立 channel 表达，
 *    绝不直接调用 Vibrator 绕过系统勿扰 / 静音策略。
 *  - 系统勿扰 / 静音时由系统抑制；应用侧另有一层勿扰与频控（由引擎判定）。
 *  - 未授予 POST_NOTIFICATIONS 时不发送，页面提示设置路径，消息留在应用内。
 */
final class CompanionNotice {
    static final String CHANNEL_SILENT = "pet-messages";
    static final String CHANNEL_VIBRATE = "pet-messages-vibrate";
    private static final int MESSAGE_ID = 4102;

    private CompanionNotice() {}

    static void ensureChannels(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel silent = new NotificationChannel(CHANNEL_SILENT, "拓麻歌子消息（无声）", NotificationManager.IMPORTANCE_DEFAULT);
        silent.setDescription("宠物的早安、想念与照料提醒。无声音，遵守系统勿扰。");
        silent.setSound(null, null);
        silent.enableVibration(false);
        manager.createNotificationChannel(silent);

        NotificationChannel vibrate = new NotificationChannel(CHANNEL_VIBRATE, "拓麻歌子消息（轻震动）", NotificationManager.IMPORTANCE_DEFAULT);
        vibrate.setDescription("与无声消息相同，但允许一次轻震动；系统勿扰时仍会被抑制。");
        vibrate.setSound(null, null);
        vibrate.enableVibration(true);
        vibrate.setVibrationPattern(new long[]{0, 60});
        vibrate.setBypassDnd(false);
        manager.createNotificationChannel(vibrate);
    }

    /** 系统勿扰 / 静音：交给系统判定，不自行绕过 */
    static boolean systemQuiet(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return true;
        AudioManager audio = context.getSystemService(AudioManager.class);
        return manager.getCurrentInterruptionFilter() != NotificationManager.INTERRUPTION_FILTER_ALL
            || (audio != null && audio.getRingerMode() == AudioManager.RINGER_MODE_SILENT);
    }

    static boolean permitted(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        return context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            && manager != null && manager.areNotificationsEnabled();
    }

    static boolean permitted(Context context, boolean vibrate) {
        if (!permitted(context)) return false;
        NotificationChannel channel = context.getSystemService(NotificationManager.class)
            .getNotificationChannel(vibrate ? CHANNEL_VIBRATE : CHANNEL_SILENT);
        return channel != null && channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
    }

    static boolean post(Context context, String messageId, String title, String body, boolean vibrate) {
        if (!permitted(context, vibrate) || systemQuiet(context)) return false;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return false;
        PendingIntent open = PendingIntent.getActivity(
            context, 0, new Intent(context, MainActivity.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String channel = vibrate ? CHANNEL_VIBRATE : CHANNEL_SILENT;
        Notification notification = new Notification.Builder(context, channel)
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentTitle(title == null || title.isEmpty() ? "拓麻歌子" : title)
            .setContentText(body == null ? "" : body)
            .setStyle(new Notification.BigTextStyle().bigText(body == null ? "" : body))
            .setContentIntent(open)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setWhen(System.currentTimeMillis())
            .build();
        try {
            manager.notify(messageId == null ? "pet-message" : messageId, MESSAGE_ID, notification);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
