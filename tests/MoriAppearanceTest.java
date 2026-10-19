import com.diandian.neopet.MoriAppearance;
public class MoriAppearanceTest {
    static int count;
    static void equal(String a,String b){if(!a.equals(b))throw new AssertionError(a+" != "+b);count++;}
    public static void main(String[] args){
        equal(MoriAppearance.key("sleep",36,6,1,2,"gentle","star-ribbon"),"sleep/seedling/gentle/star-ribbon");
        equal(MoriAppearance.stage(119.99),"seedling");equal(MoriAppearance.stage(120),"bloom");
        equal(MoriAppearance.stage(319.99),"bloom");equal(MoriAppearance.stage(320),"luminary");
        equal(MoriAppearance.personality(3,3,3,"curious"),"curious");
        equal(MoriAppearance.personality(3,3,1,"curious"),"gentle");
        equal(MoriAppearance.personality(1,5,3,"gentle"),"playful");
        equal(MoriAppearance.personality(1,2,5,"gentle"),"curious");
        equal(MoriAppearance.key("idle",36,6,1,2,"gentle",null),"idle/seedling/gentle/none");
        equal(MoriAppearance.key("idle",36,6,1,2,"gentle","memory-lantern"),"idle/seedling/gentle/none");
        equal(MoriAppearance.scene(100,18,18,18,18),"sleep");
        equal(MoriAppearance.scene(20,18,18,18,18),"hungry");
        equal(MoriAppearance.scene(100,50,27,50,50),"hungry");
        equal(MoriAppearance.scene(100,50,50,27,50),"hungry");
        equal(MoriAppearance.scene(100,50,50,50,21),"hungry");
        equal(MoriAppearance.scene(64,64,64,64,64),"idle");
        equal(MoriAppearance.scene(65,65,65,65,65),"happy");
        System.out.println("checks="+count);
        for(String scene:new String[]{"idle","eat","play","sleep","happy","pet","hungry"})
        for(int growth:new int[]{36,120,320})for(String focus:new String[]{"gentle","playful","curious"})
        for(String wearable:new String[]{"none","star-ribbon","sprout-crown","moon-charm"})
            System.out.println(MoriAppearance.key(scene,growth,3,3,3,focus,wearable));
    }
}
