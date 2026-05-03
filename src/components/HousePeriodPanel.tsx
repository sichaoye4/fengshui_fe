import { useState } from "react";
import { t, type TranslationKey } from "../i18n/ui";
import type {
  Language,
  PeriodFourYunResponse,
  PeriodPalaceStrength,
  PeriodZhuanlinPalaceProfile,
} from "../types/fengshui";
import { CompactDetailGrid, type CompactDetailItem } from "./CompactDetailGrid";
import { SectionTabs, type SectionTabItem } from "./SectionTabs";

interface Props {
  language: Language;
  periodData: PeriodFourYunResponse | null;
  loading: boolean;
  error?: string | null;
}

type PeriodSection = "hetu" | "sanyuan" | "tonglin" | "zhuanlin";

interface PalaceCell {
  code: string;
  en: string;
  direction: string;
}

interface GridProps {
  language: Language;
  qualifiedPalaces?: string[];
  sittingBagua?: string | null;
  detailForPalace?: (palace: PalaceCell) => Array<string | null | undefined>;
  statusForPalace?: (palace: PalaceCell) => "strong" | "weak" | null;
}

const PALACE_ORDER: PalaceCell[] = [
  { code: "XUN", en: "Xun", direction: "SE" },
  { code: "LI", en: "Li", direction: "S" },
  { code: "KUN", en: "Kun", direction: "SW" },
  { code: "ZHEN", en: "Zhen", direction: "E" },
  { code: "CENTER", en: "Center", direction: "C" },
  { code: "DUI", en: "Dui", direction: "W" },
  { code: "GEN", en: "Gen", direction: "NE" },
  { code: "KAN", en: "Kan", direction: "N" },
  { code: "QIAN", en: "Qian", direction: "NW" },
];

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  const normalized = String(value).trim();
  return normalized === "" ? "-" : normalized;
}

function palaceSet(values?: string[]): Set<string> {
  return new Set((values ?? []).map((item) => String(item)));
}

function localizedBagua(language: Language, palace: PalaceCell): string {
  return language === "en" ? palace.en : palace.code;
}

function qualifiesText(language: Language, value?: boolean | null): string {
  if (value === true) return t(language, "period.yes" as TranslationKey);
  if (value === false) return t(language, "period.no" as TranslationKey);
  return t(language, "period.na" as TranslationKey);
}

function strengthText(language: Language, value?: string): string {
  if (value === "strong") return t(language, "period.strong" as TranslationKey);
  if (value === "weak") return t(language, "period.weak" as TranslationKey);
  return renderValue(value);
}

function strengthStatus(profile?: PeriodPalaceStrength | PeriodZhuanlinPalaceProfile): "strong" | "weak" | null {
  return profile?.strength === "strong" || profile?.strength === "weak" ? profile.strength : null;
}

function qualificationTone(value?: boolean | null): "good" | "bad" | "neutral" {
  if (value === true) return "good";
  if (value === false) return "bad";
  return "neutral";
}

