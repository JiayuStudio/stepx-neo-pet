import com.diandian.neopet.PetEngine;
import com.diandian.neopet.LockedDisplayPolicy;
public class PetEngineTest {
    static int passed;
    static void check(boolean v,String name){if(!v)throw new AssertionError(name);passed++;}
    static void close(double a,double b,String name){check(Math.abs(a-b)<.001,name);}
    public static void main(String[] args){
        long t=10000000;PetEngine p=new PetEngine(t);p.action("feed",t);double intimacy=p.intimacy;p.action("feed",t+1);close(p.intimacy,intimacy,"cooldown blocks repeat reward");
        p=new PetEngine(t);p.energy=30;p.action("rest",t);p.tick(t+120000);close(p.energy,77.75,"sleep and awake segments split");check(!p.sleeping,"sleep finishes offline");
        p=new PetEngine(t);p.energy=30;p.action("rest",t);p.action("wake",t+1000);intimacy=p.intimacy;p.action("rest",t+1001);close(p.intimacy,intimacy,"wake cannot reset rest cooldown");
        p=new PetEngine(t);p.tick(t-60000);close(p.energy,80,"clock rollback has no negative decay");
        p=new PetEngine(t);p.tick(t+20*3600000);check(p.satiety==0&&p.energy==0&&p.intimacy==5,"offline clamp and intimacy persistence");
        p=new PetEngine(t);p.sleeping=true;p.sleepUntil=t-1;p.action("feed",t);check(p.intimacy==7,"expired sleep is settled before action");
        p=new PetEngine(t);p.action("play",t);check(p.animation(t+1000).equals("play"),"interaction animation selected");check(p.animation(t+7000).equals("idle"),"interaction animation expires");
        check(LockedDisplayPolicy.keepCpu(true,false,true,true,true,false,0),"visible rear animation holds CPU");
        check(!LockedDisplayPolicy.keepCpu(true,false,false,true,true,false,0),"rear down releases CPU");
        check(!LockedDisplayPolicy.keepCpu(true,false,true,true,true,true,0),"power save respected");
        check(!LockedDisplayPolicy.keepCpu(true,false,true,true,true,false,3),"heat protection respected");
        check(!LockedDisplayPolicy.keepCpu(false,false,true,true,true,false,0),"stop releases CPU");
        System.out.println(passed+" lifecycle and pet-rule assertions passed");
    }
}
