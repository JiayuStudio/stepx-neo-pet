package com.diandian.neopet;
import android.content.Context;
import org.json.*;
import java.io.*;
import java.util.*;

final class PetArt {
    private final Map<String,int[][]> frames=new HashMap<>();
    private final Map<String,Double> fps=new HashMap<>();
    PetArt(Context c)throws Exception{
        ByteArrayOutputStream out=new ByteArrayOutputStream();
        try(InputStream in=c.getAssets().open("pet-frames.json")){byte[] b=new byte[4096];int n;while((n=in.read(b))>0)out.write(b,0,n);}
        JSONObject all=new JSONObject(out.toString("UTF-8"));Iterator<String> keys=all.keys();
        while(keys.hasNext()){
            String key=keys.next();JSONObject def=all.getJSONObject(key);JSONArray list=def.getJSONArray("frames");
            int[][] a=new int[list.length()][391];
            if(a.length==0)throw new IOException("动画缺少帧");
            for(int k=0;k<a.length;k++){JSONArray frame=list.getJSONArray(k);if(frame.length()!=391)throw new IOException("帧尺寸错误");
                for(int i=0;i<391;i++){int v=frame.getInt(i);if(v<0||v>255)throw new IOException("亮度越界");a[k][i]=v;}}
            frames.put(key,a);fps.put(key,def.getDouble("fps"));
        }
    }
    int[] frame(String key,long now){if(!frames.containsKey(key))key="idle";int[][] a=frames.get(key);return a[(int)((long)(now/1000.0*fps.get(key))%a.length)];}
    long interval(String key){if(!fps.containsKey(key))key="idle";return Math.max(200,Math.round(1000/fps.get(key)));}
}
