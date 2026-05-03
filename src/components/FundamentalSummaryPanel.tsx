import { t, type TranslationKey } from "../i18n/ui";
import type { FundamentalMissingField, Language, RuleEvaluationResponse } from "../types/fengshui";

interface Props {
  language: Language;
  result: RuleEvaluationResponse | null;
  missingFields: FundamentalMissingField[];
}

const MISSING_FIELD_LABELS: Record<FundamentalMissingField, TranslationKey> = {
  "house.sitting_bagua": "fund.missing.house.sittingBagua",
  "house.facing_bagua": "fund.missing.house.facingBagua",
  "house.current_floor": "fund.missing.house.currentFloor",
  "house.room_index": "fund.missing.house.roomIndex",
  "members.empty": "bazhai.missing.members.empty",
};

export function FundamentalSummaryPanel({ language, result, missingFields }: Props): JSX.Element {
  return (
    <section className="panel results-panel">
      <h3>{t(language, "fund.title")}</h3>

      {missingFields.length > 0 && (
        <article className="result-card">
          <h4>{t(language, "fund.missingTitle")}</h4>
          <p>{t(language, "fund.missingDesc")}</p>
          <ul>
            {missingFields.map((field) => (
              <li key={field}>{t(language, MISSING_FIELD_LABELS[field])}</li>
            ))}
          </ul>
        </article>
      )}

      {!result ? (
        <p>{t(language, "fund.empty")}</p>
      ) : (
        <div className="result-cards fundamental-cards">
          <article className="result-card fundamental-card-summary">
            <h4>{t(language, "fund.summary")}</h4>
            <p>
              {t(language, "fund.matched")}: {result.matched_count}
            </p>
            <p>
              {t(language, "fund.notMatched")}: {result.not_matched_count}
            </p>
            <p>
              {t(language, "fund.notEvaluable")}: {result.not_evaluable_count}
            </p>
          </article>

          <article className="result-card fundamental-card-static">
            <h4>{t(language, "fund.staticHouse")}</h4>
            <p>
              {t(language, "fund.score")}: {result.static_house_score ?? "-"}
            </p>
            <p>
              {t(language, "fund.status")}:{" "}
              {language === "en" ? result.static_house_details.status_en : result.static_house_details.status_zh}
            </p>
            <p>
              {t(language, "fund.selfElement")}: {result.static_house_details.self_element ?? "-"}
            </p>
          </article>
        </div>
      )}
    </section>
  );
}
