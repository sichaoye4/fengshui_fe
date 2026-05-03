import { t } from "../i18n/ui";
import type { Language } from "../types/fengshui";

interface Props {
  language: Language;
  onChange: (language: Language) => void;
}

export function LanguageToggle({ language, onChange }: Props): JSX.Element {
  return (
    <div className="language-toggle" role="group" aria-label={t(language, "language.aria")}>
      <button
        type="button"
        className={language === "en" ? "active" : ""}
        onClick={() => onChange("en")}
      >
        {t(language, "language.en")}
      </button>
      <button
        type="button"
        className={language === "zh" ? "active" : ""}
        onClick={() => onChange("zh")}
      >
        {t(language, "language.zh")}
      </button>
    </div>
  );
}

