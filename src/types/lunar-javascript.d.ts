declare module "lunar-javascript" {
  interface EightCharLike {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
  }

  interface LunarLike {
    toString(): string;
    getEightChar(): EightCharLike;
  }

  interface SolarLike {
    toYmdHms(): string;
    getLunar(): LunarLike;
  }

  export const Solar: {
    fromYmdHms(
      year: number | string,
      month: number | string,
      day: number | string,
      hour: number | string,
      minute: number | string,
      second: number | string
    ): SolarLike;
  };
}
