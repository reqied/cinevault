import {
    getMediaFiles,
    getSeriesGroups,
  } from "./database";
  import type {
    LibraryItem,
    MediaFile,
    SeriesGroup,
  } from "../shared/types/media";
  
  export type RatingDistributionItem = {
    rating: number;
    count: number;
  };
  
  export type MonthlyActivityItem = {
    month: string;
    count: number;
    watchedSeconds: number;
  };
  
  export type DailyActivityItem = {
    date: string;
    count: number;
  };
  
  export type YearStatisticsItem = {
    year: number;
    count: number;
  };
  
  export type TierName =
    | "S"
    | "A"
    | "B"
    | "C"
    | "D"
    | "F";
  
  export type TierListData = Record<
    TierName,
    LibraryItem[]
  >;
  
  export type StatisticsData = {
    movieCount: number;
    seriesCount: number;
    episodeCount: number;
  
    watchedMovieCount: number;
    completedSeriesCount: number;
    watchedEpisodeCount: number;
  
    watchedSeconds: number;
    remainingSeconds: number;
  
    averageRating: number | null;
    ratedCount: number;
  
    ratingDistribution: RatingDistributionItem[];
    monthlyActivity: MonthlyActivityItem[];
    dailyActivity: DailyActivityItem[];
    favoriteYears: YearStatisticsItem[];
  
    tierList: TierListData;
  };
  
  function getWatchedSeconds(file: MediaFile): number {
    const duration = file.watchDuration ?? 0;
    const position = file.watchPosition ?? 0;
  
    if (duration <= 0) {
      return 0;
    }
  
    if (file.isWatched) {
      return duration;
    }
  
    return Math.min(position, duration);
  }
  
  function getRemainingSeconds(file: MediaFile): number {
    const duration = file.watchDuration ?? 0;
  
    if (duration <= 0 || file.isWatched) {
      return 0;
    }
  
    return Math.max(
      0,
      duration - (file.watchPosition ?? 0),
    );
  }
  
  function isSeriesWatched(
    series: SeriesGroup,
  ): boolean {
    return (
      series.episodes.length > 0 &&
      series.episodes.every(
        (episode) => episode.isWatched,
      )
    );
  }
  
  function getTier(
    rating: number,
  ): TierName {
    if (rating >= 10) {
      return "S";
    }
  
    if (rating >= 8) {
      return "A";
    }
  
    if (rating >= 7) {
      return "B";
    }
  
    if (rating >= 5) {
      return "C";
    }
  
    if (rating >= 3) {
      return "D";
    }
  
    return "F";
  }
  
  function createEmptyTierList(): TierListData {
    return {
      S: [],
      A: [],
      B: [],
      C: [],
      D: [],
      F: [],
    };
  }
  
  function getMonthKey(value: string): string {
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return "";
    }
  
    return `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, "0")}`;
  }
  
  function getDateKey(value: string): string {
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return "";
    }
  
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(
        2,
        "0",
      ),
      String(date.getDate()).padStart(
        2,
        "0",
      ),
    ].join("-");
  }
  
  export async function getStatisticsData(): Promise<StatisticsData> {
    const [files, seriesGroups] =
      await Promise.all([
        getMediaFiles(),
        getSeriesGroups(),
      ]);
  
    const movies = files.filter(
      (file) => file.mediaType === "movie",
    );
  
    const episodes = files.filter(
      (file) => file.mediaType === "episode",
    );
  
    const watchedMovieCount = movies.filter(
      (file) => file.isWatched,
    ).length;
  
    const watchedEpisodeCount = episodes.filter(
      (file) => file.isWatched,
    ).length;
  
    const completedSeriesCount =
      seriesGroups.filter(isSeriesWatched).length;
  
    const watchedSeconds = files.reduce(
      (sum, file) =>
        sum + getWatchedSeconds(file),
      0,
    );
  
    const remainingSeconds = files.reduce(
      (sum, file) =>
        sum + getRemainingSeconds(file),
      0,
    );
  
    const movieRatings = movies
      .filter(
        (
          file,
        ): file is MediaFile & {
          userRating: number;
        } =>
          typeof file.userRating === "number",
      )
      .map((file) => ({
        rating: file.userRating,
        item: {
          type: "movie",
          file,
        } as LibraryItem,
      }));
  
    const seriesRatings = seriesGroups
      .filter(
        (
          series,
        ): series is SeriesGroup & {
          userRating: number;
        } =>
          typeof series.userRating === "number",
      )
      .map((series) => ({
        rating: series.userRating,
        item: {
          type: "series",
          series,
        } as LibraryItem,
      }));
  
    const ratings = [
      ...movieRatings,
      ...seriesRatings,
    ];
  
    const averageRating =
      ratings.length > 0
        ? ratings.reduce(
            (sum, item) => sum + item.rating,
            0,
          ) / ratings.length
        : null;
  
    const ratingDistribution =
      Array.from(
        {
          length: 10,
        },
        (_, index) => {
          const rating = index + 1;
  
          return {
            rating,
            count: ratings.filter(
              (item) =>
                Math.round(item.rating) ===
                rating,
            ).length,
          };
        },
      );
  
    const tierList = createEmptyTierList();
  
    for (const ratedItem of ratings) {
      const tier = getTier(
        ratedItem.rating,
      );
  
      tierList[tier].push(ratedItem.item);
    }
  
    const monthlyMap = new Map<
      string,
      {
        count: number;
        watchedSeconds: number;
      }
    >();
  
    const dailyMap = new Map<
      string,
      number
    >();
  
    for (const file of files) {
      if (!file.lastWatchedAt) {
        continue;
      }
  
      const month =
        getMonthKey(file.lastWatchedAt);
  
      const date =
        getDateKey(file.lastWatchedAt);
  
      if (month) {
        const current = monthlyMap.get(
          month,
        ) ?? {
          count: 0,
          watchedSeconds: 0,
        };
  
        current.count += 1;
        current.watchedSeconds +=
          getWatchedSeconds(file);
  
        monthlyMap.set(month, current);
      }
  
      if (date) {
        dailyMap.set(
          date,
          (dailyMap.get(date) ?? 0) + 1,
        );
      }
    }
  
    const monthlyActivity = [
      ...monthlyMap.entries(),
    ]
      .map(([month, data]) => ({
        month,
        count: data.count,
        watchedSeconds:
          data.watchedSeconds,
      }))
      .sort((left, right) =>
        left.month.localeCompare(right.month),
      );
  
    const dailyActivity = [
      ...dailyMap.entries(),
    ]
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((left, right) =>
        left.date.localeCompare(right.date),
      );
  
    const yearMap = new Map<
      number,
      number
    >();
  
    for (const movie of movies) {
      if (!movie.year) {
        continue;
      }
  
      yearMap.set(
        movie.year,
        (yearMap.get(movie.year) ?? 0) + 1,
      );
    }
  
    for (const series of seriesGroups) {
      if (!series.year) {
        continue;
      }
  
      yearMap.set(
        series.year,
        (yearMap.get(series.year) ?? 0) +
          1,
      );
    }
  
    const favoriteYears = [
      ...yearMap.entries(),
    ]
      .map(([year, count]) => ({
        year,
        count,
      }))
      .sort(
        (left, right) =>
          right.count - left.count ||
          right.year - left.year,
      )
      .slice(0, 10);
  
    return {
      movieCount: movies.length,
      seriesCount: seriesGroups.filter(
        (series) =>
          series.episodes.length > 0,
      ).length,
      episodeCount: episodes.length,
  
      watchedMovieCount,
      completedSeriesCount,
      watchedEpisodeCount,
  
      watchedSeconds,
      remainingSeconds,
  
      averageRating,
      ratedCount: ratings.length,
  
      ratingDistribution,
      monthlyActivity,
      dailyActivity,
      favoriteYears,
  
      tierList,
    };
  }