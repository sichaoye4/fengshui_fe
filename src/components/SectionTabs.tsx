import type { ReactNode } from "react";

export interface SectionTabItem<TId extends string> {
  id: TId;
  title: string;
  summary?: ReactNode;
  tone?: "good" | "bad" | "neutral";
  disabled?: boolean;
}

interface Props<TId extends string> {
  items: Array<SectionTabItem<TId>>;
  activeId: TId;
  ariaLabel: string;
  onChange: (id: TId) => void;
}

export function SectionTabs<TId extends string>({
  items,
  activeId,
  ariaLabel,
  onChange,
}: Props<TId>): JSX.Element {
  return (
    <div className="section-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === activeId}
          disabled={item.disabled}
          className={[
            "section-tab",
            item.id === activeId ? "active" : "",
            item.tone ? `tone-${item.tone}` : "",
          ].filter(Boolean).join(" ")}
          data-testid={`section-tab-${item.id}`}
          onClick={() => onChange(item.id)}
        >
          <span className="section-tab-title">{item.title}</span>
          {item.summary && <span className="section-tab-summary">{item.summary}</span>}
        </button>
      ))}
    </div>
  );
}
