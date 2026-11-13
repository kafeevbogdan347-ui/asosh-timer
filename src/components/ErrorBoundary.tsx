import React from 'react';
import { reportRenderError } from '../services/errorLog';

// Если при отрисовке что-то упало, вместо белого экрана показываем понятное сообщение
// и кнопку перезапуска; сама ошибка уходит в журнал ошибок для разработчиков
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  declare props: Readonly<{ children: React.ReactNode }>;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportRenderError(error, info.componentStack || '');
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0b0d12', color: '#fff', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <div style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 48 }}>😵</div>
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: '12px 0 8px' }}>Что-то пошло не так</h1>
          <p style={{ fontSize: 14, opacity: 0.75, margin: '0 0 20px' }}>Мы уже получили отчёт об ошибке. Твои данные на месте — просто перезапусти приложение.</p>
          <button type="button" onClick={() => location.reload()} style={{ padding: '12px 20px', borderRadius: 14, border: 0, background: '#2dd4bf', color: '#0b0d12', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
            🔄 Перезапустить
          </button>
        </div>
      </div>
    );
  }
}
