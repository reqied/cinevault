import {
    getMediaFiles,
    getSeriesGroups,
    getWatchlist,
  } from "./database";
  import type {
    LibraryItem,
    MediaFile,
    SeriesGroup,
    WatchlistItem,
  } from "../shared/types/media";
  
  export type HomeData = {
    continueWatching: MediaFile[];
    recentlyAdded: LibraryItem[];
    recentlyWatched: LibraryItem[];
    watched: LibraryItem[];
    movies: LibraryItem[];
    series: LibraryItem[];
    watchlist: WatchlistItem[];
  };
  
  function getDateValue(value: string | null | undefined): number {
    return value ? Date.parse(value) : 0;
  }
  
  function getSeriesLastWatchedAt(
    series: SeriesGroup,
  ): string | null {
    const lastWatchedEpisode = series.episodes
      .filter((episode) => episode.lastWatchedAt)
      .sort(
        (left, right) =>
          getDateValue(right.lastWatchedAt) -
          getDateValue(left.lastWatchedAt),
      )[0];
  
    return lastWatchedEpisode?.lastWatchedAt ?? null;
  }
  
  function isSeriesWatched(series: SeriesGroup): boolean {
    return (
      series.episodes.length > 0 &&
      series.episodes.every(
        (episode) => episode.isWatched,
      )
    );
  }
  
  export async function getHomeData(): Promise<HomeData> {
    const [files, seriesGroups, watchlist] =
      await Promise.all([
        getMediaFiles(),
        getSeriesGroups(),
        getWatchlist(),
      ]);
  
    const movieFiles = files.filter(
      (file) => file.mediaType === "movie",
    );
  
    const movies: LibraryItem[] = movieFiles.map(
      (file) => ({
        type: "movie",
        file,
      }),
    );
  
    const series: LibraryItem[] = seriesGroups
      .filter(
        (seriesGroup) =>
          seriesGroup.episodes.length > 0,
      )
      .map((seriesGroup) => ({
        type: "series",
        series: seriesGroup,
      }));
  
    const continueWatching = files
      .filter(
        (file) =>
          (file.watchPosition ?? 0) > 0 &&
          (file.watchDuration ?? 0) > 0 &&
          !file.isWatched,
      )
      .sort(
        (left, right) =>
          getDateValue(right.lastWatchedAt) -
          getDateValue(left.lastWatchedAt),
      )
      .slice(0, 15);
  
    const recentlyWatchedMovies = movieFiles
      .filter((file) => file.lastWatchedAt)
      .map((file) => ({
        item: {
          type: "movie",
          file,
        } as LibraryItem,
        lastWatchedAt: file.lastWatchedAt,
      }));
  
    const recentlyWatchedSeries = seriesGroups
      .map((seriesGroup) => ({
        series: seriesGroup,
        lastWatchedAt:
          getSeriesLastWatchedAt(seriesGroup),
      }))
      .filter(
        (
          value,
        ): value is {
          series: SeriesGroup;
          lastWatchedAt: string;
        } => value.lastWatchedAt !== null,
      )
      .map((value) => ({
        item: {
          type: "series",
          series: value.series,
        } as LibraryItem,
        lastWatchedAt: value.lastWatchedAt,
      }));
  
    const recentlyWatched = [
      ...recentlyWatchedMovies,
      ...recentlyWatchedSeries,
    ]
      .sort(
        (left, right) =>
          getDateValue(right.lastWatchedAt) -
          getDateValue(left.lastWatchedAt),
      )
      .slice(0, 15)
      .map(({ item }) => item);
  
    const watchedMovies: LibraryItem[] = movieFiles
      .filter((file) => file.isWatched)
      .map((file) => ({
        type: "movie",
        file,
      }));
  
    const watchedSeries: LibraryItem[] = seriesGroups
      .filter(isSeriesWatched)
      .map((seriesGroup) => ({
        type: "series",
        series: seriesGroup,
      }));
  
    const watched = [
      ...watchedMovies,
      ...watchedSeries,
    ].slice(0, 15);
  
    return {
      continueWatching,
      recentlyAdded: [...movies, ...series].slice(
        0,
        15,
      ),
      recentlyWatched,
      watched,
      movies: movies.slice(0, 15),
      series: series.slice(0, 15),
      watchlist: watchlist.slice(0, 15),
    };
  }