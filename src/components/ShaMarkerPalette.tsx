import { MARKER_TYPES } from "../constants";
import { t, type TranslationKey } from "../i18n/ui";
import type { Language, MarkerType, Tool } from "../types/fengshui";

interface Props {
  tool: Tool;
  language: Language;
  onToolChange: (tool: Tool) => void;
}

const MARKER_LABEL_KEYS: Record<MarkerType, TranslationKey> = {
  main_door: "marker.mainDoor",
  back_door: "marker.backDoor",
  room_door: "marker.roomDoor",
  toilet_door: "marker.toiletDoor",
  kitchen_door: "marker.kitchenDoor",
  window: "marker.window",
  toilet_fixture: "marker.toiletFixture",
  stair: "marker.stair",
  stove: "marker.stove",
  entry_turn: "marker.entryTurn",
  open_center: "marker.openCenter",
  skylight: "marker.skylight",
  open_stairwell: "marker.openStairwell"
};

const MARKER_ICONS: Record<MarkerType, string> = {
  main_door: "M",
  back_door: "B",
  room_door: "R",
  toilet_door: "T",
  kitchen_door: "K",
  window: "W",
  toilet_fixture: "WC",
  stair: "S",
  stove: "F",
  entry_turn: "ET",
  open_center: "OC",
  skylight: "SL",
  open_stairwell: "OS"
};

export function ShaMarkerPalette({ tool, language, onToolChange }: Props): JSX.Element {
  return (
    <section className="panel marker-palette">
      <h3>{t(language, "marker.title")}</h3>
      <div className="marker-grid">
        {MARKER_TYPES.map((markerType) => (
          <button
            key={markerType}
            type="button"
            className={tool === markerType ? "active" : ""}
            aria-pressed={tool === markerType}
            onClick={() => onToolChange(markerType)}
          >
            <span className="marker-button-icon" aria-hidden="true">
              {MARKER_ICONS[markerType]}
            </span>
            <span>{t(language, MARKER_LABEL_KEYS[markerType])}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
