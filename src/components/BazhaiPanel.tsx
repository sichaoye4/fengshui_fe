import { t, type TranslationKey } from "../i18n/ui";
import type { BazhaiMissingField, BazhaiPersonHouseResponse, Language } from "../types/fengshui";

interface Props {
  language: Language;
  result: BazhaiPersonHouseResponse | null;
  missingFields: BazhaiMissingField[];
}

const MISSING_FIELD_LABELS: Record<BazhaiMissingField, TranslationKey> = {
  "house.sitting_bagua": "bazhai.missing.house.sittingBagua",
  "members.empty": "bazhai.missing.members.empty"
};

function renderGroupLabel(
  language: Language,
  group: { group_en?: string; group_zh?: string; group_code?: string } | undefined
): string {
  if (!group) {
    return "-";
  }
  if (language === "en") {
    return group.group_en ?? group.group_code ?? "-";
  }
  return group.group_zh ?? group.group_code ?? "-";
}

export function BazhaiPanel({ language, result, missingFields }: Props): JSX.Element {
  return (
    <section className="panel bazhai-panel">
      <h3>{t(language, "bazhai.title")}</h3>

      {missingFields.length > 0 && (
        <article className="result-card">
          <h4>{t(language, "bazhai.missingTitle")}</h4>
          <p>{t(language, "bazhai.missingDesc")}</p>
          <ul>
            {missingFields.map((field) => (
              <li key={field}>{t(language, MISSING_FIELD_LABELS[field])}</li>
            ))}
          </ul>
        </article>
      )}

      {!missingFields.length && !result && (
        <article className="result-card">
          <p>{t(language, "bazhai.empty")}</p>
        </article>
      )}

      {!missingFields.length && result && (
        <>
          <article className={`result-card bazhai-overall ${result.overall_is_auspicious ? "good" : "bad"}`}>
            <h4>{t(language, "bazhai.overall")}</h4>
            <p>
              {t(language, "bazhai.compatibility")}:{" "}
              {language === "en" ? result.overall_label_en : result.overall_label_zh}
            </p>
            <p>
              {t(language, "bazhai.star")}:{" "}
              {language === "en" ? result.star_relation.star_name_en : result.star_relation.star_name_zh}
              {result.star_relation.star_code ? ` (${result.star_relation.star_code})` : ""}
            </p>
          </article>

          <div className="result-cards bazhai-cards">
            <article className="result-card">
              <h4>{t(language, "bazhai.person")}</h4>
              <p>
                {t(language, "bazhai.mingGua")}: {result.person_minggua.minggua_code ?? "-"}
              </p>
              <p>
                {t(language, "bazhai.group")}: {renderGroupLabel(language, result.person_minggua.group)}
              </p>
            </article>

            <article className="result-card">
              <h4>{t(language, "bazhai.house")}</h4>
              <p>
                {t(language, "bazhai.sittingBagua")}: {result.house_bagua_code}
              </p>
              <p>
                {t(language, "bazhai.group")}: {renderGroupLabel(language, result.house_group)}
              </p>
            </article>

            <article className="result-card">
              <h4>{t(language, "bazhai.groupMatch")}</h4>
              <p>
                {result.group_match
                  ? t(language, "bazhai.groupMatched")
                  : t(language, "bazhai.groupDifferent")}
              </p>
              <p>
                {t(language, "bazhai.tier")}:{" "}
                {language === "en" ? result.star_relation.tier_en : result.star_relation.tier_zh}
              </p>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
