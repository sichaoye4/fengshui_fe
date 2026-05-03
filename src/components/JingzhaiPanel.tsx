import { t, type TranslationKey } from "../i18n/ui";
import type {
  JingzhaiAffectedDecade,
  JingzhaiDecadeAnalysis,
  JingzhaiFullResponse,
  JingzhaiPersonImpactPerson,
  Language,
} from "../types/fengshui";
import { CompactDetailGrid, type CompactDetailItem } from "./CompactDetailGrid";

interface Props {
  language: Language;
  result: JingzhaiFullResponse | null;
}

const JINGZHAI_DEFAULT_YEAR_LIMIT = 50;

function textValue(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function limitedYearsRange(start?: number, end?: number, fallback?: string): string {
  if (typeof start !== "number" || typeof end !== "number") {
    return textValue(fallback);
  }
  return `${start}-${Math.min(end, JINGZHAI_DEFAULT_YEAR_LIMIT)}`;
}

function isWithinDefaultYearWindow(item: { years_start?: number; years_end?: number }, fallbackIndex: number): boolean {
  if (typeof item.years_start === "number") {
    return item.years_start <= JINGZHAI_DEFAULT_YEAR_LIMIT;
  }
  if (typeof item.years_end === "number") {
    return item.years_end <= JINGZHAI_DEFAULT_YEAR_LIMIT;
  }
  return fallbackIndex < 5;
}

function visibleDefaultDecades<T extends { years_start?: number; years_end?: number }>(items: T[]): T[] {
  return items.filter((item, index) => isWithinDefaultYearWindow(item, index));
}

function localizedStatusTone(status: string | undefined): CompactDetailItem["tone"] {
  if (status === "ok") return "good";
  if (status === "partial") return "warning";
  if (status === "not_evaluable") return "bad";
  return "neutral";
}

function diagnosisText(language: Language, decade: JingzhaiDecadeAnalysis): string {
  const diagnosis = decade.diagnosis;
  if (diagnosis) {
    return textValue(language === "en" ? diagnosis.en : diagnosis.zh, textValue(diagnosis.type));
  }
  const affliction = decade.affliction;
  if (affliction) {
    return textValue(language === "en" ? affliction.type : affliction.type_zh, textValue(affliction.type));
  }
  return t(language, "jingzhai.noAffliction" as TranslationKey);
}

function pathogenText(language: Language, decade: JingzhaiDecadeAnalysis): string {
  const pathogen = decade.pathogen;
  if (!pathogen) {
    return "-";
  }
  const bagua = language === "en" ? pathogen.bagua : pathogen.bagua_zh;
  const element = pathogen.element;
  return `${textValue(bagua)} / ${textValue(element)}`;
}

function matchingCategoryText(affectedDecades: JingzhaiAffectedDecade[]): string {
  const firstAffected = affectedDecades[0];
  const categories = firstAffected?.matching_categories ?? [];
  return categories
    .map((category) => textValue(category.label_zh ?? category.category_zh ?? category.star_name_zh, ""))
    .filter(Boolean)
    .join(", ") || "-";
}

function JingzhaiPhaseTimeline({
  language,
  phases,
}: {
  language: Language;
  phases: NonNullable<JingzhaiFullResponse["house_analysis"]["phases"]>;
}): JSX.Element | null {
  if (phases.length === 0) {
    return null;
  }
  const visiblePhases = visibleDefaultDecades(phases);
  if (visiblePhases.length === 0) {
    return null;
  }

  return (
    <article className="result-card compact-result-card">
      <h4>{t(language, "jingzhai.phasesNext50" as TranslationKey)}</h4>
      <div className="jingzhai-phase-list">
        {visiblePhases.map((phase) => (
          <div key={`${phase.phase_index}-${phase.years_range}`} className="jingzhai-phase-item">
            <span className="jingzhai-phase-index">{phase.phase_index ?? "-"}</span>
            <span>
              {limitedYearsRange(phase.years_start, phase.years_end, phase.years_range)} · {textValue(phase.lord_element)}
            </span>
            <span className="meta-text">{language === "en" ? textValue(phase.lord_source) : textValue(phase.lord_source_zh)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function JingzhaiDecadeTable({
  language,
  decades,
}: {
  language: Language;
  decades: JingzhaiDecadeAnalysis[];
}): JSX.Element | null {
  if (decades.length === 0) {
    return null;
  }
  const visibleDecades = visibleDefaultDecades(decades);
  if (visibleDecades.length === 0) {
    return null;
  }

  return (
    <details className="jingzhai-decade-details">
      <summary>{t(language, "jingzhai.decadeAnalysesNext50" as TranslationKey)}</summary>
      <div className="findings-table-wrap jingzhai-table-wrap">
        <table className="findings-table">
          <thead>
            <tr>
              <th>{t(language, "jingzhai.decade" as TranslationKey)}</th>
              <th>{t(language, "jingzhai.years" as TranslationKey)}</th>
              <th>{t(language, "jingzhai.lord" as TranslationKey)}</th>
              <th>{t(language, "jingzhai.pathogen" as TranslationKey)}</th>
              <th>{t(language, "jingzhai.diagnosis" as TranslationKey)}</th>
            </tr>
          </thead>
          <tbody>
            {visibleDecades.map((decade) => (
              <tr key={`${decade.decade_index}-${decade.years_range}`} className={decade.affliction ? "jingzhai-afflicted-row" : undefined}>
                <td>{decade.decade_index ?? "-"}</td>
                <td>{limitedYearsRange(decade.years_start, decade.years_end, decade.years_range)}</td>
                <td>{textValue(decade.lord_element)}</td>
                <td>{pathogenText(language, decade)}</td>
                <td>{diagnosisText(language, decade)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function JingzhaiPersonImpact({
  language,
  persons,
}: {
  language: Language;
  persons: JingzhaiPersonImpactPerson[];
}): JSX.Element | null {
  if (persons.length === 0) {
    return null;
  }

  return (
    <article className="result-card compact-result-card">
      <h4>{t(language, "jingzhai.personImpact" as TranslationKey)}</h4>
      <div className="jingzhai-person-grid">
        {persons.map((person) => {
          const affectedDecades = visibleDefaultDecades(person.affected_decades ?? []);
          const affected = affectedDecades.length > 0;
          return (
            <div key={person.member_id} className={`jingzhai-person-card ${affected ? "bad" : "good"}`}>
              <strong>{person.name || person.member_id}</strong>
              <CompactDetailGrid
                items={[
                  {
                    label: t(language, "jingzhai.impact" as TranslationKey),
                    value: affected ? t(language, "jingzhai.affected" as TranslationKey) : t(language, "jingzhai.notAffected" as TranslationKey),
                    tone: affected ? "bad" : "good",
                  },
                  {
                    label: t(language, "jingzhai.minggua" as TranslationKey),
                    value: `${textValue(person.minggua?.bagua_zh ?? person.minggua?.bagua)} (${textValue(person.minggua?.bagua)})`,
                  },
                  {
                    label: t(language, "jingzhai.affectedDecades" as TranslationKey),
                    value: affectedDecades.length,
                  },
                  {
                    label: t(language, "jingzhai.category" as TranslationKey),
                    value: matchingCategoryText(affectedDecades),
                  },
                ]}
              />
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function JingzhaiPanel({ language, result }: Props): JSX.Element {
  if (!result) {
    return (
      <section className="panel compact-analysis-panel jingzhai-panel">
        <h3>{t(language, "app.staticHouse.placeholderTitle")}</h3>
        <article className="result-card compact-result-card">
          <p>{t(language, "jingzhai.empty" as TranslationKey)}</p>
        </article>
      </section>
    );
  }

  const house = result.house_analysis;
  const summary = house.overall_summary;
  const reason = language === "en" ? house.reason_en : house.reason_zh;
  const attributes = house.attributes ?? {};
  const decades = house.decade_analyses ?? (house.first_decade_only ? [house.first_decade_only] : []);
  const visibleDecades = visibleDefaultDecades(decades);
  const visibleAfflictedDecades = visibleDecades.filter((decade) => decade.affliction);
  const personImpact = result.person_impact;
  const visibleAffectedPersons = personImpact?.persons.filter(
    (person) => visibleDefaultDecades(person.affected_decades ?? []).length > 0
  ).length ?? 0;
  const hasAffliction = visibleAfflictedDecades.length > 0;

  return (
    <section className="panel compact-analysis-panel jingzhai-panel">
      <h3>{t(language, "app.staticHouse.placeholderTitle")}</h3>
      <div className="compact-section-layout">
        <article className={`result-card compact-result-card ${hasAffliction ? "bad" : localizedStatusTone(house.status)}`}>
          <h4>{t(language, "jingzhai.houseBody" as TranslationKey)}</h4>
          <CompactDetailGrid
            items={[
              {
                label: t(language, "jingzhai.status" as TranslationKey),
                value: house.status,
                tone: localizedStatusTone(house.status),
              },
              {
                label: t(language, "jingzhai.afflictedDecades" as TranslationKey),
                value: `${visibleAfflictedDecades.length} / ${visibleDecades.length}`,
                tone: hasAffliction ? "bad" : "good",
              },
              {
                label: t(language, "jingzhai.sitting" as TranslationKey),
                value: `${textValue(attributes.sitting?.bagua_zh ?? attributes.sitting?.bagua)} / ${textValue(attributes.sitting?.element)}`,
              },
              {
                label: t(language, "jingzhai.floor" as TranslationKey),
                value: `${textValue(attributes.floor?.number)} / ${textValue(attributes.floor?.element)}`,
              },
              {
                label: t(language, "jingzhai.room" as TranslationKey),
                value: `${textValue(attributes.room?.index)} / ${textValue(attributes.room?.element)}`,
              },
              {
                label: t(language, "jingzhai.personsAffected" as TranslationKey),
                value: personImpact ? `${visibleAffectedPersons} / ${personImpact.total_persons}` : "-",
                tone: visibleAffectedPersons > 0 ? "bad" : "neutral",
              },
            ]}
          />
          {reason && <p className="meta-text compact-note">{reason}</p>}
        </article>

        <div className="compact-result-card">
          <JingzhaiPhaseTimeline language={language} phases={house.phases ?? []} />
          <JingzhaiPersonImpact language={language} persons={personImpact?.persons ?? []} />
        </div>
      </div>
      <JingzhaiDecadeTable language={language} decades={decades} />
    </section>
  );
}
