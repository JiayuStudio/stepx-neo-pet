package com.diandian.neopet;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.AtomicFile;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

final class PetStore {
    private static MoriRuntime engine;
    private static JSONObject latest;
    private static AtomicFile file;
    private static long savedAt;
    static String readAsset(Context c,String name)throws IOException{
        try(InputStream in=c.getAssets().open(name);ByteArrayOutputStream b=new ByteArrayOutputStream()){
            byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1)b.write(buf,0,n);return b.toString("UTF-8");
        }
    }
    private static void ensure(Context context){
        if(engine!=null)return;
        Context c=context.getApplicationContext();
        try{
            file=new AtomicFile(new File(c.getFilesDir(),"mori-save.json"));
            String saved=file.getBaseFile().exists()?new String(file.readFully(),StandardCharsets.UTF_8):"";
            String legacy="";
            if(saved.isEmpty()){
                SharedPreferences p=c.getSharedPreferences("pet",0);
                if(p.contains("updatedAt")){
                    PetEngine old=new PetEngine(p.getLong("updatedAt",System.currentTimeMillis()));
                    old.satiety=p.getFloat("satiety",80);old.mood=p.getFloat("mood",80);old.energy=p.getFloat("energy",80);old.intimacy=p.getFloat("intimacy",5);
                    old.sleeping=p.getBoolean("sleeping",false);old.sleepUntil=p.getLong("sleepUntil",0);old.tick(System.currentTimeMillis());
                    legacy=new JSONObject().put("satiety",old.satiety).put("mood",old.mood).put("energy",old.energy).put("intimacy",old.intimacy).put("updatedAt",old.updatedAt).toString();
                }
            }
            MoriRuntime candidate=new MoriRuntime(readAsset(c,"mori-engine.js"));
            latest=new JSONObject(candidate.call("initGame",saved,legacy));
            engine=candidate;persist();
        }catch(Exception e){throw new IllegalStateException("养成存档未能加载，原存档已保留",e);}
    }
    private static void persist(){
        FileOutputStream out=null;
        try{out=file.startWrite();out.write(latest.toString().getBytes(StandardCharsets.UTF_8));file.finishWrite(out);savedAt=System.currentTimeMillis();}
        catch(IOException e){if(out!=null)file.failWrite(out);throw new IllegalStateException("存档写入失败",e);}
    }
    static synchronized JSONObject snapshot(Context c){
        ensure(c);
        try{latest=new JSONObject(engine.call("snapshotGame"));if(System.currentTimeMillis()-savedAt>=10000)persist();return new JSONObject(latest.toString());}
        catch(JSONException e){throw new IllegalStateException("养成状态异常",e);}
    }
    static synchronized String dispatch(Context c,String action,String args){
        ensure(c);if(args.length()>210000)throw new IllegalArgumentException("操作数据过大");
        try{JSONObject result=new JSONObject(engine.call("dispatchGame",action,args));latest=result.getJSONObject("snapshot");persist();return result.toString();}
        catch(JSONException e){throw new IllegalStateException("操作结果异常",e);}
    }
    static synchronized void save(Context c){if(engine!=null){snapshot(c);persist();}}
}
