import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "fr", "nl", "de"],
    debug: process.env.NODE_ENV === "development",
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
      requestOptions: { cache: "no-store" },
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

// L'attribut est figé à "en" dans index.html. Le framework Retorik le lit pour
// choisir sa langue au démarrage, et c'est le seul point d'entrée disponible
// avant que son store ne soit monté.
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
