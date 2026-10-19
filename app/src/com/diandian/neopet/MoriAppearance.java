package com.diandian.neopet;

/** Mirrors the front scene's stage/personality and getMood precedence. */
public final class MoriAppearance {
    private MoriAppearance(){}
    public static String stage(double growth){return growth>=320?"luminary":growth>=120?"bloom":"seedling";}
    public static String personality(double gentle,double playful,double curious,String focus){
        double max=Math.max(gentle,Math.max(playful,curious));
        if(("gentle".equals(focus)&&gentle==max)||("playful".equals(focus)&&playful==max)||("curious".equals(focus)&&curious==max))return focus;
        return gentle==max?"gentle":playful==max?"playful":"curious";
    }
    public static String scene(double health,double energy,double hunger,double joy,double hygiene){
        if(health<30)return "hungry";
        if(energy<24)return "sleep";
        if(hunger<28||joy<28||hygiene<22)return "hungry";
        return (health+energy+hunger+joy+hygiene)/5>64?"happy":"idle";
    }
    public static String key(String scene,double growth,double gentle,double playful,double curious,String focus,String wearable){
        if(!"star-ribbon".equals(wearable)&&!"sprout-crown".equals(wearable)&&!"moon-charm".equals(wearable))wearable="none";
        return scene+"/"+stage(growth)+"/"+personality(gentle,playful,curious,focus)+"/"+wearable;
    }
}
