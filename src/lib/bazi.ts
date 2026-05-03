import { Solar } from "lunar-javascript";

export const HEAVENLY_STEM_CODES = [
  "JIA",
  "YI",
  "BING",
  "DING",
  "WU",
  "JI",
  "GENG",
  "XIN",
  "REN",
  "GUI"
] as const;

export const EARTHLY_BRANCH_CODES = [
  "ZI",
  "CHOU",
  "YIN",
  "MAO",
  "CHEN",
  "SI",
  "WU",
  "WEI",
  "SHEN",
  "YOU",
  "XU",
  "HAI"
] as const;

export type HeavenlyStemCode = (typeof HEAVENLY_STEM_CODES)[number];
export type EarthlyBranchCode = (typeof EARTHLY_BRANCH_CODES)[number];
export type GanzhiCode = `${HeavenlyStemCode}${EarthlyBranchCode}`;

/**
 * This order is intentionally aligned with backend monthly formulas:
 * rule_month 1..12 => YIN..CHOU
 */
export const BAZI_MONTH_BRANCH_ORDER = [
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
] as const satisfies readonly EarthlyBranchCode[];

export const BAZI_MONTH_BRANCH_TO_RULE_MONTH: Record<EarthlyBranchCode, number> = {
  YIN: 1,
  MAO: 2,
  CHEN: 3,
  SI: 4,
  WU: 5,
  WEI: 6,
  SHEN: 7,
  YOU: 8,
  XU: 9,
  HAI: 10,
  ZI: 11,
  CHOU: 12
};

const STEM_ZH_TO_CODE: Record<string, HeavenlyStemCode> = {
  甲: "JIA",
  乙: "YI",
  丙: "BING",
  丁: "DING",
  戊: "WU",
  己: "JI",
  庚: "GENG",
  辛: "XIN",
  壬: "REN",
  癸: "GUI"
};

const BRANCH_ZH_TO_CODE: Record<string, EarthlyBranchCode> = {
  子: "ZI",
  丑: "CHOU",
  寅: "YIN",
  卯: "MAO",
  辰: "CHEN",
  巳: "SI",
  午: "WU",
  未: "WEI",
  申: "SHEN",
  酉: "YOU",
  戌: "XU",
  亥: "HAI"
};

export interface BaziDateResult {
  solar_ymdhms: string;
  lunar_text: string;
  year_pillar: string;
  month_pillar: string;
  day_pillar: string;
  time_pillar: string;
  year_stem_code: HeavenlyStemCode | null;
  year_branch_code: EarthlyBranchCode | null;
  year_ganzhi_code: GanzhiCode | null;
  month_stem_code: HeavenlyStemCode | null;
  month_branch_code: EarthlyBranchCode | null;
  month_ganzhi_code: GanzhiCode | null;
  day_stem_code: HeavenlyStemCode | null;
  day_branch_code: EarthlyBranchCode | null;
  day_ganzhi_code: GanzhiCode | null;
  time_stem_code: HeavenlyStemCode | null;
  time_branch_code: EarthlyBranchCode | null;
  time_ganzhi_code: GanzhiCode | null;
  rule_month_from_jieqi: number | null;
}

function parseDate(dateText: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
}

function parseTime(timeText: string): { hour: number; minute: number; second: number } {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeText.trim());
  if (!match) {
    // Midday avoids many date-boundary surprises when time is missing.
    return { hour: 12, minute: 0, second: 0 };
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? "0");
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return { hour: 12, minute: 0, second: 0 };
  }
  return { hour, minute, second };
}

function toStemCode(raw: string): HeavenlyStemCode | null {
  const text = raw.trim();
  if (!text) {
    return null;
  }
  const upper = text.toUpperCase();
  if ((HEAVENLY_STEM_CODES as readonly string[]).includes(upper)) {
    return upper as HeavenlyStemCode;
  }
  if (text in STEM_ZH_TO_CODE) {
    return STEM_ZH_TO_CODE[text];
  }
  return null;
}

function toBranchCode(raw: string): EarthlyBranchCode | null {
  const text = raw.trim();
  if (!text) {
    return null;
  }
  const upper = text.toUpperCase();
  if ((EARTHLY_BRANCH_CODES as readonly string[]).includes(upper)) {
    return upper as EarthlyBranchCode;
  }
  if (text in BRANCH_ZH_TO_CODE) {
    return BRANCH_ZH_TO_CODE[text];
  }
  return null;
}

