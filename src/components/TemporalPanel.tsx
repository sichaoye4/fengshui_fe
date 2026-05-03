import { useState } from "react";
import { t, type TranslationKey } from "../i18n/ui";
import type {
  FlyingStarAnnualResponse,
  GregorianConversionResponse,
  Language,
  TemporalAnnualResponse,
  TemporalMonthlyResponse,
} from "../types/fengshui";
import { CompactDetailGrid, type CompactDetailItem } from "./CompactDetailGrid";
import { FlyingStarGrid } from "./FlyingStarGrid";
import { SectionTabs, type SectionTabItem } from "./SectionTabs";

interface Props {
  language: Language;
  annual: TemporalAnnualResponse | null;
  monthly: TemporalMonthlyResponse | null;
  flyingStar: FlyingStarAnnualResponse | null;
  gregorianConversion: GregorianConversionResponse | null;
  loading: boolean;
  error: string | null;
}

type TemporalSection = "conversion" | "annual" | "monthly" | "flyingStar";

const BRANCH_ZH: Record<string, string> = {
  ZI: "\u5b50",
  CHOU: "\u4e11",
  YIN: "\u5bc5",
  MAO: "\u536f",
  CHEN: "\u8fb0",
  SI: "\u5df3",
  WU: "\u5348",
  WEI: "\u672a",
  SHEN: "\u7533",
  YOU: "\u9149",
  XU: "\u620c",
  HAI: "\u4ea5",
};

function branchLabel(language: Language, branch: string): string {
  return language === "zh" ? `${BRANCH_ZH[branch] ?? branch} (${branch})` : branch;
}

function renderValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const s = String(value).trim();
  return s === "" ? "-" : s;
}

function flightDirectionText(language: Language, flightDirection: string): string {
  if (language === "en") return flightDirection === "forward" ? "Forward" : "Backward";
  return flightDirection === "forward" ? "\u987a\u98de" : "\u9006\u98de";
}

function EmptySection({ language }: { language: Language }): JSX.Element {
  return (
    <article className="result-card compact-result-card">
      <p>{t(language, "temporal.empty" as TranslationKey)}</p>
    </article>
  );
}

