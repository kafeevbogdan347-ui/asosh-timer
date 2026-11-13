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
</resources>
XML
# Виджет в манифест (один раз)
if ! grep -q 'LessonWidget' "$APP/AndroidManifest.xml"; then
  sed -i 's#</application>#    <receiver android:name=".LessonWidget" android:exported="false" android:label="АСОШ Таймер: урок">\n            <intent-filter>\n                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\n            </intent-filter>\n            <meta-data android:name="android.appwidget.provider" android:resource="@xml/lesson_widget_info" />\n        </receiver>\n    </application>#' "$APP/AndroidManifest.xml"
fi
grep -c LessonWidget "$APP/AndroidManifest.xml"
