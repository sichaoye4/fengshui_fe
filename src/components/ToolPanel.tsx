import { TOOL_ORDER } from "../constants";
import { t, type TranslationKey } from "../i18n/ui";
import type { Language, Tool } from "../types/fengshui";

interface Props {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  language: Language;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const TOOL_KEYS: Record<Tool, TranslationKey> = {
  select: "tool.select",
  delete: "tool.delete",
  wall: "tool.wall",
  door: "tool.door",
  window: "tool.window",
  room: "tool.room"
};

export function ToolPanel({ tool, onToolChange, language, onUndo, onRedo, canUndo, canRedo }: Props): JSX.Element {
  return (
    <section className="panel tool-panel">
      <h3>{t(language, "tool.title")}</h3>
      <div className="tool-grid">
        {TOOL_ORDER.map((item) => (
          <button
            key={item}
            type="button"
            className={item === tool ? "active" : ""}
            onClick={() => onToolChange(item)}
          >
            {t(language, TOOL_KEYS[item])}
          </button>
        ))}
      </div>
      <div className="history-row">
        <button type="button" onClick={onUndo} disabled={!canUndo}>
          {t(language, "tool.undo")}
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo}>
          {t(language, "tool.redo")}
        </button>
      </div>
    </section>
  );
}

