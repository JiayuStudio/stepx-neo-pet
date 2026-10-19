package com.diandian.neopet;
import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static final String ORIGIN="https://neopet.local";
    private final Handler main=new Handler(Looper.getMainLooper());
    private WebView web;
    private boolean pendingStart;
    @Override public void onCreate(Bundle saved){
        super.onCreate(saved);
        if(!PetService.running()){
            try{new RearDisplay(this).close();PetService.prefs(this).edit().putBoolean("enabled",false).apply();}
            catch(Exception e){PetService.prefs(this).edit().putString("status","背屏恢复待重试").apply();}
        }
        try{PetStore.snapshot(this);}catch(Exception e){new AlertDialog.Builder(this).setTitle("存档暂时无法打开").setMessage(e.getMessage()).setPositiveButton("关闭",(d,w)->finish()).show();return;}
        web=new WebView(this);web.setBackgroundColor(0xfffff5df);
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);
        web.addJavascriptInterface(new Bridge(),"NeoNative");
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri u=request.getUrl();String path=u.getPath();
                if(!"https".equals(u.getScheme())||!"neopet.local".equals(u.getHost())||path==null||path.contains(".."))return blocked();
                if(path.equals("/"))path="/index.html";
                String mime=path.endsWith(".js")?"text/javascript":path.endsWith(".css")?"text/css":path.endsWith(".svg")?"image/svg+xml":path.endsWith(".png")?"image/png":"text/html";
                try{return new WebResourceResponse(mime,"UTF-8",getAssets().open("web"+path));}
                catch(IOException e){return blocked();}
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !"neopet.local".equals(r.getUrl().getHost());}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onJsConfirm(WebView v,String url,String message,JsResult result){
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("确认",(d,w)->result.confirm()).setNegativeButton("取消",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;
            }
            @Override public boolean onConsoleMessage(ConsoleMessage message){
                if(message.messageLevel()==ConsoleMessage.MessageLevel.ERROR)android.util.Log.e("NeoPetWeb",message.message());return true;
            }
        });
        android.widget.FrameLayout root=new android.widget.FrameLayout(this);root.setBackgroundColor(0xfffff5df);root.addView(web);
        root.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets b=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());v.setPadding(b.left,b.top,b.right,b.bottom);return insets;});
        setContentView(root);root.requestApplyInsets();web.loadUrl(ORIGIN+"/index.html");
    }
    private WebResourceResponse blocked(){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",java.util.Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
    public final class Bridge {
        @JavascriptInterface public String snapshot(){return PetStore.snapshot(MainActivity.this).toString();}
        @JavascriptInterface public String dispatch(String action,String args){
            try{return PetStore.dispatch(MainActivity.this,action,args);}catch(Exception e){try{return new JSONObject().put("error", "操作未完成："+e.getMessage()).toString();}catch(Exception ignored){return "{}";}}
        }
        @JavascriptInterface public String companion(){
            try{return new JSONObject().put("running",PetService.running()).put("status",PetService.status(MainActivity.this)).put("version","0.3.2").toString();}catch(Exception e){return "{}";}
        }
        @JavascriptInterface public void control(String action){main.post(()->{
            if(isFinishing()||isDestroyed())return;
            switch(action){
                case "start":requestStart();break;
                case "stop":if(PetService.running())startService(new Intent(MainActivity.this,PetService.class).setAction(PetService.STOP));break;
                case "settings":backgroundSettings();break;
                case "licenses":licenses();break;
                case "export":startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE,"diandian-save.json"),201);break;
                case "import":startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json"),202);break;
            }
        });}
    }
    private void licenses(){
        try{String text="Mori 完整养成与界面源码（MIT）\nhttps://github.com/Tech-aficionado/Tamagochi---Open-Source-Game\n固定版本：4ffa9c3d\n\n"+PetStore.readAsset(this,"LICENSE-mori.txt")+"\n\n背屏会话与构建工具\n"+PetStore.readAsset(this,"LICENSE-backscreen-toolbox.txt")+"\n\nRhino 1.7.15.1（未修改，MPL-2.0）\n源码：https://github.com/mozilla/rhino/tree/Rhino1_7_15_1_Release\n"+PetStore.readAsset(this,"LICENSE-rhino.txt")+"\n\nWeb 组件许可\n"+PetStore.readAsset(this,"THIRD-PARTY-NOTICES.txt");
            TextView t=new TextView(this);t.setText(text);t.setTextIsSelectable(true);int p=32;t.setPadding(p,p,p,p);ScrollView s=new ScrollView(this);s.addView(t);new AlertDialog.Builder(this).setTitle("开源许可").setView(s).setPositiveButton("关闭",null).show();
        }catch(Exception e){Toast.makeText(this,"许可文件读取失败",Toast.LENGTH_LONG).show();}
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);if(result!=RESULT_OK||data==null||data.getData()==null)return;
        try{
            if(request==201){
                JSONObject response=new JSONObject(PetStore.dispatch(this,"exportSave","[]"));
                String contents=response.getJSONObject("result").getString("contents");
                try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(contents.getBytes(StandardCharsets.UTF_8));}
                Toast.makeText(this,"备份已保存",Toast.LENGTH_LONG).show();
            }else if(request==202){
                ByteArrayOutputStream bytes=new ByteArrayOutputStream();
                try(InputStream in=getContentResolver().openInputStream(data.getData())){byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1){bytes.write(b,0,n);if(bytes.size()>200000)throw new IOException("备份文件过大");}}
                String contents=bytes.toString("UTF-8");
                new AlertDialog.Builder(this).setTitle("恢复备份").setMessage("恢复会替换当前养成进度。继续吗？").setNegativeButton("取消",null).setPositiveButton("恢复",(d,w)->{
                    try{JSONObject response=new JSONObject(PetStore.dispatch(this,"importSave",new JSONArray().put(contents).toString()));JSONObject r=response.getJSONObject("result");Toast.makeText(this,r.optBoolean("ok")?"备份已恢复":r.optString("error"),Toast.LENGTH_LONG).show();}
                    catch(Exception e){Toast.makeText(this,"恢复失败，原进度保留",Toast.LENGTH_LONG).show();}
                }).show();
            }
        }catch(Exception e){Toast.makeText(this,"备份操作未完成："+e.getMessage(),Toast.LENGTH_LONG).show();}
    }
    private void backgroundSettings(){
        PowerManager p=getSystemService(PowerManager.class);
        if(!p.isIgnoringBatteryOptimizations(getPackageName()))startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,Uri.parse("package:"+getPackageName())));
        else new AlertDialog.Builder(this).setTitle("电池优化豁免已开启").setMessage("可在“耗电和后台”中检查允许后台运行。系统强行停止或重启后，请重新打开点点。").setPositiveButton("应用信息",(d,w)->startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName())))).setNegativeButton("返回",null).show();
    }
    private void requestStart(){
        if(checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){pendingStart=true;requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},100);}else startCompanion();
    }
    private void startCompanion(){try{startForegroundService(new Intent(this,PetService.class).setAction(PetService.START));}catch(Exception e){Toast.makeText(this,"开启失败："+e.getMessage(),Toast.LENGTH_LONG).show();}}
    @Override public void onRequestPermissionsResult(int r,String[] p,int[] g){super.onRequestPermissionsResult(r,p,g);if(r==100&&pendingStart){pendingStart=false;if(g.length>0&&g[0]==PackageManager.PERMISSION_GRANTED)startCompanion();else Toast.makeText(this,"请允许通知，以便随时停止陪伴",Toast.LENGTH_LONG).show();}}
    @Override protected void onResume(){super.onResume();if(web!=null){web.resumeTimers();web.onResume();web.evaluateJavascript("window.dispatchEvent(new Event('neo-resume'))",null);}}
    @Override protected void onPause(){if(web!=null){web.evaluateJavascript("window.dispatchEvent(new Event('neo-background'))",null);web.onPause();web.pauseTimers();}try{PetStore.save(this);}catch(Exception ignored){}super.onPause();}
    @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("NeoNative");web.destroy();}main.removeCallbacksAndMessages(null);super.onDestroy();}
}
