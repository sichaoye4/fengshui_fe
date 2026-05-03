import { ALL_EXTERNAL_SHA_IDS, COMMON_EXTERNAL_SHA_IDS } from "../constants";
import { t } from "../i18n/ui";
import type { Language } from "../types/fengshui";

interface Props {
  language: Language;
  flags: Record<string, boolean>;
  showAdvanced: boolean;
  onToggleAdvanced: (value: boolean) => void;
  onFlagChange: (id: string, value: boolean) => void;
}

function renderLabel(id: string): string {
  const suffix = id.replace("external_sha_", "");
  return `EXT-${suffix}`;
}

export function ExternalShaChecklist({
  language,
  flags,
  showAdvanced,
  onToggleAdvanced,
  onFlagChange
}: Props): JSX.Element {
  const list = showAdvanced ? ALL_EXTERNAL_SHA_IDS : [...COMMON_EXTERNAL_SHA_IDS];

  return (
    <section className="panel">
      <div className="panel-header-inline">
        <h3>{t(language, "external.title")}</h3>
        <button type="button" onClick={() => onToggleAdvanced(!showAdvanced)}>
          {showAdvanced ? t(language, "external.showCommon") : t(language, "external.showAll")}
        </button>
      </div>
      <div className="external-grid" data-testid="external-list">
        {list.map((id) => (
          <label key={id} className="checkbox-item">
            <input
              type="checkbox"
              checked={Boolean(flags[id])}
              onChange={(event) => onFlagChange(id, event.currentTarget.checked)}
            />
            <span>{renderLabel(id)}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

