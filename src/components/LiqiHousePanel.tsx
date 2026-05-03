import { t, type TranslationKey } from "../i18n/ui";
import type { Language, LiqiHouseResponse, LiqiPalaceRelationRow } from "../types/fengshui";

interface Props {
  language: Language;
  liqiHouseProfile: LiqiHouseResponse | null;
  loading?: boolean;
}

interface PalaceCell {
  code: string;
  zh: string;
  en: string;
  direction: string;
}

const PALACE_ORDER: PalaceCell[] = [
  { code: "XUN", zh: "巽", en: "Xun", direction: "SE" },
  { code: "LI", zh: "离", en: "Li", direction: "S" },
  { code: "KUN", zh: "坤", en: "Kun", direction: "SW" },
  { code: "ZHEN", zh: "震", en: "Zhen", direction: "E" },
  { code: "CENTER", zh: "中", en: "Center", direction: "C" },
  { code: "DUI", zh: "兑", en: "Dui", direction: "W" },
  { code: "GEN", zh: "艮", en: "Gen", direction: "NE" },
  { code: "KAN", zh: "坎", en: "Kan", direction: "N" },
  { code: "QIAN", zh: "乾", en: "Qian", direction: "NW" },
];

const QI_CLASS: Record<string, string> = {
  SHENG_QI: "five-qi-sheng",
  WANG_QI: "five-qi-wang",
  SHA_QI: "five-qi-sha",
  SI_QI: "five-qi-si",
  TUI_QI: "five-qi-tui",
};

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
  return row?.palace_bagua ?? palace.zh;
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
    <div className="five-qi-palace-grid" data-testid="five-qi-palace-grid">
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

export function LiqiHousePanel({ language, liqiHouseProfile, loading }: Props): JSX.Element {
  if (loading) {
    return (
      <section className="panel liqi-house-panel">
        <h3>{t(language, "temporal.loading" as TranslationKey)}</h3>
      </section>
    );
  }

  if (!liqiHouseProfile) {
    return (
      <section className="panel liqi-house-panel">
        <h3>{t(language, "temporal.empty" as TranslationKey)}</h3>
      </section>
    );
  }

  return (
    <section className="panel liqi-house-panel">
      <h3>{t(language, "liqi.title" as TranslationKey)}</h3>

      <article className="result-card liqi-summary-card">
        <h4>
          {liqiHouseProfile.sitting_bagua_zh} ({liqiHouseProfile.sitting_bagua})
        </h4>
        <p className="liqi-summary-line">
          <span>
            {t(language, "temporal.centerStar" as TranslationKey)}: {liqiHouseProfile.center_star}
          </span>
          <span>
            {t(language, "liqi.centerBagua" as TranslationKey)}: {liqiHouseProfile.center_bagua}
          </span>
          <span>
            {t(language, "liqi.element" as TranslationKey)}: {liqiHouseProfile.center_star_element}
          </span>
        </p>

        {liqiHouseProfile.anchoring_rule_en && (
          <p className="meta-text">
            {language === "en" ? liqiHouseProfile.anchoring_rule_en : liqiHouseProfile.anchoring_rule_zh}
          </p>
        )}
      </article>

      <article className="result-card">
        <h4>{t(language, "liqi.fiveQiGrid" as TranslationKey)}</h4>
        <FiveQiPalaceGrid
          language={language}
          rows={liqiHouseProfile.palace_relation_rows}
          qiTypeLabels={liqiHouseProfile.qi_type_labels}
        />
      </article>
    </section>
  );
}
