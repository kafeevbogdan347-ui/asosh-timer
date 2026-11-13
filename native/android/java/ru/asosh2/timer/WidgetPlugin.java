package ru.asosh2.timer;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Мост JS → виджет: приложение присылает уроки на сегодня и завтра (JSON),
// плагин сохраняет их и сразу перерисовывает виджет.
@CapacitorPlugin(name = "AsoshWidget")
public class WidgetPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        String json = call.getString("lessons", "[]");
        String cls = call.getString("cls", "");
        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences(LessonWidget.PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString(LessonWidget.KEY_LESSONS, json).putString(LessonWidget.KEY_CLASS, cls).apply();
        LessonWidget.updateAll(ctx);
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }
}