export function TemporalPanel({
  language,
  annual,
  monthly,
  flyingStar,
  gregorianConversion,
  loading,
  error,
}: Props): JSX.Element {
  const [activeSection, setActiveSection] = useState<TemporalSection>("conversion");
  const tabs: Array<SectionTabItem<TemporalSection>> = [
    {
      id: "conversion",
      title: t(language, "temporal.conversion" as TranslationKey),
      summary: gregorianConversion?.pillars.year_ganzhi ?? "-",
    },
    {
      id: "annual",
      title: t(language, "temporal.annualTitle" as TranslationKey),
      summary: annual
        ? `${t(language, "temporal.taiSui" as TranslationKey)} ${branchLabel(language, annual.tai_sui_sui_po.tai_sui)}`
        : "-",
      tone: annual?.san_sha.length ? "bad" : "neutral",
    },
    {
      id: "monthly",
      title: t(language, "temporal.monthlyTitle" as TranslationKey),
      summary: monthly ? `${t(language, "temporal.centerStar" as TranslationKey)} ${monthly.center_star}` : "-",
    },
    {
      id: "flyingStar",
      title: t(language, "temporal.flyingStarTitle" as TranslationKey),
      summary: flyingStar ? `${t(language, "temporal.centerStar" as TranslationKey)} ${flyingStar.center_star}` : "-",
    },
  ];

  const conversionItems: CompactDetailItem[] = gregorianConversion
    ? [
        { label: t(language, "temporal.yearPillar" as TranslationKey), value: gregorianConversion.pillars.year_ganzhi },
        { label: t(language, "temporal.monthPillar" as TranslationKey), value: gregorianConversion.pillars.month_ganzhi },
        { label: t(language, "temporal.dayPillar" as TranslationKey), value: gregorianConversion.pillars.day_ganzhi },
        { label: t(language, "temporal.timePillar" as TranslationKey), value: gregorianConversion.pillars.time_ganzhi },
        { label: t(language, "temporal.ruleMonth" as TranslationKey), value: gregorianConversion.rule_month },
      ]
    : [];

  const annualItems: CompactDetailItem[] = annual
    ? [
        { label: t(language, "temporal.taiSui" as TranslationKey), value: branchLabel(language, annual.tai_sui_sui_po.tai_sui) },
        { label: t(language, "temporal.suiPo" as TranslationKey), value: branchLabel(language, annual.tai_sui_sui_po.sui_po), tone: "warning" },
        {
          label: t(language, "temporal.sanSha" as TranslationKey),
          value: annual.san_sha.map((b) => branchLabel(language, b)).join(", "),
          tone: "bad",
        },
        {
          label: t(language, "temporal.wujiSha" as TranslationKey),
          value: annual.wuji_sha.map((b) => branchLabel(language, b)).join(", "),
          tone: "bad",
        },
        {
          label: t(language, "temporal.taiyang" as TranslationKey),
          value: `${branchLabel(language, annual.taiyang.taiyang_shen)} -> ${branchLabel(language, annual.taiyang.taiyang_position)}`,
        },
        {
          label: t(language, "temporal.nobleman" as TranslationKey),
          value: `${t(language, "temporal.yang" as TranslationKey)}: ${branchLabel(language, annual.nobleman.nobleman_branches.yang)} / ${t(language, "temporal.yin" as TranslationKey)}: ${branchLabel(language, annual.nobleman.nobleman_branches.yin)}`,
        },
        { label: t(language, "temporal.lu" as TranslationKey), value: branchLabel(language, annual.lu_ma.lu) },
        { label: t(language, "temporal.ma" as TranslationKey), value: branchLabel(language, annual.lu_ma.ma) },
      ]
    : [];

  const monthlyItems: CompactDetailItem[] = monthly
    ? [
        { label: t(language, "temporal.centerStar" as TranslationKey), value: monthly.center_star },
        { label: t(language, "temporal.anjianSha" as TranslationKey), value: monthly.anjian_sha, tone: "bad" },
        {
          label: t(language, "temporal.wujiSha" as TranslationKey),
          value: monthly.wuji_sha.map((b) => branchLabel(language, b)).join(", "),
          tone: "bad",
        },
      ]
    : [];

  return (
    <section className="panel compact-analysis-panel temporal-panel">
      <h3>{t(language, "temporal.title" as TranslationKey)}</h3>
      <p className="meta-text compact-panel-description">{t(language, "temporal.description" as TranslationKey)}</p>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>{t(language, "temporal.loading" as TranslationKey)}</p>}

      {!annual && !monthly && !flyingStar && !gregorianConversion && !loading && !error && (
        <p>{t(language, "temporal.empty" as TranslationKey)}</p>
      )}

      <SectionTabs
        items={tabs}
        activeId={activeSection}
        ariaLabel={t(language, "analysis.sectionTabs" as TranslationKey)}
        onChange={setActiveSection}
      />

      <div className="section-tab-panel">
        {activeSection === "conversion" && (
          gregorianConversion ? (
            <article className="result-card compact-result-card">
              <h4>{t(language, "temporal.conversion" as TranslationKey)}</h4>
              <CompactDetailGrid items={conversionItems} />
            </article>
          ) : <EmptySection language={language} />
        )}

        {activeSection === "annual" && (
          annual ? (
            <article className="result-card compact-result-card">
              <h4>{t(language, "temporal.annualTitle" as TranslationKey)}</h4>
              <p className="meta-text compact-note">
                {annual.year_ganzhi} ({annual.year_stem}-{annual.year_branch})
              </p>
              <CompactDetailGrid items={annualItems} />
            </article>
          ) : <EmptySection language={language} />
        )}

        {activeSection === "monthly" && (
          monthly ? (
            <article className="result-card compact-result-card">
              <h4>{t(language, "temporal.monthlyTitle" as TranslationKey)}</h4>
              <p className="meta-text compact-note">
                {monthly.month_ganzhi} ({t(language, "temporal.ruleMonth" as TranslationKey)}: {monthly.rule_month})
              </p>
              <CompactDetailGrid items={monthlyItems} />
            </article>
          ) : <EmptySection language={language} />
        )}

        {activeSection === "flyingStar" && (
          flyingStar ? (
            <div className="compact-section-layout">
              <article className="result-card compact-result-card">
                <h4>{t(language, "temporal.flyingStarTitle" as TranslationKey)}</h4>
                <CompactDetailGrid
                  items={[
                    { label: t(language, "temporal.centerStar" as TranslationKey), value: renderValue(flyingStar.center_star) },
                    { label: t(language, "temporal.flightDirection" as TranslationKey), value: flightDirectionText(language, flyingStar.flight_direction) },
                  ]}
                />
              </article>
              <article className="result-card compact-result-card">
                <FlyingStarGrid
                  language={language}
                  baguaStar={flyingStar.bagua_star}
                  centerStar={flyingStar.center_star}
                  flightDirection={flyingStar.flight_direction}
                />
              </article>
            </div>
          ) : <EmptySection language={language} />
        )}
      </div>
    </section>
  );
}
