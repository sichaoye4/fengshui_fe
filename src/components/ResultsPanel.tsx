import { t, type TranslationKey } from "../i18n/ui";
import type { FindingFilter, FindingStatus, Language, RuleFinding } from "../types/fengshui";

interface Props {
  language: Language;
  titleKey: TranslationKey;
  findings: RuleFinding[];
  filter: FindingFilter;
  onFilterChange: (filter: FindingFilter) => void;
  emptyKey: TranslationKey;
  showMitigationHighlights?: boolean;
}

function severityClass(severity: string): string {
  const normalized = severity.toLowerCase();
  if (normalized === "high") {
    return "sev-high";
  }
  if (normalized === "medium") {
    return "sev-medium";
  }
  if (normalized === "low") {
    return "sev-low";
  }
  return "sev-info";
}

const FILTER_KEYS: Record<FindingFilter, TranslationKey> = {
  all: "results.filter.all",
  matched: "results.filter.matched",
  not_matched: "results.filter.notMatched",
  not_evaluable: "results.filter.notEvaluable"
};

const STATUS_KEYS: Record<FindingStatus, TranslationKey> = {
  matched: "results.status.matched",
  not_matched: "results.status.notMatched",
  not_evaluable: "results.status.notEvaluable"
};

export function ResultsPanel({
  language,
  titleKey,
  findings,
  filter,
  onFilterChange,
  emptyKey,
  showMitigationHighlights = false
}: Props): JSX.Element {
  const visibleFindings =
    filter === "all" ? findings : findings.filter((item) => item.status === filter);

  const matchedCount = findings.filter((item) => item.status === "matched").length;
  const notMatchedCount = findings.filter((item) => item.status === "not_matched").length;
  const notEvaluableCount = findings.filter((item) => item.status === "not_evaluable").length;

  const mitigationMatches = showMitigationHighlights
    ? findings.filter((item) => item.formula_id.startsWith("MIT-") && item.status === "matched")
    : [];

  return (
    <section className="panel results-panel">
      <h3>{t(language, titleKey)}</h3>

      {!findings.length ? (
        <p>{t(language, emptyKey)}</p>
      ) : (
        <>
          <div className="result-cards single-row">
            <article className="result-card">
              <h4>{t(language, "results.summary")}</h4>
              <p>
                {t(language, "results.matched")}: {matchedCount}
              </p>
              <p>
                {t(language, "results.notMatched")}: {notMatchedCount}
              </p>
              <p>
                {t(language, "results.notEvaluable")}: {notEvaluableCount}
              </p>
            </article>
          </div>

          {showMitigationHighlights && (
            <article className="result-card mitigation">
              <h4>{t(language, "results.mitigationHighlights")}</h4>
              {mitigationMatches.length ? (
                <ul>
                  {mitigationMatches.map((item) => (
                    <li key={item.formula_id}>{language === "en" ? item.message_en : item.message_zh}</li>
                  ))}
                </ul>
              ) : (
                <p>{t(language, "results.noMitigation")}</p>
              )}
            </article>
          )}

          <div className="filter-row">
            {(["all", "matched", "not_matched", "not_evaluable"] as FindingFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                className={item === filter ? "active" : ""}
                onClick={() => onFilterChange(item)}
              >
                {t(language, FILTER_KEYS[item])}
              </button>
            ))}
          </div>

          <div className="findings-table-wrap">
            <table className="findings-table">
              <thead>
                <tr>
                  <th>{t(language, "results.table.id")}</th>
                  <th>{t(language, "results.table.title")}</th>
                  <th>{t(language, "results.table.status")}</th>
                  <th>{t(language, "results.table.severity")}</th>
                  <th>{t(language, "results.table.message")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleFindings.map((item) => (
                  <tr key={item.formula_id}>
                    <td>{item.formula_id}</td>
                    <td>{language === "en" ? item.title_en : item.title_zh}</td>
                    <td>{t(language, STATUS_KEYS[item.status])}</td>
                    <td>
                      <span className={`severity-pill ${severityClass(item.severity)}`}>{item.severity}</span>
                    </td>
                    <td>{language === "en" ? item.message_en : item.message_zh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

