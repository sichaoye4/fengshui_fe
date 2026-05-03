import { useState } from "react";
import { t, type TranslationKey } from "../i18n/ui";
import type {
  BazhaiMissingField,
  HouseholdBazhaiMemberResult,
  HouseholdBazhaiResponse,
  Language,
  LiqiHouseResponse,
  LiqiPalaceRelationRow,
} from "../types/fengshui";
import { CompactDetailGrid, type CompactDetailItem } from "./CompactDetailGrid";
import { SectionTabs, type SectionTabItem } from "./SectionTabs";

interface Props {
  language: Language;
  bazhaiResult: HouseholdBazhaiResponse | null;
  bazhaiMissingFields: BazhaiMissingField[];
  liqiHouseProfile: LiqiHouseResponse | null;
  loading?: boolean;
}

type HouseLiqiSection = "bazhai" | "liqi";

interface PalaceCell {
  code: string;
  en: string;
  direction: string;
  [key: string]: string;
}

const MISSING_FIELD_LABELS: Record<BazhaiMissingField, TranslationKey> = {
  "house.sitting_bagua": "bazhai.missing.house.sittingBagua",
  "members.empty": "bazhai.missing.members.empty",
};

const PALACE_ORDER: PalaceCell[] = [
  { code: "XUN", zh: "宸?", en: "Xun", direction: "SE" },
  { code: "LI", zh: "绂?", en: "Li", direction: "S" },
  { code: "KUN", zh: "鍧?", en: "Kun", direction: "SW" },
  { code: "ZHEN", zh: "闇?", en: "Zhen", direction: "E" },
  { code: "CENTER", zh: "涓?", en: "Center", direction: "C" },
  { code: "DUI", zh: "鍏?", en: "Dui", direction: "W" },
  { code: "GEN", zh: "鑹?", en: "Gen", direction: "NE" },
  { code: "KAN", zh: "鍧?", en: "Kan", direction: "N" },
  { code: "QIAN", zh: "涔?", en: "Qian", direction: "NW" },
];

const QI_CLASS: Record<string, string> = {
  SHENG_QI: "five-qi-sheng",
  WANG_QI: "five-qi-wang",
  SHA_QI: "five-qi-sha",
  SI_QI: "five-qi-si",
  TUI_QI: "five-qi-tui",
};

function renderGroupLabel(
  language: Language,
  group: { group_en?: string; group_zh?: string; group_code?: string } | undefined
): string {
  if (!group) return "-";
  if (language === "en") return group.group_en ?? group.group_code ?? "-";
  return group.group_zh ?? group.group_code ?? "-";
}

function rowMatchesPalace(row: LiqiPalaceRelationRow, palace: PalaceCell): boolean {
  return row.palace_bagua === palace.code || row.palace_bagua === palace.zh || row.palace_direction === palace.direction;
}

function qiLabel(
  language: Language,
  qiType: string,
  qiTypeLabels: Record<string, Record<string, string>>
): string {
  const localized = qiTypeLabels[qiType]?.[language];
  return localized ?? qiType.replace(/_/g, " ");
}

function baguaLabel(language: Language, palace: PalaceCell, row?: LiqiPalaceRelationRow): string {
  if (language === "en") return palace.en;
  return row?.palace_bagua ?? palace.code;
}

function FiveQiPalaceGrid({
  language,
  rows,
  qiTypeLabels,
}: {
  language: Language;
  rows: LiqiPalaceRelationRow[];
  qiTypeLabels: Record<string, Record<string, string>>;
}): JSX.Element {
  return (
    <div className="five-qi-palace-grid compact-palace-grid" data-testid="five-qi-palace-grid">
      {PALACE_ORDER.map((palace) => {
        const row = rows.find((candidate) => rowMatchesPalace(candidate, palace));
        const qiType = row?.qi_type ?? "UNKNOWN";
        return (
          <div
            key={palace.code}
            className={`five-qi-cell ${QI_CLASS[qiType] ?? "five-qi-unknown"}`}
            data-testid="five-qi-cell"
          >
            <div className="five-qi-cell-head">
              <span className="five-qi-direction">{row?.palace_direction ?? palace.direction}</span>
              <span className="five-qi-bagua">{baguaLabel(language, palace, row)}</span>
            </div>
            <div className="five-qi-star">{row?.flying_star ?? "-"}</div>
            <div className="five-qi-label">{qiLabel(language, qiType, qiTypeLabels)}</div>
          </div>
        );
      })}
    </div>
  );
}

