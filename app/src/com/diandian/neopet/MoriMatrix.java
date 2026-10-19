package com.diandian.neopet;
import org.json.*;

/** Both screens present the same saved Mori appearance and mood. */
final class MoriMatrix {
    private int lastNonce=-1;
    private long actionAt;
    private String action="";
    String scene(JSONObject pet,long now){
        int nonce=pet.optInt("actionNonce");
        if(nonce!=lastNonce){if(lastNonce>=0){actionAt=now;action=pet.optString("lastAction");}lastNonce=nonce;}
        if(now-actionAt<6000){
            if(action.equals("feed"))return "eat";
            if(action.equals("rest"))return "sleep";
            if(action.equals("cuddle")||action.equals("story"))return "pet";
            if(action.equals("wash")||action.equals("play")||action.equals("explore")||action.equals("activity"))return "play";
        }
        JSONObject needs=pet.optJSONObject("needs");
        return MoriAppearance.scene(needs.optDouble("health"),needs.optDouble("energy"),needs.optDouble("hunger"),needs.optDouble("joy"),needs.optDouble("hygiene"));
    }
    String artKey(JSONObject pet,String scene){
        JSONObject scores=pet.optJSONObject("personalityScores");
        return MoriAppearance.key(scene,pet.optDouble("growthPoints"),scores.optDouble("gentle"),scores.optDouble("playful"),scores.optDouble("curious"),pet.optString("personalityFocus"),pet.optString("equippedWearable"));
    }
    int[] decorate(int[] original,JSONObject pet,long now){
        int[] out=original.clone();
        // Keep the incident cue separate from pet motion; wearables are attached in the art.
        if(!pet.isNull("activeIncident")&&now/1000%2==0){out[0]=255;out[17]=255;out[51]=255;}
        return out;
    }
}
