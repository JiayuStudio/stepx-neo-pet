// Adapted from backscreen-toolbox v1.1.0; Copyright (c) 2026 STEPX Advance contributors. MIT.
package com.diandian.neopet;

import android.content.*;
import android.database.ContentObserver;
import android.hardware.*;
import android.os.*;
import android.provider.Settings;

/** Keeps non-wakeup direction sensors and animation responsive only during visible plugged use. */
final class LockedDisplaySession {
    private final Context context;
    private final Handler handler;
    private final PowerManager power;
    private final PowerManager.WakeLock wake;
    private final SensorManager sensors;
    private final Sensor face;
    private long renewAt;
    private boolean active,animated;
    private int postureValue=-1;
    private int thermal;
    private boolean featureEnabled=true;
    private boolean powerSave;
    private long lastSyncAt;
    private final SensorEventListener posture=new SensorEventListener(){
        public void onAccuracyChanged(Sensor sensor,int accuracy){}
        public void onSensorChanged(SensorEvent event){postureValue=Math.round(event.values[0]);sync();}
    };
    private final BroadcastReceiver screen=new BroadcastReceiver(){public void onReceive(Context c,Intent i){sync();}};
    private final ContentObserver settings;
    private final PowerManager.OnThermalStatusChangedListener heat=status->{thermal=status;sync();};
    private final Runnable renew=()->sync();
    LockedDisplaySession(Context c,Handler h) {
        context=c;handler=h;power=c.getSystemService(PowerManager.class);sensors=c.getSystemService(SensorManager.class);
        wake=power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"DiandianPet:rear-animation");wake.setReferenceCounted(false);
        thermal=power.getCurrentThermalStatus();power.addThermalStatusListener(c.getMainExecutor(),heat);
        // This vendor on-change sensor is wake-up only; the one-argument lookup
        // searches the non-wakeup variant for unknown vendor sensor types.
        face=sensors.getDefaultSensor(33172019,true);
        IntentFilter filter=new IntentFilter(Intent.ACTION_SCREEN_ON);filter.addAction(Intent.ACTION_SCREEN_OFF);filter.addAction(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED);
        c.registerReceiver(screen,filter,Context.RECEIVER_NOT_EXPORTED);
        settings=new ContentObserver(h){public void onChange(boolean self){sync();}};
        c.getContentResolver().registerContentObserver(Settings.System.getUriFor("stepos_back_screen_display"),false,settings);
        c.getContentResolver().registerContentObserver(Settings.System.getUriFor("stepos_back_screen_auto_rotate"),false,settings);
    }
    void setActive(boolean enabled,boolean moving){
        if(active==enabled&&animated==moving)return;
        if(active!=enabled&&face!=null){if(enabled)sensors.registerListener(posture,face,SensorManager.SENSOR_DELAY_NORMAL,handler);else{sensors.unregisterListener(posture);postureValue=-1;}}
        active=enabled;animated=moving;sync();
    }
    private void sync() {
        boolean feature=Settings.System.getInt(context.getContentResolver(),"stepos_back_screen_display",1)!=0;
        boolean rotate=Settings.System.getInt(context.getContentResolver(),"stepos_back_screen_auto_rotate",1)!=0;
        featureEnabled=feature;powerSave=power.isPowerSaveMode();lastSyncAt=SystemClock.elapsedRealtime();
        boolean hold=LockedDisplayPolicy.keepCpu(active,power.isInteractive(),LockedDisplayPolicy.rearVisible(postureValue),feature,animated||rotate,power.isPowerSaveMode(),thermal);
        handler.removeCallbacks(renew);
        if(hold){
            long now=SystemClock.elapsedRealtime();
            if(!wake.isHeld()||now>=renewAt){wake.acquire(60000);renewAt=now+30000;}
            handler.postDelayed(renew,Math.max(1,renewAt-now));
        } else if(wake.isHeld()){wake.release();renewAt=0;}
    }
    /** 背屏状态的具体原因（不把帧计数当成物理显示成功） */
    String reason(){
        if(!featureEnabled)return "系统背屏已关闭，可在系统设置中开启";
        if(face==null)return "方向传感器不可用，锁屏持续刷新无法确认";
        if(postureValue<0)return "正在等待方向传感器";
        if(postureValue>=0&&!LockedDisplayPolicy.rearVisible(postureValue))return "背屏朝下，正在安静陪伴";
        if(powerSave)return "省电模式限制，背屏暂缓刷新";
        if(thermal>=3)return "设备温度偏高，背屏暂缓刷新";
        if(power.isInteractive())return "主屏使用中，正在发送背屏动画";
        return "背屏陪伴运行中";
    }
    boolean powerSave(){return powerSave;}
    boolean featureEnabled(){return featureEnabled;}
    int thermal(){return thermal;}
    String diagnostics(){return "cpuHeld="+wake.isHeld()+" posture="+postureValue+" postureSensor="+(face!=null)+" active="+active+" thermal="+thermal+" feature="+featureEnabled+" powerSave="+powerSave;}
    void close(){
        active=false;handler.removeCallbacks(renew);if(wake.isHeld())wake.release();
        sensors.unregisterListener(posture);context.unregisterReceiver(screen);context.getContentResolver().unregisterContentObserver(settings);power.removeThermalStatusListener(heat);
    }
}