function bazhaiSummary(language: Language, result: HouseholdBazhaiResponse | null, missingFields: BazhaiMissingField[]): string {
  if (missingFields.length) return `${missingFields.length} missing`;
  if (!result) return t(language, "bazhai.empty");
  const matched = result.member_results.filter((member) => member.status === "matched");
  const good = matched.filter((member) => member.result?.overall_is_auspicious).length;
  const missing = result.member_results.filter((member) => member.status === "not_evaluable").length;
  return `${good}/${matched.length} ${t(language, "bazhai.auspiciousShort" as TranslationKey)}${missing ? `, ${missing} missing` : ""}`;
}

function liqiSummary(language: Language, profile: LiqiHouseResponse | null, loading?: boolean): string {
  if (loading) return t(language, "temporal.loading" as TranslationKey);
  if (!profile) return t(language, "temporal.empty" as TranslationKey);
  return `Center ${profile.center_star} / ${profile.center_star_element}`;
}

function BazhaiDetail({
  language,
  result,
  missingFields,
}: {
  language: Language;
  result: HouseholdBazhaiResponse | null;
  missingFields: BazhaiMissingField[];
}): JSX.Element {
  if (missingFields.length > 0) {
    return (
      <article className="result-card compact-result-card">
        <h4>{t(language, "bazhai.missingTitle")}</h4>
        <p className="meta-text">{t(language, "bazhai.missingDesc")}</p>
        <ul className="compact-list">
          {missingFields.map((field) => (
            <li key={field}>{t(language, MISSING_FIELD_LABELS[field])}</li>
          ))}
        </ul>
      </article>
    );
  }

  if (!result) {
    return (
      <article className="result-card compact-result-card">
        <p>{t(language, "bazhai.empty")}</p>
      </article>
    );
  }

  return (
    <div className="household-bazhai-results">
      {result.member_results.map((member) => (
        <BazhaiMemberCard key={member.member_id} language={language} member={member} />
      ))}
    </div>
  );
}

function BazhaiMemberCard({
  language,
  member,
}: {
  language: Language;
  member: HouseholdBazhaiMemberResult;
}): JSX.Element {
  const result = member.result;
  if (member.status !== "matched" || !result) {
    const missing = member.missing_fields.length ? member.missing_fields.join(", ") : member.error ?? "-";
    return (
      <article className="result-card compact-result-card bazhai-member-card">
        <h4>
          {member.name || member.member_id}
          {member.is_primary_resident ? ` · ${t(language, "members.primary" as TranslationKey)}` : ""}
        </h4>
        <CompactDetailGrid
          items={[
            { label: t(language, "bazhai.status" as TranslationKey), value: t(language, "results.status.notEvaluable" as TranslationKey), tone: "bad" },
            { label: t(language, "bazhai.missingTitle"), value: missing, tone: "bad" },
          ]}
        />
      </article>
    );
  }

  const isGood = result.overall_is_auspicious;
  const details: CompactDetailItem[] = [
    {
      label: t(language, "bazhai.compatibility"),
      value: language === "en" ? result.overall_label_en : result.overall_label_zh,
      tone: isGood ? "good" : "bad",
    },
    {
      label: t(language, "bazhai.star"),
      value: `${language === "en" ? result.star_relation.star_name_en : result.star_relation.star_name_zh}${result.star_relation.star_code ? ` (${result.star_relation.star_code})` : ""}`,
      tone: isGood ? "good" : "bad",
    },
    {
      label: t(language, "bazhai.mingGua"),
      value: result.person_minggua.minggua_code ?? "-",
    },
    {
      label: t(language, "bazhai.person"),
      value: renderGroupLabel(language, result.person_minggua.group),
    },
    {
      label: t(language, "bazhai.sittingBagua"),
      value: result.house_bagua_code,
    },
    {
      label: t(language, "bazhai.house"),
      value: renderGroupLabel(language, result.house_group),
    },
    {
      label: t(language, "bazhai.groupMatch"),
      value: result.group_match ? t(language, "bazhai.groupMatched") : t(language, "bazhai.groupDifferent"),
      tone: result.group_match ? "good" : "bad",
    },
    {
      label: t(language, "bazhai.tier"),
      value: language === "en" ? result.star_relation.tier_en : result.star_relation.tier_zh,
    },
  ];

  return (
    <article className={`result-card compact-result-card bazhai-member-card ${isGood ? "good" : "bad"}`}>
      <h4>
        {member.name || member.member_id}
        {member.is_primary_resident ? ` · ${t(language, "members.primary" as TranslationKey)}` : ""}
      </h4>
      <CompactDetailGrid items={details} />
    </article>
  );
}

