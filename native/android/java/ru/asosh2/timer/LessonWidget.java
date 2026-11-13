package ru.asosh2.timer;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

// Виджет «АСОШ Таймер»: сколько осталось до конца урока (или до начала следующего)
// и какой урок и кабинет дальше. Отсчёт идёт сам (Chronometer), а в момент звонка
// будильник перерисовывает виджет на следующий период.
public class LessonWidget extends AppWidgetProvider {
    static final String PREFS = "asosh_widget";
    static final String KEY_LESSONS = "lessons";
    static final String KEY_CLASS = "cls";
    static final String ACTION_TICK = "ru.asosh2.timer.WIDGET_TICK";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        render(ctx, mgr, ids);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        if (ACTION_TICK.equals(intent.getAction())) updateAll(ctx);
    }

    @Override
    public void onDisabled(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(tickIntent(ctx));
    }

    static void updateAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, LessonWidget.class));
        if (ids.length > 0) render(ctx, mgr, ids);
    }

    private static PendingIntent tickIntent(Context ctx) {
        Intent i = new Intent(ctx, LessonWidget.class).setAction(ACTION_TICK);
        return PendingIntent.getBroadcast(ctx, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static String roomLabel(String room) {
        if (room == null || room.isEmpty()) return "";
        return Character.isDigit(room.charAt(0)) ? "каб. " + room : room;
    }

    private static void render(Context ctx, AppWidgetManager mgr, int[] ids) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String cls = prefs.getString(KEY_CLASS, "");
        long now = System.currentTimeMillis();
        String title;
        String next = "";
        long target = 0; // момент, до которого идёт отсчёт
        long nextChange = 0; // когда перерисовать

        try {
            JSONArray list = new JSONArray(prefs.getString(KEY_LESSONS, "[]"));
            JSONObject current = null;
            JSONObject upcoming = null;
            for (int i = 0; i < list.length(); i++) {
                JSONObject l = list.getJSONObject(i);
                long start = l.getLong("start");
                long end = l.getLong("end");
                if (now >= start && now < end) current = l;
                if (start > now && (upcoming == null || start < upcoming.getLong("start"))) upcoming = l;
            }
            if (current != null) {
                title = current.optInt("num") + "-й урок · " + current.optString("sub");
                target = current.getLong("end");
                nextChange = target;
                if (upcoming != null && upcoming.getLong("start") - target < 3 * 3600_000L) {
                    String room = roomLabel(upcoming.optString("room"));
                    next = "Дальше: " + upcoming.optString("sub") + (room.isEmpty() ? "" : " · " + room);
                } else {
                    next = "Это последний урок";
                }
            } else if (upcoming != null && upcoming.getLong("start") - now < 3 * 3600_000L) {
                String room = roomLabel(upcoming.optString("room"));
                title = "Перемена · дальше " + upcoming.optInt("num") + "-й урок";
                next = upcoming.optString("sub") + (room.isEmpty() ? "" : " · " + room);
                target = upcoming.getLong("start");
                nextChange = target;
            } else if (upcoming != null) {
                String room = roomLabel(upcoming.optString("room"));
                title = "Уроки закончились";
                java.util.Calendar c = java.util.Calendar.getInstance();
                c.setTimeInMillis(upcoming.getLong("start"));
                next = String.format(java.util.Locale.US, "Завтра в %02d:%02d — %s%s", c.get(java.util.Calendar.HOUR_OF_DAY), c.get(java.util.Calendar.MINUTE),
                        upcoming.optString("sub"), room.isEmpty() ? "" : " · " + room);
                nextChange = upcoming.getLong("start") - 3 * 3600_000L;
            } else {
                title = "Уроков нет";
                next = "Открой приложение, чтобы обновить расписание";
            }
        } catch (Exception e) {
            title = "Открой АСОШ Таймер";
            next = "чтобы виджет узнал расписание";
        }

        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent openPi = open == null ? null : PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        for (int id : ids) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_lesson);
            v.setTextViewText(R.id.widget_title, title);
            v.setTextViewText(R.id.widget_next, next);
            v.setTextViewText(R.id.widget_class, cls.isEmpty() ? "АСОШ Таймер" : "АСОШ Таймер · " + cls);
            if (target > now) {
                v.setViewVisibility(R.id.widget_timer, View.VISIBLE);
                v.setChronometer(R.id.widget_timer, SystemClock.elapsedRealtime() + (target - now), null, true);
                v.setChronometerCountDown(R.id.widget_timer, true);
            } else {
                v.setViewVisibility(R.id.widget_timer, View.GONE);
            }
            if (openPi != null) v.setOnClickPendingIntent(R.id.widget_root, openPi);
            mgr.updateAppWidget(id, v);
        }

        // Перерисовать в момент звонка. Неточный будильник: без особого разрешения, сдвиг — до минуты
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            PendingIntent tick = tickIntent(ctx);
            am.cancel(tick);
            if (nextChange > now) am.setWindow(AlarmManager.RTC, nextChange, 60_000L, tick);
        }
    }
}
