package ru.asosh2.timer;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

// Главный экран приложения. Подключаем свой плагин, через который приложение
// передаёт расписание виджету на рабочем столе.
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
