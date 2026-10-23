import { buildPresentationHtml, buildPresentationMarkdown } from './presentationContent';

function downloadText(content: string, type: string, fileName: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPresentationHtml() {
  downloadText(buildPresentationHtml(), 'text/html;charset=utf-8', 'АСОШ_Таймер_презентация.html');
}

export function downloadPresentationMarkdown() {
  downloadText(buildPresentationMarkdown(), 'text/markdown;charset=utf-8', 'АСОШ_Таймер_презентация_и_посты.md');
}

// Слайды на сайте приложения (presentation.html собирается при сборке из presentationContent.ts)
export function openPresentationSlides() {
  window.open(`${import.meta.env.BASE_URL}presentation.html`, '_blank', 'noopener');
}
