import { describe, expect, it } from "vitest";
import {
  BAZI_MONTH_BRANCH_ORDER,
  BAZI_MONTH_BRANCH_TO_RULE_MONTH,
  calculateBaziDate,
  deriveMonthGanzhiCode
} from "./bazi";

describe("calculateBaziDate", () => {
  it("converts Gregorian datetime to Jieqi-based bazi pillars", () => {
    const result = calculateBaziDate("2023-10-15", "14:30:00");
    expect(result).not.toBeNull();
    expect(result?.year_pillar).toBe("癸卯");
    expect(result?.month_pillar).toBe("壬戌");
    expect(result?.day_pillar).toBe("丙午");
    expect(result?.time_pillar).toBe("乙未");
    expect(result?.year_ganzhi_code).toBe("GUIMAO");
    expect(result?.month_ganzhi_code).toBe("RENXU");
    expect(result?.day_ganzhi_code).toBe("BINGWU");
    expect(result?.time_ganzhi_code).toBe("YIWEI");
    expect(result?.month_branch_code).toBe("XU");
    expect(result?.rule_month_from_jieqi).toBe(9);
  });

  it("keeps month-branch order and mapping consistent", () => {
    expect(BAZI_MONTH_BRANCH_ORDER).toEqual([
      "YIN",
      "MAO",
      "CHEN",
      "SI",
      "WU",
      "WEI",
      "SHEN",
      "YOU",
      "XU",
      "HAI",
      "ZI",
      "CHOU"
    ]);
    expect(BAZI_MONTH_BRANCH_TO_RULE_MONTH.XU).toBe(9);
    expect(BAZI_MONTH_BRANCH_TO_RULE_MONTH.ZI).toBe(11);
    expect(deriveMonthGanzhiCode("GUI", 3)).toBe("BINGCHEN");
    expect(deriveMonthGanzhiCode("JIA", 3)).toBe("WUCHEN");
  });

  it("returns null for invalid Gregorian input", () => {
    expect(calculateBaziDate("invalid", "14:30:00")).toBeNull();
  });
});
