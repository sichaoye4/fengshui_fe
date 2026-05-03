import { describe, expect, it } from "vitest";
import { messages, t } from "./ui";

describe("ui i18n dictionary", () => {
  it("covers every english key in chinese messages", () => {
    const enKeys = Object.keys(messages.en).sort();
    const zhKeys = Object.keys(messages.zh).sort();
    expect(enKeys.every((key) => zhKeys.includes(key))).toBe(true);
  });

  it("renders simplified chinese labels on core surfaces", () => {
    expect(t("zh", "language.zh")).toMatch(/中文|涓/);
    expect(t("zh", "app.commonContext")).toMatch(/信息|淇/);
    expect(t("zh", "app.tab.houseLiqi")).toMatch(/理气|鐞/);
    expect(t("zh", "app.shape.mitigationContext")).toMatch(/化解|鍖/);
  });

  it("removes legacy pinyin from representative zh labels", () => {
    const sample = [
      t("zh", "app.commonContext"),
      t("zh", "app.house.sittingBagua"),
      t("zh", "app.tab.structure"),
      t("zh", "app.evaluate.run"),
      t("zh", "fund.title"),
      t("zh", "bazhai.title"),
    ].join(" ");

    expect(sample.toLowerCase()).not.toMatch(/\b(ji|chu|xing|sha|gong|qing|ye|zhu)\b/);
  });
});
