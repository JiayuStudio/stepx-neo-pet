package com.diandian.neopet;
import android.content.Context;
import org.json.*;
import java.io.*;
import java.util.*;

/** 帧包解析（0.3.6）：基础帧 / 分层 delta（阶段·性格·饰品）/ 耳机 overlay 三种条目。
 *
 * 体积控制：8 角色 × 15 场景的「阶段 × 性格 × 饰品」组合不再各存一份完整帧，
 * 只有 seedling/gentle/none 存完整帧，其余存与基准的差异；耳机只存基准组合的差分。
 * 解码结果与 Web 端 studio-art/mori.ts 直接渲染逐帧一致（导出脚本 resolve() 同语义）。 */
final class PetArt {
    private final Map<String,int[][]> frames=new HashMap<>();
    private final Map<String,int[]> delta=new HashMap<>();
    private final Map<String,int[][]> deltaFrames=new HashMap<>();
    private final Map<String,String> bases=new HashMap<>();
    private final Map<String,int[][]> overlays=new HashMap<>();
    private final Map<String,Double> fps=new HashMap<>();

    PetArt(Context c)throws Exception{
        ByteArrayOutputStream out=new ByteArrayOutputStream();
        try(InputStream in=c.getAssets().open("pet-frames.json")){byte[] b=new byte[4096];int n;while((n=in.read(b))>0)out.write(b,0,n);}
        JSONObject all=new JSONObject(out.toString("UTF-8"));Iterator<String> keys=all.keys();
        while(keys.hasNext()){
            String key=keys.next();JSONObject def=all.getJSONObject(key);fps.put(key,def.getDouble("fps"));
            if(def.has("frames")){
                JSONArray list=def.getJSONArray("frames");
                int[][] a=readFrames(key,list);
                frames.put(key,a);
            }else if(def.has("overlay")){
                overlays.put(key,readPairs(key,def.getJSONArray("overlay")));
            }else if(def.has("base")){
                bases.put(key,def.getString("base"));
                if(def.has("delta"))delta.put(key,readPairs(key,new JSONArray().put(def.getJSONArray("delta")))[0]);
                else if(def.has("deltaFrames"))deltaFrames.put(key,readPairs(key,def.getJSONArray("deltaFrames")));
                else throw new IOException("缺少增量数据");
            }else throw new IOException("未知条目类型");
        }
        if(!frames.containsKey("idle"))throw new IOException("缺少兜底动画");
    }

    private static int[][] readFrames(String key,JSONArray list)throws Exception{
        int[][] a=new int[list.length()][391];
        if(a.length==0)throw new IOException("动画缺少帧");
        for(int k=0;k<a.length;k++){JSONArray frame=list.getJSONArray(k);if(frame.length()!=391)throw new IOException("帧尺寸错误");
            for(int i=0;i<391;i++){int v=frame.getInt(i);if(v<0||v>255)throw new IOException("亮度越界");a[k][i]=v;}}
        return a;
    }

    /** 增量 / 叠加对：每帧 [idx,val,idx,val,...]；越界直接拒绝 */
    private static int[][] readPairs(String key,JSONArray list)throws Exception{
        int[][] a=new int[list.length()][];
        if(a.length==0)throw new IOException("动画缺少帧");
        for(int k=0;k<a.length;k++){JSONArray pairs=list.getJSONArray(k);int[] flat=new int[pairs.length()];a[k]=flat;
            for(int i=0;i+1<pairs.length();i+=2){int idx=pairs.getInt(i),v=pairs.getInt(i+1);
                if(idx<0||idx>=391||v<0||v>255)throw new IOException("增量越界");flat[i]=idx;flat[i+1]=v;}}
        return a;
    }

    private static int[] apply(int[] origin,int[] pairs){
        int[] out=origin.clone();
        for(int i=0;i+1<pairs.length;i+=2)out[pairs[i]]=pairs[i+1];
        return out;
    }

    /** 普通键缺失时回退 idle；耳机键走独立的场景级 overlay 解析，不做外观替换 */
    private String normalize(String key){
        return fps.containsKey(key)?key:"idle";
    }

    /** hp/<角色>/<场景> 这条绝对覆盖对的键；不存在返回 null */
    private String overlayKey(String key){
        String[] parts=key.split("/");
        if(parts.length<3)return null;
        String candidate="hp/"+parts[1]+"/"+parts[2];
        return overlays.containsKey(candidate)?candidate:null;
    }

    private int frameCount(String key){
        int[][] a=frames.get(key);if(a!=null)return a.length;
        a=deltaFrames.get(key);if(a!=null)return a.length;
        a=overlays.get(key);if(a!=null)return a.length;
        String base=bases.get(key);if(base!=null)return frameCount(base);
        return frames.get("idle").length;
    }

    private int[] resolve(String key,int index,int depth){
        if(depth>4)return frames.get("idle")[0];
        int[][] base=frames.get(key);
        if(base!=null)return base[index%base.length];
        String baseKey=bases.get(key);
        int[] single=delta.get(key);
        int[][] perFrame=deltaFrames.get(key);
        if(baseKey!=null&&(single!=null||perFrame!=null)){
            int[] origin=resolve(baseKey,index,depth+1);
            int[] pairs=single!=null?single:perFrame[index%perFrame.length];
            return apply(origin,pairs);
        }
        return frames.get("idle")[0];
    }

    /** 耳机帧 = 同一外观的普通 base 帧 + 该角色/场景的绝对覆盖对（不退回幼苗外观） */
    private int[] headphoneFrame(String key,long now){
        String overlayKey=overlayKey(key);
        if(overlayKey==null)return resolve(key.substring(3),0,0);
        int[][] overlay=overlays.get(overlayKey);
        int index=(int)((long)(now/1000.0*fps.get(overlayKey))%overlay.length);
        int[] origin=resolve(key.substring(3),index,0);
        return apply(origin,overlay[index]);
    }

    int[] frame(String key,long now){
        if(key.startsWith("hp/"))return headphoneFrame(key,now);
        String normalized=normalize(key);
        int index=(int)((long)(now/1000.0*fps.get(normalized))%frameCount(normalized));
        return resolve(normalized,index,0);
    }

    long interval(String key){
        if(key.startsWith("hp/")){
            String overlayKey=overlayKey(key);
            if(overlayKey!=null)return Math.max(200,Math.round(1000/fps.get(overlayKey)));
        }
        String normalized=normalize(key);
        return Math.max(200,Math.round(1000/fps.get(normalized)));
    }
}
