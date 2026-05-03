import type {
  FlyingStarAnnualResponse,
  GregorianConversionResponse,
  LiqiHouseResponse,
  PeriodFourYunResponse,
  TemporalAnnualResponse,
  TemporalMonthlyResponse,
} from "../types/fengshui";

async function getJson<TResponse>(baseUrl: string, path: string): Promise<TResponse> {
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
  baseUrl: string,
  date: string,
  time?: string,
  timezone?: string
): Promise<GregorianConversionResponse> {
  const params = new URLSearchParams({ date });
  if (time) params.set("time", time);
  if (timezone) params.set("timezone", timezone);
  return getJson<GregorianConversionResponse>(
    baseUrl,
    `/api/v1/temporal/convert/gregorian?${params.toString()}`
  );
}

/**
 * Get annual temporal calculations (tai_sui, san_sha, etc.).
 * GET /api/v1/temporal/annual?year_ganzhi=...
 */
export async function fetchAnnualTemporal(
  baseUrl: string,
  yearGanzhi: string
): Promise<TemporalAnnualResponse> {
  const params = new URLSearchParams({ year_ganzhi: yearGanzhi });
  return getJson<TemporalAnnualResponse>(
    baseUrl,
    `/api/v1/temporal/annual?${params.toString()}`
  );
}

/**
 * Get monthly temporal calculations.
 * GET /api/v1/temporal/monthly?year_ganzhi=...&month_ganzhi=...
 */
export async function fetchMonthlyTemporal(
  baseUrl: string,
  yearGanzhi: string,
  monthGanzhi: string
): Promise<TemporalMonthlyResponse> {
  const params = new URLSearchParams({ year_ganzhi: yearGanzhi, month_ganzhi: monthGanzhi });
  return getJson<TemporalMonthlyResponse>(
    baseUrl,
    `/api/v1/temporal/monthly?${params.toString()}`
  );
}

/**
 * Get annual flying stars.
 * GET /api/v1/temporal/flying-star/annual?solar_year=...
 */
export async function fetchAnnualFlyingStar(
  baseUrl: string,
  solarYear: number
): Promise<FlyingStarAnnualResponse> {
  const params = new URLSearchParams({ solar_year: String(solarYear) });
  return getJson<FlyingStarAnnualResponse>(
    baseUrl,
    `/api/v1/temporal/flying-star/annual?${params.toString()}`
  );
}

/**
 * Get the bundled house-period profile for Hetu, Sanyuan, Tonglin, and Zhuanlin yun.
 * GET /api/v1/periods/four-yun?solar_year=...&sitting_bagua=...
 */
export async function fetchFourYunProfile(
  baseUrl: string,
  solarYear: number,
  sittingBagua: string
): Promise<PeriodFourYunResponse> {
  const params = new URLSearchParams({
    solar_year: String(solarYear),
    sitting_bagua: sittingBagua,
  });
  return getJson<PeriodFourYunResponse>(
    baseUrl,
    `/api/v1/periods/four-yun?${params.toString()}`
  );
}

/**
 * Get Liqi house profile with flying star grid / five qi / wealth positions.
 * GET /api/v1/liqi/house/{sitting_bagua}
 */
export async function fetchLiqiHouseProfile(
  baseUrl: string,
  sittingBagua: string
): Promise<LiqiHouseResponse> {
  return getJson<LiqiHouseResponse>(
    baseUrl,
    `/api/v1/liqi/house/${sittingBagua}`
  );
}
