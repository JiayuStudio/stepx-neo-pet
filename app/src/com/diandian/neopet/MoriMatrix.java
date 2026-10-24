package com.diandian.neopet;
import org.json.*;

/** Both screens present the same saved Mori appearance and mood. */
final class MoriMatrix {
    private int lastNonce=-1;
    private long actionAt;
    private String action="";
    String scene(JSONObject pet,long now){
        // 0.3.3 孵化阶段优先（真实时间戳）：蛋 → 裂纹 → 破壳
        if(!pet.optBoolean("hatched",true)&&pet.has("egg")){
            long startedAt=pet.optJSONObject("egg").optLong("startedAt",now);
            long duration=pet.optJSONObject("egg").optLong("durationMs",60000);
            long elapsed=Math.max(0,now-startedAt);
            if(elapsed>=duration)return "idle"; // 已在本次 tick 破壳，回落由快照 hatched 处理
            if(elapsed>=58000)return "hatch";
            if(elapsed>=50000)return "crack";
            return "egg";
        }
        int nonce=pet.optInt("actionNonce");
        if(nonce!=lastNonce){if(lastNonce>=0){actionAt=now;action=pet.optString("lastAction");}lastNonce=nonce;}
        if(now-actionAt<6000){
            if(action.equals("feed"))return "eat";
            if(action.equals("rest"))return "sleep";
            if(action.equals("cuddle")||action.equals("story"))return "pet";
            // 0.3.6：洗澡 / 探索独立成场景，不再全部塞进 play
            if(action.equals("wash"))return "wash";
            if(action.equals("explore"))return "walk";
            if(action.equals("play")||action.equals("activity"))return "play";
        }
        JSONObject needs=pet.optJSONObject("needs");
        return MoriAppearance.scene(needs.optDouble("health"),needs.optDouble("energy"),needs.optDouble("hunger"),needs.optDouble("joy"),needs.optDouble("hygiene"));
    }
    private static final String[] CHARACTERS={"star","block","sprout","bunny","fox","otter","owl","drake"};
    String character(JSONObject pet){
        String value=pet.optString("character","star");
        for(String id:CHARACTERS)if(id.equals(value))return id;
        return "star";
    }
    String artKey(JSONObject pet,String scene){
        // 蛋阶段键：<scene>/<character>（与养成维度无关）
        if(scene.equals("egg")||scene.equals("crack")||scene.equals("hatch")){
            return scene+"/"+character(pet);
        }
        JSONObject scores=pet.optJSONObject("personalityScores");
        // 0.3.3：普通键 = 角色/场景/…；耳机帧 = hp/角色/场景/…（生成阶段与身体共用变换）
        String prefix=pet.optBoolean("headphones",false)?"hp/"+character(pet)+"/":character(pet)+"/";
        return prefix+MoriAppearance.key(scene,pet.optDouble("growthPoints"),scores.optDouble("gentle"),scores.optDouble("playful"),scores.optDouble("curious"),pet.optString("personalityFocus"),pet.optString("equippedWearable"));
    }
    int[] decorate(int[] original,JSONObject pet,long now){
        int[] out=original.clone();
        // Keep the incident cue separate from pet motion; wearables are attached in the art.
        if(!pet.isNull("activeIncident")&&now/1000%2==0){out[0]=255;out[17]=255;out[51]=255;}
        return out;
    }
}