function LiqiDetail({
  language,
  profile,
  loading,
}: {
  language: Language;
  profile: LiqiHouseResponse | null;
  loading?: boolean;
}): JSX.Element {
  if (loading) {
    return (
      <article className="result-card compact-result-card">
        <p>{t(language, "temporal.loading" as TranslationKey)}</p>
      </article>
    );
  }

  if (!profile) {
    return (
      <article className="result-card compact-result-card">
        <p>{t(language, "temporal.empty" as TranslationKey)}</p>
      </article>
    );
  }

  return (
    <div className="compact-section-layout">
      <article className="result-card compact-result-card">
        <h4>
          {profile.sitting_bagua_zh} ({profile.sitting_bagua})
        </h4>
        <CompactDetailGrid
          items={[
            { label: t(language, "temporal.centerStar" as TranslationKey), value: profile.center_star },
            { label: t(language, "liqi.centerBagua" as TranslationKey), value: profile.center_bagua },
            { label: t(language, "liqi.element" as TranslationKey), value: profile.center_star_element },
          ]}
        />
        {profile.anchoring_rule_en && (
          <p className="meta-text compact-note">
            {language === "en" ? profile.anchoring_rule_en : profile.anchoring_rule_zh}
          </p>
        )}
      </article>

      <article className="result-card compact-result-card">
        <h4>{t(language, "liqi.fiveQiGrid" as TranslationKey)}</h4>
        <FiveQiPalaceGrid
          language={language}
          rows={profile.palace_relation_rows}
          qiTypeLabels={profile.qi_type_labels}
        />
      </article>
    </div>
  );
}

export function HouseLiqiWorkspace({
  language,
  bazhaiResult,
  bazhaiMissingFields,
  liqiHouseProfile,
  loading,
}: Props): JSX.Element {
  const [activeSection, setActiveSection] = useState<HouseLiqiSection>("bazhai");
  const tabs: Array<SectionTabItem<HouseLiqiSection>> = [
    {
      id: "bazhai",
      title: t(language, "analysis.section.bazhai" as TranslationKey),
      summary: bazhaiSummary(language, bazhaiResult, bazhaiMissingFields),
      tone: bazhaiResult?.member_results.some((member) => member.result?.overall_is_auspicious) ? "good" : bazhaiResult ? "bad" : "neutral",
    },
    {
      id: "liqi",
      title: t(language, "analysis.section.houseLiqi" as TranslationKey),
      summary: liqiSummary(language, liqiHouseProfile, loading),
    },
  ];

  return (
    <section className="panel compact-analysis-panel house-liqi-workspace">
      <h3>{t(language, "app.tabFull.houseLiqi" as TranslationKey)}</h3>
      <SectionTabs
        items={tabs}
        activeId={activeSection}
        ariaLabel={t(language, "analysis.sectionTabs" as TranslationKey)}
        onChange={setActiveSection}
      />
      <div className="section-tab-panel">
        {activeSection === "bazhai" ? (
          <BazhaiDetail language={language} result={bazhaiResult} missingFields={bazhaiMissingFields} />
        ) : (
          <LiqiDetail language={language} profile={liqiHouseProfile} loading={loading} />
        )}
      </div>
    </section>
  );
}
