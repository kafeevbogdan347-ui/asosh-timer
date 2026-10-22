export interface CalcState {
  display: string;
  expression: string;
  history: string[];
}

export function evaluateSafe(expr: string): { success: boolean; result: string; error?: string } {
  try {
    let clean = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/,/g, '.')
      .replace(/π/g, `${Math.PI}`)
      .replace(/e/g, `${Math.E}`)
      .replace(/\^/g, '**');

    // Replace square roots: √(number or expr) -> Math.sqrt(...)
    clean = clean.replace(/√(\d+(?:\.\d+)?)/g, 'Math.sqrt($1)');

    // Replace percentages: e.g. 50% -> (50/100)
    clean = clean.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');

    // Validate safe characters only
    if (!/^[0-9+\-*/().\s*MathsqrtPIE]+$/.test(clean)) {
      return { success: false, result: '0', error: 'Неверные символы' };
    }

    // Evaluate safely via Function without accessing window/DOM
    const fn = new Function(`"use strict"; return (${clean});`);
    const val = fn();

    if (typeof val !== 'number' || isNaN(val)) {
      return { success: false, result: '0', error: 'Ошибка' };
    }

    if (!isFinite(val)) {
      return { success: false, result: '∞', error: 'Деление на ноль' };
    }

    // Format output cleanly
    const formatted = parseFloat(val.toFixed(8)).toString();
    return { success: true, result: formatted };
  } catch {
    return { success: false, result: '0', error: 'Ошибка выражения' };
  }
}
