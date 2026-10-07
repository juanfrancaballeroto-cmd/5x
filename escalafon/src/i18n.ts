import es from '../i18n/es.json';
import en from '../i18n/en.json';

export type Lang = 'es' | 'en';
const dicts: Record<Lang, Record<string, string>> = { es, en };
let lang: Lang = 'es';

export function setLang(l: Lang) {
  lang = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}
export function getLang(): Lang {
  return lang;
}

export function has(key: string): boolean {
  return key in dicts[lang] || key in dicts.es;
}

/** Looks a key up in the current language, falls back to Spanish, then to the key itself. */
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? dicts.es[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function fmtNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
    useGrouping: true,
  }).format(n);
}

export function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${fmtNumber(abs / 1_000_000, 2)} M€`;
  if (abs >= 10_000) return `${sign}${fmtNumber(Math.round(abs / 1000))} k€`;
  return `${sign}${fmtNumber(Math.round(abs))} €`;
}

export const dictionaries = dicts;
