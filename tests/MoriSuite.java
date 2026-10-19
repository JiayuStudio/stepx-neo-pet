package com.diandian.neopet;
import java.nio.file.*;
public class MoriSuite {
 public static void main(String[] args)throws Exception{
  MoriRuntime r=new MoriRuntime(Files.readString(Path.of(args[0]))+"\n"+Files.readString(Path.of(args[1])));
  System.out.println(r.call("testResult"));
 }
}
