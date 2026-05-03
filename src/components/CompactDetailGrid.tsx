import type { ReactNode } from "react";

export interface CompactDetailItem {
  label: string;
  value: ReactNode;
  tone?: "good" | "bad" | "warning" | "neutral";
}

interface Props {
  items: CompactDetailItem[];
}

export function CompactDetailGrid({ items }: Props): JSX.Element {
  return (
    <dl className="compact-detail-grid" data-testid="compact-detail-grid">
      {items.map((item) => (
        <div
          key={item.label}
          className={[
            "compact-detail-item",
            item.tone ? `tone-${item.tone}` : "",
          ].filter(Boolean).join(" ")}
        >
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