function toGanzhiCode(stem: HeavenlyStemCode | null, branch: EarthlyBranchCode | null): GanzhiCode | null {
  if (!stem || !branch) {
    return null;
  }
  return `${stem}${branch}` as GanzhiCode;
}

export function monthBranchFromRuleMonth(ruleMonth: number): EarthlyBranchCode | null {
  if (!Number.isInteger(ruleMonth) || ruleMonth < 1 || ruleMonth > 12) {
    return null;
  }
  return BAZI_MONTH_BRANCH_ORDER[ruleMonth - 1] ?? null;
}

export function deriveMonthGanzhiCode(
  yearStem: HeavenlyStemCode | null,
  ruleMonth: number
): GanzhiCode | null {
  if (!yearStem) {
    return null;
  }
  const monthBranch = monthBranchFromRuleMonth(ruleMonth);
  if (!monthBranch) {
    return null;
  }
  const startStemByYearStem: Record<HeavenlyStemCode, HeavenlyStemCode> = {
    JIA: "BING",
    JI: "BING",
    YI: "WU",
    GENG: "WU",
    BING: "GENG",
    XIN: "GENG",
    DING: "REN",
    REN: "REN",
    WU: "JIA",
    GUI: "JIA"
  };
  const startIndex = HEAVENLY_STEM_CODES.indexOf(startStemByYearStem[yearStem]);
  const monthStem = HEAVENLY_STEM_CODES[(startIndex + ruleMonth - 1) % HEAVENLY_STEM_CODES.length];
  return `${monthStem}${monthBranch}` as GanzhiCode;
}

export function calculateBaziDate(
  gregorianDate: string,
  gregorianTime: string
): BaziDateResult | null {
  const date = parseDate(gregorianDate);
  if (!date) {
    return null;
  }
  const time = parseTime(gregorianTime);

  try {
    const solar = Solar.fromYmdHms(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
      time.second
    );
    const lunar = solar.getLunar();
    const bazi = lunar.getEightChar();

    const yearStemCode = toStemCode(bazi.getYearGan());
    const yearBranchCode = toBranchCode(bazi.getYearZhi());
    const monthStemCode = toStemCode(bazi.getMonthGan());
    const monthBranchCode = toBranchCode(bazi.getMonthZhi());
    const dayStemCode = toStemCode(bazi.getDayGan());
    const dayBranchCode = toBranchCode(bazi.getDayZhi());
    const timeStemCode = toStemCode(bazi.getTimeGan());
    const timeBranchCode = toBranchCode(bazi.getTimeZhi());

    return {
      solar_ymdhms: solar.toYmdHms(),
      lunar_text: lunar.toString(),
      year_pillar: bazi.getYear(),
      month_pillar: bazi.getMonth(),
      day_pillar: bazi.getDay(),
      time_pillar: bazi.getTime(),
      year_stem_code: yearStemCode,
      year_branch_code: yearBranchCode,
      year_ganzhi_code: toGanzhiCode(yearStemCode, yearBranchCode),
      month_stem_code: monthStemCode,
      month_branch_code: monthBranchCode,
      month_ganzhi_code: toGanzhiCode(monthStemCode, monthBranchCode),
      day_stem_code: dayStemCode,
      day_branch_code: dayBranchCode,
      day_ganzhi_code: toGanzhiCode(dayStemCode, dayBranchCode),
      time_stem_code: timeStemCode,
      time_branch_code: timeBranchCode,
      time_ganzhi_code: toGanzhiCode(timeStemCode, timeBranchCode),
      rule_month_from_jieqi: monthBranchCode
        ? BAZI_MONTH_BRANCH_TO_RULE_MONTH[monthBranchCode]
        : null
    };
  } catch {
    return null;
  }
}

export function calculateYearPillarFromBirthYear(birthYearRaw: string): string | null {
  const year = Number(birthYearRaw.trim());
  if (!Number.isInteger(year) || year <= 0) {
    return null;
  }

  try {
    // Use a mid-year noon timestamp so the year pillar is stable for "year-only" input.
    const solar = Solar.fromYmdHms(year, 6, 15, 12, 0, 0);
    return solar.getLunar().getEightChar().getYear();
  } catch {
    return null;
  }
}
