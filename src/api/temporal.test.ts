import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fetchGregorianConversion,
  fetchAnnualTemporal,
  fetchFourYunProfile,
  fetchMonthlyTemporal,
  fetchAnnualFlyingStar,
  fetchLiqiHouseProfile,
} from "./temporal";

const TEST_BASE = "http://test.local";

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetchOk(data: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status: number, detail?: string) {
  const body = detail ? { detail } : undefined;
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("fetchGregorianConversion", () => {
  it("sends date and returns parsed response", async () => {
    const expected = { year_pillar: "Jia-Chen" };
    mockFetchOk(expected);
    const result = await fetchGregorianConversion(TEST_BASE, "2026-04-25");
    expect(result).toEqual(expected);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${TEST_BASE}/api/v1/temporal/convert/gregorian?date=2026-04-25`,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("includes optional time parameter", async () => {
    mockFetchOk({});
    await fetchGregorianConversion(TEST_BASE, "2026-04-25", "14:30:00");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("time=14%3A30%3A00"),
      expect.any(Object)
    );
  });

  it("throws on HTTP error", async () => {
    mockFetchError(422, "Invalid date");
    await expect(fetchGregorianConversion(TEST_BASE, "bad")).rejects.toThrow("Invalid date");
  });

  it("throws generic on HTTP error without detail", async () => {
    mockFetchError(500);
    await expect(fetchGregorianConversion(TEST_BASE, "boom")).rejects.toThrow("HTTP 500");
  });
});

describe("fetchAnnualTemporal", () => {
  it("sends year ganzhi and returns result", async () => {
    const expected = { tai_sui: "Dong-Nan" };
    mockFetchOk(expected);
    const result = await fetchAnnualTemporal(TEST_BASE, "Jia-Chen");
    expect(result).toEqual(expected);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${TEST_BASE}/api/v1/temporal/annual?year_ganzhi=Jia-Chen`,
      expect.any(Object)
    );
  });
});

describe("fetchMonthlyTemporal", () => {
  it("sends year/month ganzhi", async () => {
    mockFetchOk({});
    await fetchMonthlyTemporal(TEST_BASE, "Jia-Chen", "Ding-Si");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${TEST_BASE}/api/v1/temporal/monthly?year_ganzhi=Jia-Chen&month_ganzhi=Ding-Si`,
      expect.any(Object)
    );
  });
});

describe("fetchAnnualFlyingStar", () => {
  it("sends solar year as number", async () => {
    mockFetchOk({});
    await fetchAnnualFlyingStar(TEST_BASE, 2026);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${TEST_BASE}/api/v1/temporal/flying-star/annual?solar_year=2026`,
      expect.any(Object)
    );
  });
});

describe("fetchFourYunProfile", () => {
  it("sends solar year and sitting bagua", async () => {
    mockFetchOk({});
    await fetchFourYunProfile(TEST_BASE, 2026, "KAN");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${TEST_BASE}/api/v1/periods/four-yun?solar_year=2026&sitting_bagua=KAN`,
      expect.any(Object)
    );
  });
});

describe("fetchLiqiHouseProfile", () => {
  it("sends sitting bagua in path", async () => {
    const expected = { flying_star_grid: [] };
    mockFetchOk(expected);
    const result = await fetchLiqiHouseProfile(TEST_BASE, "QIAN");
    expect(result).toEqual(expected);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${TEST_BASE}/api/v1/liqi/house/QIAN`,
      expect.any(Object)
    );
  });
});
