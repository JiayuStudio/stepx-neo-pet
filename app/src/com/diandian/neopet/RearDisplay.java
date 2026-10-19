package com.diandian.neopet;
import android.content.*;
import android.os.*;
import java.lang.reflect.*;

/** Adapted from backscreen-toolbox v1.1.0 (MIT, STEPX Advance contributors).
 * Adds a persistent, reversible display-mode session; no vendor binaries or credentials. */
final class RearDisplay {
    private final Object manager;
    private final SharedPreferences restore;
    RearDisplay(Context c)throws Exception{
        manager=c.getSystemService("display_ext");
        if(manager==null)throw new Exception("当前固件没有提供背屏接口");
        restore=c.getSharedPreferences("display-restore",0);
    }
    private Object call(String name,Class<?>[] types,Object... args)throws Exception{
        try{return manager.getClass().getMethod(name,types).invoke(manager,args);}
        catch(InvocationTargetException e){Throwable cause=e.getCause();throw new Exception(name+"："+cause.getClass().getSimpleName());}
    }
    void prepare()throws Exception{
        if(!(Boolean)call("isBackScreenEnabled",new Class<?>[0]))throw new Exception("请先在系统设置开启背屏显示");
        int mode=(Integer)call("getBackScreenDisplayMode",new Class<?>[0]);
        if(!restore.contains("mode")&&!restore.edit().putInt("mode",mode).commit())throw new Exception("无法保存原背屏模式");
        call("setBackScreenDisplayMode",new Class<?>[]{int.class},1);
    }
    void show(int[] pixels)throws Exception{
        if(pixels==null||pixels.length!=391)throw new IllegalArgumentException("需要 17×23 点阵帧");
        for(int p:pixels)if(p<0||p>255)throw new IllegalArgumentException("亮度越界");
        // Persist ownership before IPC so interrupted calls are cleaned up on next launch.
        if(!restore.getBoolean("owns",false)&&!restore.edit().putBoolean("owns",true).commit())throw new Exception("无法保存显示会话");
        call("setBackScreenAgentFrame",new Class<?>[]{int[].class,Bundle.class},pixels,null);
    }
    void close()throws Exception{
        Exception failure=null;
        if(restore.getBoolean("owns",false)){
            try{call("clearBackScreenAgentFrame",new Class<?>[0]);restore.edit().remove("owns").commit();}catch(Exception e){failure=e;}
        }
        if(restore.contains("mode")){
            try{
                int mode=(Integer)call("getBackScreenDisplayMode",new Class<?>[0]);
                if(mode==1)call("setBackScreenDisplayMode",new Class<?>[]{int.class},restore.getInt("mode",0));
                restore.edit().remove("mode").commit();
            }catch(Exception e){failure=e;}
        }
        if(failure!=null)throw failure;
    }
}
