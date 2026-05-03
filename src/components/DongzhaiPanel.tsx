import { t, type TranslationKey } from "../i18n/ui";
import type {
  DongzhaiFloorEvaluateResponse,
  DongzhaiFloorEvaluation,
  DongzhaiMissingField,
  Language,
} from "../types/fengshui";
import { CompactDetailGrid, type CompactDetailItem } from "./CompactDetailGrid";

interface Props {
  language: Language;
  result: DongzhaiFloorEvaluateResponse | null;
  missingFields: DongzhaiMissingField[];
}

const MISSING_FIELD_LABELS: Record<DongzhaiMissingField, TranslationKey> = {
  "house.facing_bagua": "dongzhai.missing.house.facingBagua",
  "house.door_bagua": "dongzhai.missing.house.doorBagua",
  "house.total_floors": "dongzhai.missing.house.totalFloors",
  "house.current_floor": "dongzhai.missing.house.currentFloor",
  "house.current_floor.within_total_floors": "dongzhai.missing.house.currentFloorWithinTotal",
};

function localizedResultLabel(language: Language, result: DongzhaiFloorEvaluateResponse): string {
  return language === "en" ? result.overall_label_en : result.overall_label_zh;
}

function localizedStarName(language: Language, floor: DongzhaiFloorEvaluation | null): string {
  if (!floor) return "-";
  const name = language === "en" ? floor.star_name_en : floor.star_name_zh;
  return name ?? floor.star_code ?? "-";
}

function floorTone(floor: DongzhaiFloorEvaluation | null): CompactDetailItem["tone"] {
  if (floor?.is_auspicious === true) return "good";
  if (floor?.is_auspicious === false) return "bad";
  return "neutral";
}

function warningText(language: Language, warning: Record<string, string>): string {
  return warning[language] ?? warning.message_en ?? warning.message_zh ?? warning.message ?? Object.values(warning)[0] ?? "-";
}

function DongzhaiFloorTable({
  language,
  result,
}: {
  language: Language;
  result: DongzhaiFloorEvaluateResponse;
}): JSX.Element | null {
  if (result.floor_sequence.length === 0) {
    return null;
  }

  return (
    <details className="dongzhai-sequence-details">
      <summary>{t(language, "dongzhai.floorSequence" as TranslationKey)}</summary>
      <div className="findings-table-wrap dongzhai-table-wrap">
        <table className="findings-table">
          <thead>
            <tr>
              <th>{t(language, "dongzhai.floor" as TranslationKey)}</th>
              <th>{t(language, "dongzhai.star" as TranslationKey)}</th>
              <th>{t(language, "dongzhai.element" as TranslationKey)}</th>
              <th>{t(language, "dongzhai.result" as TranslationKey)}</th>
            </tr>
          </thead>
          <tbody>
            {result.floor_sequence.map((floor) => {
              const isCurrent = floor.floor === result.current_floor;
              const resultLabel = language === "en" ? floor.label_en : floor.label_zh;
              return (
                <tr key={floor.floor} className={isCurrent ? "dongzhai-current-floor-row" : undefined}>
                  <td>{floor.floor}</td>
                  <td>{localizedStarName(language, floor)}</td>
                  <td>{floor.star_element_code ?? "-"}</td>
                  <td>{resultLabel ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function DongzhaiPanel({ language, result, missingFields }: Props): JSX.Element {
  if (missingFields.length > 0) {
    return (
      <section className="panel compact-analysis-panel dongzhai-panel">
        <h3>{t(language, "app.tabFull.dongzhai" as TranslationKey)}</h3>
        <article className="result-card compact-result-card">
          <h4>{t(language, "dongzhai.missingTitle" as TranslationKey)}</h4>
          <p className="meta-text">{t(language, "dongzhai.missingDesc" as TranslationKey)}</p>
          <ul className="compact-list">
            {missingFields.map((field) => (
              <li key={field}>{t(language, MISSING_FIELD_LABELS[field])}</li>
            ))}
          </ul>
        </article>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="panel compact-analysis-panel dongzhai-panel">
        <h3>{t(language, "app.tabFull.dongzhai" as TranslationKey)}</h3>
        <article className="result-card compact-result-card">
          <p>{t(language, "dongzhai.empty" as TranslationKey)}</p>
        </article>
      </section>
    );
  }

  if (!result.evaluable) {
    return (
      <section className="panel compact-analysis-panel dongzhai-panel">
        <h3>{t(language, "app.tabFull.dongzhai" as TranslationKey)}</h3>
        <article className="result-card compact-result-card bad">
          <h4>{t(language, "dongzhai.notEvaluable" as TranslationKey)}</h4>
          <p>{language === "en" ? result.not_evaluable_reason_en : result.not_evaluable_reason_zh}</p>
        </article>
      </section>
    );
  }

  const currentFloor = result.current_floor_evaluation;
  const overallTone: CompactDetailItem["tone"] =
    result.overall_is_auspicious === true ? "good" : result.overall_is_auspicious === false ? "bad" : "neutral";
  const primaryDetails: CompactDetailItem[] = [
    {
      label: t(language, "dongzhai.currentFloor" as TranslationKey),
      value: result.current_floor,
    },
    {
      label: t(language, "dongzhai.overall" as TranslationKey),
      value: localizedResultLabel(language, result),
      tone: overallTone,
    },
    {
      label: t(language, "dongzhai.star" as TranslationKey),
      value: localizedStarName(language, currentFloor),
      tone: floorTone(currentFloor),
    },
    {
      label: t(language, "dongzhai.element" as TranslationKey),
      value: currentFloor?.star_element_code ?? "-",
    },
    {
      label: t(language, "dongzhai.method" as TranslationKey),
      value: language === "en" ? result.method_en : result.method_zh,
    },
    {
      label: t(language, "dongzhai.baseBagua" as TranslationKey),
      value: `${result.base_bagua_zh || result.base_bagua} (${result.base_bagua_code})`,
    },
    {
      label: t(language, "dongzhai.buildingFacing" as TranslationKey),
      value: `${result.building_facing_bagua_zh || result.building_facing_bagua} (${result.building_facing_bagua_code})`,
    },
    {
      label: t(language, "dongzhai.doorBagua" as TranslationKey),
      value: `${result.door_bagua_zh || result.door_bagua} (${result.door_bagua_code})`,
    },
  ];

  return (
    <section className="panel compact-analysis-panel dongzhai-panel">
      <h3>{t(language, "app.tabFull.dongzhai" as TranslationKey)}</h3>
      <div className="compact-section-layout">
        <article className={`result-card compact-result-card ${overallTone}`}>
          <h4>{t(language, "dongzhai.currentFloorEvaluation" as TranslationKey)}</h4>
          <CompactDetailGrid items={primaryDetails} />
          {result.base_rule && <p className="meta-text compact-note">{result.base_rule}</p>}
        </article>

        <article className="result-card compact-result-card">
          <h4>{t(language, "dongzhai.floorSequenceTitle" as TranslationKey)}</h4>
          <CompactDetailGrid
            items={[
              { label: t(language, "dongzhai.totalFloors" as TranslationKey), value: result.total_floors },
              { label: t(language, "dongzhai.methodCode" as TranslationKey), value: result.method_code },
            ]}
          />
          {result.warnings.length > 0 && (
            <ul className="compact-list dongzhai-warning-list">
              {result.warnings.map((warning, index) => (
                <li key={`${warning.code ?? "warning"}-${index}`}>{warningText(language, warning)}</li>
              ))}
            </ul>
          )}
          <DongzhaiFloorTable language={language} result={result} />
        </article>
      </div>
    </section>
  );
}
