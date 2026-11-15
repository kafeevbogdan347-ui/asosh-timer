package ru.asosh2.timer;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

// Виджет «Уроки на день»: все уроки сегодня (после последнего звонка — завтра) с временем и кабинетом.
// Прошедшие уроки серые, текущий — оранжевый. Расписание берёт то же, что и виджет-таймер (LessonWidget).
public class DayWidget extends AppWidgetProvider {
    static final String ACTION_TICK = "ru.asosh2.timer.DAY_WIDGET_TICK";
    private static final int[] ROWS = {
        R.id.day_row1, R.id.day_row2, R.id.day_row3, R.id.day_row4,
        R.id.day_row5, R.id.day_row6, R.id.day_row7, R.id.day_row8
    };
    private static final long DAY = 24L * 3600_000L;

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
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, DayWidget.class));
        if (ids.length > 0) render(ctx, mgr, ids);
    }

    private static PendingIntent tickIntent(Context ctx) {
        Intent i = new Intent(ctx, DayWidget.class).setAction(ACTION_TICK);
        return PendingIntent.getBroadcast(ctx, 2, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static String roomLabel(String room) {
        if (room == null || room.isEmpty()) return "";
        return Character.isDigit(room.charAt(0)) ? "каб. " + room : room;
    }

    private static String hm(long ms) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(ms);
        return String.format(Locale.US, "%02d:%02d", c.get(Calendar.HOUR_OF_DAY), c.get(Calendar.MINUTE));
    }

    private static long dayStart(long ms) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(ms);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    private static void render(Context ctx, AppWidgetManager mgr, int[] ids) {
        SharedPreferences prefs = ctx.getSharedPreferences(LessonWidget.PREFS, Context.MODE_PRIVATE);
        String cls = prefs.getString(LessonWidget.KEY_CLASS, "");
        long now = System.currentTimeMillis();

        List<JSONObject> all = new ArrayList<>();
        try {
            JSONArray list = new JSONArray(prefs.getString(LessonWidget.KEY_LESSONS, "[]"));
            for (int i = 0; i < list.length(); i++) all.add(list.getJSONObject(i));
        } catch (Exception e) {
            // нет расписания — покажем подсказку
        }

        // Какой день показывать: самый ранний, где ещё остались уроки
        long showDay = -1;
        for (JSONObject l : all) {
            if (l.optLong("end") > now) {
                long d = dayStart(l.optLong("start"));
                if (showDay < 0 || d < showDay) showDay = d;
            }
        }
        List<JSONObject> day = new ArrayList<>();
        if (showDay >= 0) {
            for (JSONObject l : all) {
                if (dayStart(l.optLong("start")) == showDay) day.add(l);
            }
        }
        Collections.sort(day, new Comparator<JSONObject>() {
            @Override
            public int compare(JSONObject a, JSONObject b) {
                return Long.compare(a.optLong("start"), b.optLong("start"));
            }
        });

        long today = dayStart(now);
        String header;
        if (day.isEmpty()) header = "Уроков нет";
        else if (showDay == today) header = "Сегодня";
        else if (showDay == dayStart(today + DAY + 3600_000L)) header = "Завтра";
        else header = "Ближайшие уроки";
        if (!cls.isEmpty()) header += " · " + cls;

        // Когда перерисовать: ближайший звонок или полночь (тогда «Завтра» станет «Сегодня»)
        long nextChange = dayStart(today + DAY + 3600_000L);
        for (JSONObject l : day) {
            long s = l.optLong("start");
            long e = l.optLong("end");
            if (s > now && s < nextChange) nextChange = s;
            if (e > now && e < nextChange) nextChange = e;
        }

        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent openPi = open == null ? null : PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        for (int id : ids) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_day);
            v.setTextViewText(R.id.day_title, header);
            v.setViewVisibility(R.id.day_empty, day.isEmpty() ? View.VISIBLE : View.GONE);
            for (int r = 0; r < ROWS.length; r++) {
                if (r < day.size()) {
                    JSONObject l = day.get(r);
                    long s = l.optLong("start");
                    long e = l.optLong("end");
                    String room = roomLabel(l.optString("room"));
                    String text = l.optInt("num") + ". " + hm(s) + "  " + l.optString("sub") + (room.isEmpty() ? "" : " · " + room);
                    int color = e <= now ? 0xFF5C6F8F : (s <= now ? 0xFFF59E0B : 0xFFF5F7FA);
                    v.setTextViewText(ROWS[r], text);
                    v.setTextColor(ROWS[r], color);
                    v.setViewVisibility(ROWS[r], View.VISIBLE);
                } else {
                    v.setViewVisibility(ROWS[r], View.GONE);
                }
            }
            if (openPi != null) v.setOnClickPendingIntent(R.id.day_root, openPi);
            mgr.updateAppWidget(id, v);
        }

        // Неточный будильник, как у виджета-таймера: без особого разрешения, сдвиг — до минуты
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            PendingIntent tick = tickIntent(ctx);
            am.cancel(tick);
            if (nextChange > now) am.setWindow(AlarmManager.RTC, nextChange, 60_000L, tick);
        }
    }
}
