import { ROOM_TYPE_OPTIONS } from "../constants";
import { t, type TranslationKey } from "../i18n/ui";
import type { Language, RoomPrimitive, RoomType } from "../types/fengshui";

interface Props {
  language: Language;
  room: RoomPrimitive | null;
  onChange: (id: string, update: { label?: string; roomType?: RoomType }) => void;
}

const ROOM_TYPE_LABELS: Record<RoomType, TranslationKey> = {
  unknown: "roomType.unknown",
  living: "roomType.living",
  bedroom: "roomType.bedroom",
  toilet: "roomType.toilet",
  kitchen: "roomType.kitchen",
  stair: "roomType.stair",
  atrium: "roomType.atrium",
  void: "roomType.void",
  open_stairwell: "roomType.openStairwell",
  skylight: "roomType.skylight",
  hallway: "roomType.hallway",
  storage: "roomType.storage",
  balcony: "roomType.balcony"
};

export function RoomLabelPanel({ language, room, onChange }: Props): JSX.Element | null {
  if (!room) {
    return null;
  }

  return (
    <section className="panel room-label-panel" data-testid="room-label-panel">
      <div className="panel-header-inline">
        <h3>{t(language, "roomLabel.title")}</h3>
        <span className="meta-text">{room.id}</span>
      </div>

      <div className="form-grid two-col compact-grid">
        <label>
          {t(language, "roomLabel.type")}
          <select
            value={room.roomType ?? "unknown"}
            aria-label={t(language, "roomLabel.type")}
            onChange={(event) => {
              onChange(room.id, { roomType: event.currentTarget.value as RoomType });
            }}
          >
            {ROOM_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {t(language, ROOM_TYPE_LABELS[type])}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(language, "roomLabel.label")}
          <input
            value={room.label ?? ""}
            aria-label={t(language, "roomLabel.label")}
            onChange={(event) => {
              onChange(room.id, { label: event.currentTarget.value });
            }}
          />
        </label>
      </div>
    </section>
  );
}
