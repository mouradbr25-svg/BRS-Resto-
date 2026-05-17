import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en";
import fr from "./fr";
import ar from "./ar";

const STORAGE_KEY = "brs-lang";

export type Language = "en" | "fr" | "ar";

export const LANGUAGES: { code: Language; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

export function applyDirection(lang: Language) {
  const dir = LANGUAGES.find(l => l.code === lang)?.dir ?? "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
}

const savedLang = (localStorage.getItem(STORAGE_KEY) as Language) || "fr";
applyDirection(savedLang);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    lng: savedLang,
    fallbackLng: "fr",
    interpolation: { escapeValue: false },
  });

i18n.on("languageChanged", (lng: string) => {
  localStorage.setItem(STORAGE_KEY, lng);
  applyDirection(lng as Language);
});

export default i18n;
