package com.diandian.neopet;

/** Native port of the Step Studio pet's rules. No Android dependencies. */
public final class PetEngine {
    public double satiety=80,mood=80,energy=80,intimacy=5;
    public long updatedAt,sleepUntil,feedUntil,playUntil,restUntil,burstUntil;
    public String burst="idle";
    public boolean sleeping;
    public PetEngine(long now){updatedAt=now;}
    private double clamp(double x){return Math.max(0,Math.min(100,x));}
    public void tick(long now){
        double dt=Math.min(28800,Math.max(0,(now-updatedAt)/1000.0));
        double sleep= sleeping ? Math.min(dt,Math.max(0,(sleepUntil-updatedAt)/1000.0)):0;
        double awake=dt-sleep;
        satiety=clamp(satiety-awake/120);mood=clamp(mood-awake/180);
        energy=clamp(energy+sleep*.5-awake/240);intimacy=clamp(intimacy);
        sleeping=sleeping&&now<sleepUntil;updatedAt=now;
    }
    public String action(String action,long now){
        tick(now);
        if("wake".equals(action)){
            if(!sleeping)return "点点已经醒着啦";
            sleeping=false;sleepUntil=0;return "点点醒来了";
        }
        if(sleeping)return "点点正在睡觉，可以先唤醒它";
        long until="feed".equals(action)?feedUntil:"play".equals(action)?playUntil:restUntil;
        if(now<until)return "稍等 "+((until-now+999)/1000)+" 秒，再陪点点互动";
        if("feed".equals(action)){
            if(satiety>=95)return "点点已经吃饱啦";
            satiety=clamp(satiety+22);mood=clamp(mood+2);intimacy=clamp(intimacy+2);
            feedUntil=now+45000;burst="eat";burstUntil=now+6000;return "吃得很香 · 亲密度 +2";
        }
        if("play".equals(action)){
            if(energy<10)return "点点有些累了，让它休息一下";
            mood=clamp(mood+18);energy=clamp(energy-12);satiety=clamp(satiety-4);intimacy=clamp(intimacy+3);
            playUntil=now+60000;burst="play";burstUntil=now+6000;return "玩得很开心 · 亲密度 +3";
        }
        if("rest".equals(action)){
            if(energy>=95)return "点点精神饱满，还不困";
            energy=clamp(energy+18);mood=clamp(mood+2);intimacy=clamp(intimacy+1);
            restUntil=now+90000;sleeping=true;sleepUntil=now+60000;burstUntil=0;return "点点睡着了，精力正在恢复";
        }
        return "未知操作";
    }
    public String animation(long now){
        if(sleeping)return "sleep";
        if(now<burstUntil)return burst;
        if(satiety<25)return "hungry";
        if(intimacy>=30)return "pet";
        return "idle";
    }
}
