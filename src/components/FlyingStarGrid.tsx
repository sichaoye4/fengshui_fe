import { t, type TranslationKey } from "../i18n/ui";
import type { Language } from "../types/fengshui";

interface FlyingStarGridProps {
  language: Language;
  baguaStar: Record<string, number>;
  centerStar: number;
  flightDirection: string;
}

interface PalaceCell {
  code: string;
  zh: string;
  en: string;
  direction: string;
}

const PALACE_ORDER: PalaceCell[] = [
  { code: "XUN", zh: "\u5dfd", en: "Xun", direction: "SE" },
  { code: "LI", zh: "\u79bb", en: "Li", direction: "S" },
  { code: "KUN", zh: "\u5764", en: "Kun", direction: "SW" },
  { code: "ZHEN", zh: "\u9707", en: "Zhen", direction: "E" },
  { code: "CENTER", zh: "\u4e2d", en: "Center", direction: "C" },
  { code: "DUI", zh: "\u5151", en: "Dui", direction: "W" },
  { code: "GEN", zh: "\u826e", en: "Gen", direction: "NE" },
  { code: "KAN", zh: "\u574e", en: "Kan", direction: "N" },
  { code: "QIAN", zh: "\u4e7e", en: "Qian", direction: "NW" },
];

const AUSPICIOUS_STARS = new Set([1, 6, 8, 9]);
const INAUSPICIOUS_STARS = new Set([2, 3, 5, 7]);

function starColorClass(star: number): string {
  if (AUSPICIOUS_STARS.has(star)) return "fs-star-good";
  if (INAUSPICIOUS_STARS.has(star)) return "fs-star-bad";
  return "fs-star-neutral";
}

function starForPalace(palace: PalaceCell, baguaStar: Record<string, number>, centerStar: number): number {
  if (palace.code === "CENTER") {
    return baguaStar.CENTER ?? baguaStar[palace.zh] ?? centerStar;
  }
  return baguaStar[palace.code] ?? baguaStar[palace.zh] ?? 0;
}

function directionText(language: Language, flightDirection: string): string {
  const isForward = flightDirection === "forward";
  if (language === "en") return isForward ? "Forward" : "Backward";
  return isForward ? "\u987a\u98de" : "\u9006\u98de";
}

export function FlyingStarGrid({
  language,
  baguaStar,
  centerStar,
  flightDirection,
}: FlyingStarGridProps): JSX.Element {
  const isForward = flightDirection === "forward";

  return (
    <div className="flying-star-grid" data-testid="flying-star-grid">
      <div className="fs-direction-badge">
        <span aria-hidden="true">{isForward ? "->" : "<-"}</span>
        <span>{directionText(language, flightDirection)}</span>
      </div>

      <div className="fs-grid">
        {PALACE_ORDER.map((palace) => {
          const star = starForPalace(palace, baguaStar, centerStar);
          const baguaLabel = language === "en" ? palace.en : palace.zh;
          return (
            <div
              key={palace.code}
              className={`fs-cell ${palace.code === "CENTER" ? "fs-center-cell" : ""} ${starColorClass(star)}`}
              data-testid="flying-star-cell"
              title={`${palace.direction} ${baguaLabel}`}
            >
              <span className="fs-direction-label">{palace.direction}</span>
              <span className="fs-bagua-label">{baguaLabel}</span>
              <span className="fs-star-number">{star || "-"}</span>
            </div>
          );
        })}
      </div>

      <div className="fs-legend">
        <span className="fs-legend-item">
          <span className="fs-legend-swatch fs-star-good" />
          {t(language, "temporal.auspiciousStars" as TranslationKey)}
        </span>
        <span className="fs-legend-item">
          <span className="fs-legend-swatch fs-star-bad" />
          {t(language, "temporal.inauspiciousStars" as TranslationKey)}
        </span>
      </div>
    </div>
  );
}
