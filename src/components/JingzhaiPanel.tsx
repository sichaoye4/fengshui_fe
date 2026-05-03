import { t, type TranslationKey } from "../i18n/ui";
import type {
  JingzhaiAffectedDecade,
  JingzhaiDecadeAnalysis,
  JingzhaiDoorAnalysis,
  JingzhaiFullResponse,
  JingzhaiPersonImpactPerson,
  Language,
} from "../types/fengshui";
import { CompactDetailGrid, type CompactDetailItem } from "./CompactDetailGrid";

// ── Wuxing (五行) relationship helpers ──

const WUXING_CANONICAL: Record<string, string> = {
  WOOD: "WOOD", FIRE: "FIRE", EARTH: "EARTH", METAL: "METAL", WATER: "WATER",
  木: "WOOD", 火: "FIRE", 土: "EARTH", 金: "METAL", 水: "WATER",
};

const WUXING_GENERATES: Record<string, string> = {
  WOOD: "FIRE", FIRE: "EARTH", EARTH: "METAL", METAL: "WATER", WATER: "WOOD",
};

const WUXING_CONTROLS: Record<string, string> = {
  WOOD: "EARTH", EARTH: "WATER", WATER: "FIRE", FIRE: "METAL", METAL: "WOOD",
};

function canonWuxing(el: string | null | undefined): string | null {
  return el ? (WUXING_CANONICAL[el] ?? null) : null;
}

function getWuxingRelation(source: string, target: string): string | null {
  const s = canonWuxing(source);
  const t = canonWuxing(target);
  if (!s || !t) return null;
  if (s === t) return "比助";
  if (WUXING_GENERATES[s] === t) return "生出";
  if (WUXING_GENERATES[t] === s) return "生入";
  if (WUXING_CONTROLS[s] === t) return "克出";
  if (WUXING_CONTROLS[t] === s) return "克入";
  return null;
}

function formatWuxingRelation(language: Language, sourceEl: string, targetEl: string): string {
  const relation = getWuxingRelation(sourceEl, targetEl);
  if (!relation) return "—";

  const zhSource = WUXING_CANONICAL[sourceEl] ? (sourceEl.length <= 2 ? sourceEl : { WOOD: "木", FIRE: "火", EARTH: "土", METAL: "金", WATER: "水" }[WUXING_CANONICAL[sourceEl]!]) : sourceEl;
  const zhTarget = WUXING_CANONICAL[targetEl] ? (targetEl.length <= 2 ? targetEl : { WOOD: "木", FIRE: "火", EARTH: "土", METAL: "金", WATER: "水" }[WUXING_CANONICAL[targetEl]!]) : targetEl;

  if (language === "zh") {
    if (relation === "比助") return `${zhSource}同${zhTarget}（比助）`;
    const relChar = relation.startsWith("生") ? "生" : "克";
    return `${zhSource}${relChar}${zhTarget}（${relation}）`;
  }

  const enNames: Record<string, string> = { WOOD: "Wood", FIRE: "Fire", EARTH: "Earth", METAL: "Metal", WATER: "Water" };
  const s = enNames[canonWuxing(sourceEl) ?? ""] ?? sourceEl;
  const t = enNames[canonWuxing(targetEl) ?? ""] ?? targetEl;
  if (relation === "比助") return `${s} = ${t} (same element)`;
  const action = relation.startsWith("生") ? "generates" : "controls";
  return `${s} ${action} ${t} (${relation})`;
}

// ── Component ──

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

