#!/usr/bin/env bash
# Добавляет виджет и плагин в сгенерированный проект android/ (после `npx cap add android`).
# Запуск из корня репозитория: bash native/android/install.sh
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
APP=android/app/src/main
mkdir -p "$APP/java/ru/asosh2/timer" "$APP/res/layout" "$APP/res/xml" "$APP/res/drawable" "$APP/res/values"
cp "$SRC"/java/ru/asosh2/timer/*.java "$APP/java/ru/asosh2/timer/"
cp "$SRC"/res/layout/*.xml "$APP/res/layout/"
cp "$SRC"/res/xml/*.xml "$APP/res/xml/"
cp "$SRC"/res/drawable/*.xml "$APP/res/drawable/"
cat > "$APP/res/values/widget_strings.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="widget_description">Сколько осталось до конца урока и какой кабинет следующий</string>
    <string name="day_widget_description">Все уроки на сегодня или завтра: время, предмет и кабинет</string>
</resources>
XML
# Виджет в манифест (один раз)
if ! grep -q 'LessonWidget' "$APP/AndroidManifest.xml"; then
  sed -i 's#</application>#    <receiver android:name=".LessonWidget" android:exported="false" android:label="АСОШ Таймер: урок">\n            <intent-filter>\n                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\n            </intent-filter>\n            <meta-data android:name="android.appwidget.provider" android:resource="@xml/lesson_widget_info" />\n        </receiver>\n    </application>#' "$APP/AndroidManifest.xml"
fi
grep -c LessonWidget "$APP/AndroidManifest.xml"
# Второй виджет — уроки на день
if ! grep -q 'DayWidget' "$APP/AndroidManifest.xml"; then
  sed -i 's#</application>#    <receiver android:name=".DayWidget" android:exported="false" android:label="АСОШ Таймер: уроки на день">\n            <intent-filter>\n                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\n            </intent-filter>\n            <meta-data android:name="android.appwidget.provider" android:resource="@xml/day_widget_info" />\n        </receiver>\n    </application>#' "$APP/AndroidManifest.xml"
fi
grep -c DayWidget "$APP/AndroidManifest.xml"
# Напоминания о звонках точно в срок. На Android 14 разрешение SCHEDULE_EXACT_ALARM по умолчанию выключено,
# и телефон сдвигал уведомления на 10–15 минут; USE_EXACT_ALARM выдаётся само (APK ставится не из Google Play)
if ! grep -q 'USE_EXACT_ALARM' "$APP/AndroidManifest.xml"; then
  sed -i 's#<application#<uses-permission android:name="android.permission.USE_EXACT_ALARM" />\n    <application#' "$APP/AndroidManifest.xml"
fi
grep -c USE_EXACT_ALARM "$APP/AndroidManifest.xml"
# Тёмный фон окна вместо белого: на телефонах со старым WebView (часть Samsung) приложение
# рисуется с отступами под статус-бар и панель кнопок, и там были бы белые полосы
cat > "$APP/res/values/asosh_colors.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="asosh_bg">#060d1f</color>
</resources>
XML
if ! grep -q 'asosh_bg' "$APP/res/values/styles.xml"; then
  sed -i 's#<item name="windowNoTitle">true</item>#<item name="windowNoTitle">true</item>\n        <item name="android:windowBackground">@color/asosh_bg</item>#' "$APP/res/values/styles.xml"
fi
grep -c asosh_bg "$APP/res/values/styles.xml"