function HousePeriodGrid({
  language,
  qualifiedPalaces,
  sittingBagua,
  detailForPalace,
  statusForPalace,
}: GridProps): JSX.Element {
  const qualified = palaceSet(qualifiedPalaces);
  return (
    <div className="period-palace-grid compact-palace-grid" data-testid="period-palace-grid">
      {PALACE_ORDER.map((palace) => {
        const isQualified = qualified.has(palace.code);
        const isSitting = sittingBagua === palace.code;
        const status = statusForPalace?.(palace);
        const details = detailForPalace?.(palace).filter(Boolean) ?? [];
        return (
          <div
            key={palace.code}
            className={[
              "period-palace-cell",
              isQualified ? "qualified" : "",
              isSitting ? "sitting" : "",
              status === "strong" ? "strong" : "",
              status === "weak" ? "weak" : "",
            ].filter(Boolean).join(" ")}
            data-testid="period-palace-cell"
            title={`${palace.direction} ${palace.code}`}
          >
            <div className="period-palace-head">
              <span>{palace.direction}</span>
              <span>{palace.code}</span>
            </div>
            <div className="period-palace-name">{localizedBagua(language, palace)}</div>
            {details.map((detail) => (
              <div key={detail} className="period-palace-detail">
                {detail}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function periodSummary(language: Language, qualifies?: boolean | null, extra?: string): string {
  const status = `${t(language, "period.qualifies" as TranslationKey)} ${qualifiesText(language, qualifies)}`;
  return extra ? `${status} / ${extra}` : status;
}

function EmptySection({ language }: { language: Language }): JSX.Element {
  return (
    <article className="result-card compact-result-card">
      <p>{t(language, "period.empty" as TranslationKey)}</p>
    </article>
  );
}

export function HousePeriodPanel({ language, periodData, loading, error }: Props): JSX.Element {
  const [activeSection, setActiveSection] = useState<PeriodSection>("hetu");

  if (loading) {
    return (
      <section className="panel compact-analysis-panel house-period-panel">
        <h3>{t(language, "period.loading" as TranslationKey)}</h3>
      </section>
    );
  }

  if (!periodData) {
    return (
      <section className="panel compact-analysis-panel house-period-panel">
        <h3>{t(language, "period.empty" as TranslationKey)}</h3>
      </section>
    );
  }

  const sittingBagua = periodData.sitting_bagua ?? null;
  const hetu = periodData.hetu_five_yun;
  const sanyuan = periodData.sanyuan_jiuyun;
  const tonglin = periodData.tonglin_shanyun;
  const zhuanlin = periodData.zhuanlin_shanyun;

  const tabs: Array<SectionTabItem<PeriodSection>> = [
    {
      id: "hetu",
      title: t(language, "period.hetuShort" as TranslationKey),
      summary: periodSummary(language, hetu?.sitting_qualifies, hetu?.period_element),
      tone: qualificationTone(hetu?.sitting_qualifies),
    },
    {
      id: "sanyuan",
      title: t(language, "period.sanyuanShort" as TranslationKey),
      summary: periodSummary(language, sanyuan?.sitting_qualifies, sanyuan?.period_number ? `${t(language, "period.period" as TranslationKey)} ${sanyuan.period_number}` : undefined),
      tone: qualificationTone(sanyuan?.sitting_qualifies),
    },
    {
      id: "tonglin",
      title: t(language, "period.tonglinShort" as TranslationKey),
      summary: periodSummary(language, tonglin?.sitting_qualifies, tonglin?.yuan),
      tone: qualificationTone(tonglin?.sitting_qualifies),
    },
    {
      id: "zhuanlin",
      title: t(language, "period.zhuanlinShort" as TranslationKey),
      summary: periodSummary(language, Boolean(zhuanlin?.sitting_profile), zhuanlin?.sitting_profile?.target_nayin_element),
      tone: qualificationTone(Boolean(zhuanlin?.sitting_profile)),
    },
  ];

  let detail: JSX.Element;
  if (activeSection === "hetu") {
    detail = hetu ? (
      <div className="compact-section-layout period-section-layout">
        <article className="result-card compact-result-card">
          <h4>{t(language, "period.hetuTitle" as TranslationKey)}</h4>
          <CompactDetailGrid
            items={[
              { label: t(language, "period.year" as TranslationKey), value: hetu.year },
              { label: t(language, "period.element" as TranslationKey), value: hetu.period_element },
              { label: t(language, "period.periodStart" as TranslationKey), value: renderValue(hetu.period_start_ganzhi_code) },
              { label: t(language, "period.yearGanzhi" as TranslationKey), value: renderValue(hetu.year_ganzhi_code) },
              { label: t(language, "period.sitting" as TranslationKey), value: renderValue(hetu.sitting_bagua ?? sittingBagua) },
              { label: t(language, "period.qualifies" as TranslationKey), value: qualifiesText(language, hetu.sitting_qualifies), tone: qualificationTone(hetu.sitting_qualifies) },
            ]}
          />
        </article>
        <article className="result-card compact-result-card">
          <HousePeriodGrid language={language} qualifiedPalaces={hetu.qualified_palaces} sittingBagua={hetu.sitting_bagua ?? sittingBagua} />
        </article>
      </div>
    ) : <EmptySection language={language} />;
  } else if (activeSection === "sanyuan") {
    detail = sanyuan ? (
      <div className="compact-section-layout period-section-layout">
        <article className="result-card compact-result-card">
          <h4>{t(language, "period.sanyuanTitle" as TranslationKey)}</h4>
          <CompactDetailGrid
            items={[
              { label: t(language, "period.year" as TranslationKey), value: sanyuan.year },
              { label: t(language, "period.period" as TranslationKey), value: sanyuan.period_number },
              { label: t(language, "period.periodRange" as TranslationKey), value: `${sanyuan.period_start_year}-${sanyuan.period_end_year}` },
              { label: t(language, "period.element" as TranslationKey), value: renderValue(sanyuan.period_element) },
              { label: t(language, "period.sitting" as TranslationKey), value: renderValue(sanyuan.sitting_bagua ?? sittingBagua) },
              { label: t(language, "period.qualifies" as TranslationKey), value: qualifiesText(language, sanyuan.sitting_qualifies), tone: qualificationTone(sanyuan.sitting_qualifies) },
            ]}
          />
        </article>
        <article className="result-card compact-result-card">
          <HousePeriodGrid language={language} qualifiedPalaces={sanyuan.qualified_palaces} sittingBagua={sanyuan.sitting_bagua ?? sittingBagua} />
        </article>
      </div>
    ) : <EmptySection language={language} />;
  } else if (activeSection === "tonglin") {
    detail = tonglin ? (
      <div className="compact-section-layout period-section-layout">
        <article className="result-card compact-result-card">
          <h4>{t(language, "period.tonglinTitle" as TranslationKey)}</h4>
          <CompactDetailGrid
            items={[
              { label: t(language, "period.year" as TranslationKey), value: tonglin.year },
              { label: t(language, "period.yuan" as TranslationKey), value: tonglin.yuan },
              { label: t(language, "period.anchor" as TranslationKey), value: tonglin.anchor_bagua },
              { label: t(language, "period.commanding" as TranslationKey), value: renderValue(tonglin.commanding_ganzhi_code) },
              { label: t(language, "period.sitting" as TranslationKey), value: renderValue(tonglin.sitting_bagua ?? sittingBagua) },
              { label: t(language, "period.qualifies" as TranslationKey), value: qualifiesText(language, tonglin.sitting_qualifies), tone: qualificationTone(tonglin.sitting_qualifies) },
            ]}
          />
        </article>
        <article className="result-card compact-result-card">
          <HousePeriodGrid
            language={language}
            qualifiedPalaces={tonglin.qualified_palaces}
            sittingBagua={tonglin.sitting_bagua ?? sittingBagua}
            statusForPalace={(palace) => strengthStatus(tonglin.palace_strength?.[palace.code])}
            detailForPalace={(palace) => {
              const profile = tonglin.palace_strength?.[palace.code];
              return [
                tonglin.flying_grid?.palace_ganzhi_code?.[palace.code],
                tonglin.flying_grid?.palace_nayin?.[palace.code],
                profile?.strength ? strengthText(language, profile.strength) : null,
              ];
            }}
          />
        </article>
      </div>
    ) : <EmptySection language={language} />;
  } else {
    detail = zhuanlin ? (
      <div className="compact-section-layout period-section-layout">
        <article className="result-card compact-result-card">
          <h4>{t(language, "period.zhuanlinTitle" as TranslationKey)}</h4>
          <CompactDetailGrid
            items={[
              { label: t(language, "period.year" as TranslationKey), value: zhuanlin.year },
              { label: t(language, "period.sitting" as TranslationKey), value: renderValue(zhuanlin.sitting_bagua ?? sittingBagua) },
              { label: t(language, "period.target" as TranslationKey), value: renderValue(zhuanlin.sitting_profile?.target_ganzhi_code) },
              { label: t(language, "period.element" as TranslationKey), value: renderValue(zhuanlin.sitting_profile?.target_nayin_element) },
              { label: t(language, "period.qualifies" as TranslationKey), value: qualifiesText(language, Boolean(zhuanlin.sitting_profile)), tone: qualificationTone(Boolean(zhuanlin.sitting_profile)) },
            ]}
          />
        </article>
        <article className="result-card compact-result-card">
          <HousePeriodGrid
            language={language}
            qualifiedPalaces={zhuanlin.qualified_palaces}
            sittingBagua={zhuanlin.sitting_bagua ?? sittingBagua}
            statusForPalace={(palace) => strengthStatus(zhuanlin.palace_profiles?.[palace.code])}
            detailForPalace={(palace) => {
              const profile = zhuanlin.palace_profiles?.[palace.code];
              return [
                profile?.target_ganzhi_code,
                profile?.target_nayin_element,
                profile?.strength ? strengthText(language, profile.strength) : null,
              ];
            }}
          />
        </article>
      </div>
    ) : <EmptySection language={language} />;
  }

  return (
    <section className="panel compact-analysis-panel house-period-panel">
      <h3>{t(language, "period.title" as TranslationKey)}</h3>
      <p className="meta-text compact-panel-description">{t(language, "period.description" as TranslationKey)}</p>
      {error && <p className="error-text">{error}</p>}
      <SectionTabs
        items={tabs}
        activeId={activeSection}
        ariaLabel={t(language, "analysis.sectionTabs" as TranslationKey)}
        onChange={setActiveSection}
      />
      <div className="section-tab-panel">{detail}</div>
    </section>
  );
}
