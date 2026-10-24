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
    /** 与 web/src/game/matrixScene.ts 的 selectScene 同规则（0.3.6）：
     *  死亡优先于需求；健康/清洁低 = sick，饱食低 = hungry，心情低 = unhappy，精力低 = sleep。 */
    public static String scene(double health,double energy,double hunger,double joy,double hygiene){
        if(health<=0)return "dead";
        if(health<30||hygiene<22)return "sick";
        if(hunger<28)return "hungry";
        if(joy<28)return "unhappy";
        if(energy<24)return "sleep";
        return (health+energy+hunger+joy+hygiene)/5>64?"happy":"idle";
    }
    public static String key(String scene,double growth,double gentle,double playful,double curious,String focus,String wearable){
        if(!"star-ribbon".equals(wearable)&&!"sprout-crown".equals(wearable)&&!"moon-charm".equals(wearable))wearable="none";
        return scene+"/"+stage(growth)+"/"+personality(gentle,playful,curious,focus)+"/"+wearable;
    }
}
