import com.diandian.neopet.MoriAppearance;
public class MoriAppearanceTest {
    static int count;
    static void equal(String a,String b){if(!a.equals(b))throw new AssertionError(a+" != "+b);count++;}
    public static void main(String[] args){
        // 成长 / 性格 / 饰品键（保持不变）
        equal(MoriAppearance.key("sleep",36,6,1,2,"gentle","star-ribbon"),"sleep/seedling/gentle/star-ribbon");
        equal(MoriAppearance.stage(119.99),"seedling");equal(MoriAppearance.stage(120),"bloom");
        equal(MoriAppearance.stage(319.99),"bloom");equal(MoriAppearance.stage(320),"luminary");
        equal(MoriAppearance.personality(3,3,3,"curious"),"curious");
        equal(MoriAppearance.personality(3,3,1,"curious"),"gentle");
        equal(MoriAppearance.personality(1,5,3,"gentle"),"playful");
        equal(MoriAppearance.personality(1,2,5,"gentle"),"curious");
        equal(MoriAppearance.key("idle",36,6,1,2,"gentle",null),"idle/seedling/gentle/none");
        equal(MoriAppearance.key("idle",36,6,1,2,"gentle","memory-lantern"),"idle/seedling/gentle/none");

        // 0.3.6 场景映射边界（与 web matrixScene.selectScene 同规则）
        equal(MoriAppearance.scene(0,80,80,80,80),"dead");
        equal(MoriAppearance.scene(-1,80,80,80,80),"dead");
        equal(MoriAppearance.scene(20,80,80,80,80),"sick");
        equal(MoriAppearance.scene(29.9,80,80,80,80),"sick");
        equal(MoriAppearance.scene(30,80,80,80,80),"happy");
        equal(MoriAppearance.scene(80,80,80,80,10),"sick");
        equal(MoriAppearance.scene(80,80,27.9,80,80),"hungry");
        equal(MoriAppearance.scene(80,80,28,80,80),"happy");
        equal(MoriAppearance.scene(80,80,80,27.9,80),"unhappy");
        equal(MoriAppearance.scene(80,80,80,28,80),"happy");
        equal(MoriAppearance.scene(80,23.9,80,80,80),"sleep");
        equal(MoriAppearance.scene(80,24,80,80,80),"happy");
        equal(MoriAppearance.scene(100,18,18,18,18),"sick");
        equal(MoriAppearance.scene(64,64,64,64,64),"idle");
        equal(MoriAppearance.scene(65,65,65,65,65),"happy");
        equal(MoriAppearance.scene(10,80,5,5,80),"sick");
        equal(MoriAppearance.scene(80,80,5,5,10),"sick");

        System.out.println("checks="+count);
        // 实际 catalog 键：8 角色 × 12 场景 × 3 阶段 × 3 性格 × 4 饰品（普通键与耳机键各 3456 条）
        String[] characters={"star","block","sprout","bunny","fox","otter","owl","drake"};
        String[] scenes={"idle","walk","eat","play","wash","sleep","pet","happy","hungry","unhappy","sick","dead"};
        String[] focuses={"gentle","playful","curious"};
        String[] wearables={"none","star-ribbon","sprout-crown","moon-charm"};
        int[] growths={36,120,320};
        for(String character:characters)for(String scene:scenes)for(int growth:growths)for(String focus:focuses)for(String wearable:wearables){
            String suffix=MoriAppearance.key(scene,growth,3,3,3,focus,wearable);
            System.out.println(character+"/"+suffix);
            System.out.println("hp/"+character+"/"+suffix);
        }
    }
}
