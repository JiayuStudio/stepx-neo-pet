package com.diandian.neopet;
import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.os.*;
import java.io.*;
import java.util.Arrays;

public final class PetService extends Service {
    static volatile PetService instance;
    static final String START="com.diandian.neopet.START",STOP="com.diandian.neopet.STOP";
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final MoriMatrix presentation=new MoriMatrix();
    private RearDisplay display;private LockedDisplaySession locked;private PetArt art;
    private volatile boolean running;private long frames,changedFrames,petChangedFrames,startedAt;private int lastHash,lastPetHash;
    private String scene="idle",artKey="idle",status="正在开启",error="";
    static SharedPreferences prefs(Context c){return c.getSharedPreferences("companion",0);}
    static boolean running(){return instance!=null&&instance.running;}
    static String status(Context c){return instance==null?prefs(c).getString("status","尚未开启背屏陪伴"):instance.status;}
    @Override public void onCreate(){
        super.onCreate();instance=this;
        NotificationManager nm=getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel("pet-companion","点点背屏陪伴",NotificationManager.IMPORTANCE_LOW));
        startForeground(1,notification(),ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
    }
    private Notification notification(){
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop=PendingIntent.getService(this,1,new Intent(this,PetService.class).setAction(STOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(this,"pet-companion").setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentTitle("点点正在背屏陪着你").setContentText("返回桌面或锁屏可继续 · 点击停止结束陪伴")
            .setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true)
            .addAction(new Notification.Action.Builder(null,"停止陪伴",stop).build()).build();
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent!=null&&STOP.equals(intent.getAction())){prefs(this).edit().putBoolean("enabled",false).apply();status="陪伴已停止，背屏已归还系统";stopSelf();return START_NOT_STICKY;}
        if(intent!=null&&START.equals(intent.getAction()))prefs(this).edit().putBoolean("enabled",true).apply();
        if(!prefs(this).getBoolean("enabled",false)){stopSelf();return START_NOT_STICKY;}
        if(running)return START_STICKY;
        try{
            display=new RearDisplay(this);art=new PetArt(this);display.prepare();
            locked=new LockedDisplaySession(this,handler);locked.setActive(true,true);
            running=true;startedAt=SystemClock.elapsedRealtime();tick.run();
        }catch(Exception e){fail(e);}
        return running?START_STICKY:START_NOT_STICKY;
    }
    private void fail(Exception e){
        error=e.getMessage()==null?e.getClass().getSimpleName():e.getMessage();
        status="陪伴未能继续："+error;prefs(this).edit().putBoolean("enabled",false).putString("status",status).apply();stopSelf();
    }
    private final Runnable tick=new Runnable(){public void run(){
        if(!running)return;
        try{
            long now=System.currentTimeMillis();org.json.JSONObject pet=PetStore.snapshot(PetService.this);scene=presentation.scene(pet,now);
            artKey=presentation.artKey(pet,scene);
            int[] petFrame=art.frame(artKey,now);
            int[] frame=presentation.decorate(petFrame,pet,now);display.show(frame);frames++;
            // Count the pet separately: a blinking incident marker must not pass animation QA.
            int petHash=Arrays.hashCode(petFrame);if(frames==1||petHash!=lastPetHash){petChangedFrames++;lastPetHash=petHash;}
            int hash=Arrays.hashCode(frame);if(hash!=lastHash){changedFrames++;lastHash=hash;}
            status="背屏陪伴运行中 · 已发送 "+frames+" 帧";
            handler.postDelayed(this,art.interval(artKey));
        }catch(Exception e){fail(e);}
    }};
    @Override public void onDestroy(){
        if(status.startsWith("背屏陪伴运行中"))status="陪伴已暂停，请重新开启";
        running=false;handler.removeCallbacksAndMessages(null);
        if(locked!=null)locked.close();
        if(display!=null)try{display.close();}catch(Exception e){status="已停止；背屏恢复待重试："+e.getMessage();}
        try{PetStore.save(this);}catch(Exception e){status="陪伴已停止；存档写入待重试";}prefs(this).edit().putString("status",status).apply();
        stopForeground(STOP_FOREGROUND_REMOVE);instance=null;super.onDestroy();
    }
    @Override public IBinder onBind(Intent i){return null;}
    @Override public void onTaskRemoved(Intent i){/* User enabled the service; task dismissal leaves its notification and stop control. */}
    @Override protected void dump(FileDescriptor fd,PrintWriter w,String[] args){
        w.println("running="+running+" frames="+frames+" changedFrames="+changedFrames+" frameHash="+lastHash+" scene="+scene);
        w.println("petChangedFrames="+petChangedFrames+" petFrameHash="+lastPetHash+" art="+artKey);
        w.println("elapsedMs="+(SystemClock.elapsedRealtime()-startedAt)+" mainInteractive="+getSystemService(PowerManager.class).isInteractive());
        w.println("status="+status+" error="+error);if(locked!=null)w.println(locked.diagnostics());
    }
}