function JingzhaiDoorSection({
  language,
  doorAnalysis,
  decade,
}: {
  language: Language;
  doorAnalysis: JingzhaiDoorAnalysis;
  decade: JingzhaiDecadeAnalysis;
}): JSX.Element | null {
  const recommendation = decade.door_recommendation;
  const rootLabel = (code: string): string =>
    language === "zh" ? code : code;

  const doorRows = [
    { key: "center_door" as const, label: t(language, "jingzhai.doorCenter" as TranslationKey) },
    { key: "dragon_door" as const, label: t(language, "jingzhai.doorDragon" as TranslationKey) },
    { key: "tiger_door" as const, label: t(language, "jingzhai.doorTiger" as TranslationKey) },
  ];

  return (
    <article className="result-card compact-result-card">
      <h4>{t(language, "jingzhai.doorAnalysis" as TranslationKey)}</h4>
      {recommendation && (
        <p className="jingzhai-door-recommendation">
          <strong>{t(language, "jingzhai.recommendation" as TranslationKey)}: </strong>
          {language === "zh" ? recommendation.rationale_zh : recommendation.rationale_en}
        </p>
      )}
      <div className="findings-table-wrap jingzhai-table-wrap">
        <table className="findings-table jingzhai-door-table">
          <thead>
            <tr>
              <th>{t(language, "jingzhai.doorPosition" as TranslationKey)}</th>
              <th>{t(language, "jingzhai.doorBagua" as TranslationKey)}</th>
              <th>{t(language, "jingzhai.doorElement" as TranslationKey)}</th>
              <th>{t(language, "jingzhai.doorRelation" as TranslationKey)}</th>
              {recommendation && <th>{t(language, "jingzhai.doorScore" as TranslationKey)}</th>}
            </tr>
          </thead>
          <tbody>
            {doorRows.map(({ key, label }) => {
              const door = doorAnalysis[key];
              if (!door) return null;
              const scored = recommendation?.door_options?.find((o) => o.position === key);
              return (
                <tr
                  key={key}
                  className={
                    recommendation?.recommended_keys?.includes(key)
                      ? "jingzhai-door-recommended"
                      : undefined
                  }
                >
                  <td>{label}</td>
                  <td>{rootLabel(door.bagua_zh ?? door.bagua)}</td>
                  <td>{rootLabel(door.element)}</td>
                  <td>{rootLabel(door.relation)}</td>
                  {recommendation && <td>{scored?.score ?? "-"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
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
          {/* Wuxing relationships for 宅体 attributes */}
          <div className="jingzhai-wuxing-relations">
            <h5 className="jingzhai-wuxing-title">{t(language, "jingzhai.wuxingRelations" as TranslationKey)}</h5>
            <div className="jingzhai-wuxing-row">
              <span className="jingzhai-wuxing-pair">{t(language, "jingzhai.relation.sittingFloor" as TranslationKey)}</span>
              <span className="jingzhai-wuxing-rel">{formatWuxingRelation(language, attributes.sitting?.element ?? "", attributes.floor?.element ?? "")}</span>
            </div>
            <div className="jingzhai-wuxing-row">
              <span className="jingzhai-wuxing-pair">{t(language, "jingzhai.relation.sittingRoom" as TranslationKey)}</span>
              <span className="jingzhai-wuxing-rel">{formatWuxingRelation(language, attributes.sitting?.element ?? "", attributes.room?.element ?? "")}</span>
            </div>
            <div className="jingzhai-wuxing-row">
              <span className="jingzhai-wuxing-pair">{t(language, "jingzhai.relation.floorRoom" as TranslationKey)}</span>
              <span className="jingzhai-wuxing-rel">{formatWuxingRelation(language, attributes.floor?.element ?? "", attributes.room?.element ?? "")}</span>
            </div>
          </div>
          {reason && <p className="meta-text compact-note">{reason}</p>}
        </article>

        <div className="compact-result-card">
          {house.door_analysis && decades.length > 0 && (
            <JingzhaiDoorSection
              language={language}
              doorAnalysis={house.door_analysis}
              decade={decades[0]}
            />
          )}
          <JingzhaiPhaseTimeline language={language} phases={house.phases ?? []} />
          <JingzhaiPersonImpact language={language} persons={personImpact?.persons ?? []} />
        </div>
      </div>
      <JingzhaiDecadeTable language={language} decades={decades} />
    </section>
  );
}
