package com.hats.ci.widgethost;
import android.app.Activity;
import android.appwidget.*;
import android.os.Bundle;
import android.widget.*;
import android.util.Log;

/** Disposable CI host. It binds the real installed Hats provider; never shipped with Hats. */
public class WidgetHost extends Activity {
  private AppWidgetHost host;
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    String target=getIntent().getStringExtra("target");
    AppWidgetManager manager=AppWidgetManager.getInstance(this);
    host=new AppWidgetHost(this,1024);host.startListening();
    LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setPadding(24,60,24,24);
    TextView title=new TextView(this);title.setText("Disposable Hats widget check");layout.addView(title);setContentView(layout);
    for(AppWidgetProviderInfo provider:manager.getInstalledProviders()) {
      if(provider.provider.getPackageName().equals(target)&&provider.provider.getClassName().endsWith("HatsNow")) {
        android.content.SharedPreferences prefs=getSharedPreferences("binding",MODE_PRIVATE);
        int id=prefs.getInt(target,-1);
        boolean fresh=id<0||manager.getAppWidgetInfo(id)==null;
        if(fresh)id=host.allocateAppWidgetId();
        Bundle options=new Bundle();
        options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,320);options.putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH,320);
        int height=getIntent().getBooleanExtra("refresh",false)?221:220;
        options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,height);options.putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,height);
        if(fresh&&!manager.bindAppWidgetIdIfAllowed(id,provider.provider,options)) throw new IllegalStateException("Widget bind permission was not granted to the disposable host");
        prefs.edit().putInt(target,id).apply();
        manager.updateAppWidgetOptions(id,options);
        AppWidgetHostView view=host.createView(this,id,provider);view.setAppWidget(id,provider);
        layout.addView(view,new LinearLayout.LayoutParams(-1,600));
        Log.i("HATS_WIDGET_CI","BOUND:"+id+":"+provider.provider.flattenToString());return;
      }
    }
    throw new IllegalStateException("Installed HatsNow provider not found");
  }
  @Override public void onDestroy(){if(host!=null)host.stopListening();super.onDestroy();}
}
