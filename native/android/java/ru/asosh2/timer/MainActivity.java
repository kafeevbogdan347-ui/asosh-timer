package ru.asosh2.timer;

import android.graphics.Color;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.BridgeActivity;

// Главный экран приложения. Подключаем свой плагин, через который приложение
// передаёт расписание виджету на рабочем столе.
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPlugin.class);
        super.onCreate(savedInstanceState);
        // На весь экран под статус-бар и вырез камеры и на Android 13–14 (Samsung Galaxy A и др.),
        // светлые значки: фон приложения тёмный. Для светлых тем значки меняет само приложение
        EdgeToEdge.enable(this, SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT));
    }
}
