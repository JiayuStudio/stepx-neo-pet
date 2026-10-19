package com.diandian.neopet;
import android.content.Context;
import org.json.*;
import java.io.*;
import java.util.*;

final class PetArt {
    private final Map<String,int[][]> frames=new HashMap<>();
    /** 0.3.3 耳机增量：key(hp/角色/…) -> [帧][idx,val 交替]，叠加在对应基础帧上 */
    private final Map<String,int[][]> overlays=new HashMap<>();
    private final Map<String,Double> fps=new HashMap<>();
    PetArt(Context c)throws Exception{
        ByteArrayOutputStream out=new ByteArrayOutputStream();
        try(InputStream in=c.getAssets().open("pet-frames.json")){byte[] b=new byte[4096];int n;while((n=in.read(b))>0)out.write(b,0,n);}
        JSONObject all=new JSONObject(out.toString("UTF-8"));Iterator<String> keys=all.keys();
        while(keys.hasNext()){
            String key=keys.next();JSONObject def=all.getJSONObject(key);fps.put(key,def.getDouble("fps"));
            if(def.has("overlay")){
                JSONArray list=def.getJSONArray("overlay");int[][] a=new int[list.length()][];
                if(a.length==0)throw new IOException("动画缺少帧");
                for(int k=0;k<a.length;k++){JSONArray pairs=list.getJSONArray(k);int[] flat=new int[pairs.length()];
                    for(int i=0;i<pairs.length();i+=2){int idx=pairs.getInt(i),v=pairs.getInt(i+1);
                        if(idx<0||idx>=391||v<0||v>255)throw new IOException("增量越界");flat[i]=idx;flat[i+1]=v;}
                    a[k]=flat;}
                overlays.put(key,a);continue;
            }
            JSONArray list=def.getJSONArray("frames");
            int[][] a=new int[list.length()][391];
            if(a.length==0)throw new IOException("动画缺少帧");
            for(int k=0;k<a.length;k++){JSONArray frame=list.getJSONArray(k);if(frame.length()!=391)throw new IOException("帧尺寸错误");
                for(int i=0;i<391;i++){int v=frame.getInt(i);if(v<0||v>255)throw new IOException("亮度越界");a[k][i]=v;}}
            frames.put(key,a);
        }
        if(!frames.containsKey("idle"))throw new IOException("缺少兜底动画");
    }
    int[] frame(String key,long now){
        if(!fps.containsKey(key))key="idle";
        int index=(int)((long)(now/1000.0*fps.get(key))%frameCount(key));
        int[][] base=frames.get(key);
        if(base!=null)return base[index];
        // 耳机条目：基础帧 + 增量（基础键 = 去掉 hp/ 前缀）
        String baseKey=key.startsWith("hp/")?key.substring(3):key;
        int[][] origin=frames.get(baseKey);
        if(origin==null){origin=frames.get("idle");index=(int)((long)(now/1000.0*fps.get(key))%origin.length);}
        int[] out=origin[index].clone();
        int[][] overlay=overlays.get(key);
        if(overlay!=null&&index<overlay.length)for(int i=0;i+1<overlay[index].length;i+=2)out[overlay[index][i]]=overlay[index][i+1];
        return out;
    }
    private int frameCount(String key){
        if(frames.containsKey(key))return frames.get(key).length;
        String baseKey=key.startsWith("hp/")?key.substring(3):key;
        if(frames.containsKey(baseKey))return frames.get(baseKey).length;
        return frames.get("idle").length;
    }
    long interval(String key){if(!fps.containsKey(key))key="idle";return Math.max(200,Math.round(1000/fps.get(key)));}
}
