package com.diandian.neopet;
import java.nio.file.*;
public class MoriSmoke {
 public static void main(String[] args)throws Exception{
  String source=Files.readString(Path.of(args[0]));MoriRuntime runtime=new MoriRuntime(source);
  System.out.println(runtime.call("initGame","","{\"satiety\":81,\"mood\":68,\"energy\":70,\"intimacy\":7,\"updatedAt\":"+System.currentTimeMillis()+"}"));
  System.out.println(runtime.call("dispatchGame","care","[\"feed\"]"));
  System.out.println(runtime.call("dispatchGame","exportSave","[]"));
 }
}
