import type {
  FlyingStarAnnualResponse,
  GregorianConversionResponse,
  LiqiHouseResponse,
  PeriodFourYunResponse,
  TemporalAnnualResponse,
  TemporalMonthlyResponse,
} from "../types/fengshui";

async function getJson<TResponse>(path: string, baseUrl = ""): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        detail = body.detail;
      }
    } catch {
      // keep default
    }
    throw new Error(detail);
  }

  return (await response.json()) as TResponse;
}

/**
 * Convert a Gregorian date to Bazi/Ganzhi pillars.
 * GET /api/v1/temporal/convert/gregorian
 */
export async function fetchGregorianConversion(
  date: string,
  time?: string,
  timezone?: string,
  baseUrl = ""
): Promise<GregorianConversionResponse> {
  const params = new URLSearchParams({ date });
  if (time) params.set("time", time);
  if (timezone) params.set("timezone", timezone);
  return getJson<GregorianConversionResponse>(
    `/api/v1/temporal/convert/gregorian?${params.toString()}`,
    baseUrl
  );
}

/**
 * Get annual temporal calculations (tai_sui, san_sha, etc.).
 * GET /api/v1/temporal/annual?year_ganzhi=...
 */
export async function fetchAnnualTemporal(
  yearGanzhi: string,
  baseUrl = ""
): Promise<TemporalAnnualResponse> {
  const params = new URLSearchParams({ year_ganzhi: yearGanzhi });
  return getJson<TemporalAnnualResponse>(
    `/api/v1/temporal/annual?${params.toString()}`,
    baseUrl
  );
}

/**
 * Get monthly temporal calculations.
 * GET /api/v1/temporal/monthly?year_ganzhi=...&month_ganzhi=...
 */
export async function fetchMonthlyTemporal(
  yearGanzhi: string,
  monthGanzhi: string,
  baseUrl = ""
): Promise<TemporalMonthlyResponse> {
  const params = new URLSearchParams({ year_ganzhi: yearGanzhi, month_ganzhi: monthGanzhi });
  return getJson<TemporalMonthlyResponse>(
    `/api/v1/temporal/monthly?${params.toString()}`,
    baseUrl
  );
}

/**
 * Get annual flying stars.
 * GET /api/v1/temporal/flying-star/annual?solar_year=...
 */
export async function fetchAnnualFlyingStar(
  solarYear: number,
  baseUrl = ""
): Promise<FlyingStarAnnualResponse> {
  const params = new URLSearchParams({ solar_year: String(solarYear) });
  return getJson<FlyingStarAnnualResponse>(
    `/api/v1/temporal/flying-star/annual?${params.toString()}`,
    baseUrl
  );
}

/**
 * Get the bundled house-period profile for Hetu, Sanyuan, Tonglin, and Zhuanlin yun.
 * GET /api/v1/periods/four-yun?solar_year=...&sitting_bagua=...
 */
export async function fetchFourYunProfile(
  solarYear: number,
  sittingBagua: string,
  baseUrl = ""
): Promise<PeriodFourYunResponse> {
  const params = new URLSearchParams({
    solar_year: String(solarYear),
    sitting_bagua: sittingBagua,
  });
  return getJson<PeriodFourYunResponse>(
    `/api/v1/periods/four-yun?${params.toString()}`,
    baseUrl
  );
}

/**
 * Get Liqi house profile with flying star grid / five qi / wealth positions.
 * GET /api/v1/liqi/house/{sitting_bagua}
 */
export async function fetchLiqiHouseProfile(
  sittingBagua: string,
  baseUrl = ""
): Promise<LiqiHouseResponse> {
  return getJson<LiqiHouseResponse>(
    `/api/v1/liqi/house/${sittingBagua}`,
    baseUrl
  );
}
