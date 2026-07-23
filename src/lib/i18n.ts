import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import ja from "@/locales/ja.json";
import ko from "@/locales/ko.json";
import zh from "@/locales/zh.json";

/**
 * Portal i18n setup -- deliberately different in spirit from the
 * dashboard's language switcher. The portal never shows a full 5-language
 * picker to the employee; their displayed language is DECIDED by the
 * company (an Owner/Manager sets it via the dashboard's Invite/Employee
 * Detail pages -- see User.language on the backend). The only choice the
 * employee makes themselves, in Settings, is a binary toggle: switch back
 * to English, or switch back to whatever their company assigned them.
 *
 * All 5 locale resources still need to be registered here regardless,
 * since an employee could be assigned any one of them -- this file just
 * initializes i18next with every supported language's translation data.
 * The ACTIVE language is set at runtime once GET /me resolves and we know
 * the employee's actual assigned language -- see PortalShell, which calls
 * i18n.changeLanguage() after that fetch completes.
 */
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
    ko: { translation: ko },
    zh: { translation: zh },
    hi: { translation: hi },
  },
  lng: "en", // placeholder until GET /me resolves and PortalShell syncs the real value
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;