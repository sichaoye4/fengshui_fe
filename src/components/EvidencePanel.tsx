import type {
  InternalLayoutDerivationResponse,
  InternalLayoutEvidenceItem,
  InternalLayoutEvidenceSource,
  Language,
  Primitive,
  RuleFinding
} from "../types/fengshui";

interface Props {
  language: Language;
  derivation: InternalLayoutDerivationResponse | null;
  findings: RuleFinding[];
  primitives: Primitive[];
  onHighlightPrimitive: (id: string) => void;
}

const SOURCE_LABELS: Record<InternalLayoutEvidenceSource, { en: string; zh: string }> = {
  geometry: { en: "geometry", zh: "几何" },
  room_label: { en: "room_label", zh: "房间标签" },
  marker: { en: "marker", zh: "标记" },
  manual_override: { en: "manual_override", zh: "手动覆盖" },
  not_provided: { en: "manual input needed", zh: "需手动输入" }
};

const CONFIDENCE_LABELS: Record<InternalLayoutEvidenceItem["confidence"], { en: string; zh: string }> = {
  high: { en: "high", zh: "高" },
  medium: { en: "medium", zh: "中" },
  low: { en: "low", zh: "低" }
};

function fieldValue(derivation: InternalLayoutDerivationResponse, fieldPath: string): string {
  const [group, field] = fieldPath.split(".");
  if (!group || !field) {
    return "-";
  }
  const layoutGroup = derivation.internal_layout[group as keyof InternalLayoutDerivationResponse["internal_layout"]];
  if (!layoutGroup || !(field in layoutGroup)) {
    return "-";
  }
  const value = layoutGroup[field as keyof typeof layoutGroup];
  return typeof value === "boolean" ? (value ? "true" : "false") : String(value);
}

function displaySource(item: InternalLayoutEvidenceItem, primitiveMap: Map<string, Primitive>): InternalLayoutEvidenceSource {
  if (item.source !== "geometry") {
    return item.source;
  }
  if (item.related_ids.some((id) => primitiveMap.get(id)?.kind === "marker")) {
    return "marker";
  }
  if (item.related_ids.some((id) => primitiveMap.get(id)?.kind === "room")) {
    return "room_label";
  }
  return "geometry";
}

function primitiveLabel(primitive: Primitive | undefined): string {
  if (!primitive) {
    return "";
  }
  if (primitive.kind === "room") {
    return primitive.label || primitive.roomType || primitive.id;
  }
  if (primitive.kind === "marker") {
    return primitive.label || primitive.markerType || primitive.id;
  }
  return `${primitive.kind} ${primitive.id}`;
}

export function EvidencePanel({
  language,
  derivation,
  findings,
  primitives,
  onHighlightPrimitive
}: Props): JSX.Element {
  const primitiveMap = new Map(primitives.map((primitive) => [primitive.id, primitive]));
  const findingMap = new Map(findings.map((finding) => [finding.formula_id, finding]));

  if (!derivation) {
    return (
      <section className="panel evidence-panel">
        <h3>{language === "en" ? "Derivation Evidence" : "推导证据"}</h3>
        <p className="meta-text">
          {language === "en"
            ? "Run evaluation or complete the floorplan to fetch backend derivation evidence."
            : "执行评估或完成平面图后可获取后端推导证据。"}
        </p>
      </section>
    );
  }

  return (
    <section className="panel evidence-panel">
      <h3>{language === "en" ? "Derivation Evidence" : "推导证据"}</h3>
      <div className="evidence-grid" data-testid="evidence-panel">
        {derivation.evidence.map((item) => {
          const source = displaySource(item, primitiveMap);
          const related = item.related_ids
            .map((id) => ({ id, label: primitiveLabel(primitiveMap.get(id)) || id }))
            .filter((entry) => entry.label);
          const firstRelatedId = related[0]?.id ?? null;
          const linkedFindings = item.formula_ids.flatMap((id) => {
            const finding = findingMap.get(id);
            return finding ? [finding] : [];
          });

          return (
            <article className="evidence-card" key={item.field_path} data-testid={`evidence-${item.field_path}`}>
              <div className="evidence-card-header">
                <div>
                  <h4>{item.field_path}</h4>
                  <p className="meta-text">
                    {language === "en" ? "Value" : "值"}: {fieldValue(derivation, item.field_path)}
                  </p>
                </div>
                <span className={`evidence-source source-${source}`}>
                  {SOURCE_LABELS[source][language]}
                </span>
              </div>
              <dl className="evidence-detail-list">
                <div>
                  <dt>{language === "en" ? "Confidence" : "置信度"}</dt>
                  <dd>{CONFIDENCE_LABELS[item.confidence][language]}</dd>
                </div>
                <div>
                  <dt>{language === "en" ? "Caused by" : "关联对象"}</dt>
                  <dd>{related.length ? related.map((entry) => entry.label).join(", ") : "-"}</dd>
                </div>
                <div>
                  <dt>{language === "en" ? "Rule findings" : "规则结果"}</dt>
                  <dd>
                    {linkedFindings.length
                      ? linkedFindings.map((finding) => `${finding.formula_id} ${finding.status}`).join(", ")
                      : item.formula_ids.join(", ") || "-"}
                  </dd>
                </div>
              </dl>
              <p className="meta-text">{item.explanation}</p>
              <button
                type="button"
                disabled={!firstRelatedId}
                onClick={() => {
                  if (firstRelatedId) {
                    onHighlightPrimitive(firstRelatedId);
                  }
                }}
              >
                {language === "en" ? "Highlight on canvas" : "在画布高亮"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
