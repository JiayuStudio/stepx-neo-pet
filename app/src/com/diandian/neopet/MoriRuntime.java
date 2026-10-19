package com.diandian.neopet;
import org.mozilla.javascript.*;

/** Runs the same upstream TypeScript rules after ES5 transpilation, independently of WebView. */
final class MoriRuntime {
    private final Scriptable scope;
    MoriRuntime(String source) {
        Context cx=enter();
        try { scope=cx.initSafeStandardObjects(); cx.evaluateString(scope,source,"mori-engine",1,null); }
        finally { Context.exit(); }
    }
    private Context enter(){
        Context cx=Context.enter();cx.setLanguageVersion(Context.VERSION_ES6);cx.setOptimizationLevel(-1);
        cx.setMaximumInterpreterStackDepth(256);cx.setClassShutter(name->false);return cx;
    }
    synchronized String call(String name,String... args){
        Context cx=enter();
        try { return Context.toString(((Function)ScriptableObject.getProperty(scope,name)).call(cx,scope,scope,args)); }
        finally { Context.exit(); }
    }
}
