import {
    getMediaFiles,
    getSeriesGroups,
    getWatchlist,
  } from "./database";
  import type {
    MediaFile,
    SeriesGroup,
    WatchlistItem,
  } from "../shared/types/media";
  
  export type SearchResult =
    | {
        type: "movie";
        key: string;
        file: MediaFile;
      }
    | {
        type: "series";
        key: string;
        series: SeriesGroup;
      }
    | {
        type: "episode";
        key: string;
        file: MediaFile;
        series: SeriesGroup | null;
      }
    | {
        type: "watchlist";
        key: string;
        item: WatchlistItem;
      };
  
  function normalize(value: string | null | undefined): string {
    return (value ?? "")
      .toLowerCase()
      .replaceAll("ё", "е")
      .trim();
  }
  
  function includesQuery(
    query: string,
    values: Array<string | number | null | undefined>,
  ): boolean {
    return values.some((value) =>
      normalize(String(value ?? "")).includes(query),
    );
  }
  
  export async function searchLibrary(
    rawQuery: string,
  ): Promise<SearchResult[]> {
    const query = normalize(rawQuery);
  
    if (!query) {
      return [];
    }
  
    const [files, seriesGroups, watchlist] =
      await Promise.all([
        getMediaFiles(),
        getSeriesGroups(),
        getWatchlist(),
      ]);
  
    const seriesById = new Map<number, SeriesGroup>();
  
    for (const series of seriesGroups) {
      if (series.id) {
        seriesById.set(series.id, series);
      }
    }
  
    const movieResults: SearchResult[] = files
      .filter((file) => file.mediaType === "movie")
      .filter((file) =>
        includesQuery(query, [
          file.title,
          file.originalTitle,
          file.year,
          file.overview,
          file.name,
        ]),
      )
      .map((file) => ({
        type: "movie",
        key: `movie-${file.id ?? file.path}`,
        file,
      }));
  
    const seriesResults: SearchResult[] = seriesGroups
      .filter((series) =>
        includesQuery(query, [
          series.title,
          series.originalTitle,
          series.year,
          series.overview,
        ]),
      )
      .map((series) => ({
        type: "series",
        key: `series-${series.id ?? series.key}`,
        series,
      }));
  
    const episodeResults: SearchResult[] = files
      .filter((file) => file.mediaType === "episode")
      .filter((file) =>
        includesQuery(query, [
          file.title,
          file.episodeTitle,
          file.episodeOverview,
          file.season,
          file.episode,
          file.name,
        ]),
      )
      .map((file) => ({
        type: "episode",
        key: `episode-${file.id ?? file.path}`,
        file,
        series: file.seriesId
          ? seriesById.get(file.seriesId) ?? null
          : null,
      }));
  
    const watchlistResults: SearchResult[] = watchlist
      .filter((item) =>
        includesQuery(query, [
          item.title,
          item.originalTitle,
          item.year,
          item.overview,
        ]),
      )
      .map((item) => ({
        type: "watchlist",
        key: `watchlist-${item.id}`,
        item,
      }));
  
    return [
      ...movieResults,
      ...seriesResults,
      ...episodeResults,
      ...watchlistResults,
    ];
  }