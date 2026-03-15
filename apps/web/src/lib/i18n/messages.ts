import { getGuestSession } from "../session/guestSession";
import enMessages from "../../messages/en.json";
import koMessages from "../../messages/ko.json";

export type Locale = "ko" | "en";

const dictionaries = {
  ko: koMessages,
  en: enMessages
} as const;

export function detectLocale(): Locale {
  if (typeof window === "undefined") {
    return "ko";
  }

  const sessionLocale = getGuestSession()?.locale;

  if (sessionLocale) {
    return sessionLocale;
  }

  return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export function t(locale: Locale, key: keyof typeof koMessages) {
  return dictionaries[locale][key] ?? dictionaries.ko[key] ?? key;
}

export function tf(locale: Locale, key: keyof typeof koMessages, values: Record<string, string | number>) {
  const template = t(locale, key);

  return Object.entries(values).reduce((current, [name, value]) => {
    return current.replaceAll(`{${name}}`, String(value));
  }, template);
}
