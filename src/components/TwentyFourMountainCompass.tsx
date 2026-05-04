import type { Direction24Code, Language } from "../types/fengshui";

export interface MountainMarker {
  mountain: Direction24Code;
  label: string;
  tone?: "bad" | "warning" | "good" | "info";
}

interface Props {
  language: Language;
  title: string;
  markers: MountainMarker[];
}

const MOUNTAIN_ZH: Record<Direction24Code, string> = {
  REN: "\u58ec",
  ZI: "\u5b50",
  GUI: "\u7678",
  CHOU: "\u4e11",
  GEN: "\u826e",
  YIN: "\u5bc5",
  JIA: "\u7532",
  MAO: "\u536f",
  YI: "\u4e59",
  CHEN: "\u8fb0",
  XUN: "\u5dfd",
  SI: "\u5df3",
  BING: "\u4e19",
  WU: "\u5348",
  DING: "\u4e01",
  WEI: "\u672a",
  KUN: "\u5764",
  SHEN: "\u7533",
  GENG: "\u5e9a",
  YOU: "\u9149",
  XIN: "\u8f9b",
  XU: "\u620c",
  QIAN: "\u4e7e",
  HAI: "\u4ea5"
};

const COMPASS_GRID: Array<Array<Direction24Code[] | null>> = [
  [
    ["CHEN", "XUN", "SI"],
    ["BING", "WU", "DING"],
    ["WEI", "KUN", "SHEN"]
  ],
  [
    ["JIA", "MAO", "YI"],
    null,
    ["GENG", "YOU", "XIN"]
  ],
  [
    ["CHOU", "GEN", "YIN"],
    ["REN", "ZI", "GUI"],
    ["XU", "QIAN", "HAI"]
  ]
];

const DIRECTION24_SET = new Set<Direction24Code>(Object.keys(MOUNTAIN_ZH) as Direction24Code[]);

export function normalizeMountain(value: string | null | undefined): Direction24Code | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase() as Direction24Code;
  return DIRECTION24_SET.has(normalized) ? normalized : null;
}

function mountainLabel(language: Language, mountain: Direction24Code): string {
  return language === "zh" ? MOUNTAIN_ZH[mountain] : mountain;
}

function markersByMountain(markers: MountainMarker[]): Map<Direction24Code, MountainMarker[]> {
  const grouped = new Map<Direction24Code, MountainMarker[]>();
  for (const marker of markers) {
    const list = grouped.get(marker.mountain) ?? [];
    list.push(marker);
    grouped.set(marker.mountain, list);
  }
  return grouped;
}

export function TwentyFourMountainCompass({ language, title, markers }: Props): JSX.Element {
  const grouped = markersByMountain(markers);
  const legend = Array.from(new Set(markers.map((marker) => marker.label)));

  return (
    <div className="mountain-compass" data-testid="mountain-compass" aria-label={title}>
      <div className="mountain-compass-title">{title}</div>
      <div className="mountain-compass-board">
        {COMPASS_GRID.flatMap((row, rowIndex) =>
          row.map((sector, colIndex) => {
            if (!sector) {
              return (
                <div key={`${rowIndex}-${colIndex}`} className="mountain-sector mountain-sector-center">
                  <span>{language === "zh" ? "\u4e2d" : "C"}</span>
                </div>
              );
            }

            const isSide = rowIndex === 1;
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`mountain-sector ${isSide ? "mountain-sector-vertical" : ""}`}
              >
                {sector.map((mountain) => {
                  const cellMarkers = grouped.get(mountain) ?? [];
                  return (
                    <div
                      key={mountain}
                      className={`mountain-cell ${cellMarkers.length ? "has-marker" : ""}`}
                      data-testid={`mountain-cell-${mountain}`}
                    >
                      <span className="mountain-label">{mountainLabel(language, mountain)}</span>
                      <span className="mountain-code">{mountain}</span>
                      <span className="mountain-marker-stack">
                        {cellMarkers.map((marker, index) => (
                          <span
                            key={`${marker.label}-${index}`}
                            className={`mountain-marker tone-${marker.tone ?? "info"}`}
                          >
                            {marker.label}
                          </span>
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
      {legend.length > 0 && (
        <div className="mountain-compass-legend">
          {legend.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}
    </div>
  );
}
