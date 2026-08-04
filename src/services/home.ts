import {
    getMediaFiles,
    getSeriesGroups,
    getWatchlist,
  } from "./database";
  import type {
    LibraryItem,
    MediaFile,
    WatchlistItem,
  } from "../shared/types/media";
  
  export type HomeData = {
    continueWatching: MediaFile[];
    recentlyAdded: LibraryItem[];
    movies: LibraryItem[];
    series: LibraryItem[];
    watchlist: WatchlistItem[];
  };
  
  export async function getHomeData(): Promise<HomeData> {
    const [files, seriesGroups, watchlist] =
      await Promise.all([
        getMediaFiles(),
        getSeriesGroups(),
        getWatchlist(),
      ]);
  
    const movies: LibraryItem[] = files
      .filter((file) => file.mediaType === "movie")
      .map((file) => ({
        type: "movie",
        file,
      }));
  
    const series: LibraryItem[] = seriesGroups
      .filter((series) => series.episodes.length > 0)
      .map((series) => ({
        type: "series",
        series,
      }));
  
    const continueWatching = files
      .filter(
        (file) =>
          (file.watchPosition ?? 0) > 0 &&
          (file.watchDuration ?? 0) > 0 &&
          !file.isWatched,
      )
      .sort((left, right) => {
        const leftDate = left.lastWatchedAt
          ? Date.parse(left.lastWatchedAt)
          : 0;
  
        const rightDate = right.lastWatchedAt
          ? Date.parse(right.lastWatchedAt)
          : 0;
  
        return rightDate - leftDate;
      })
      .slice(0, 15);
  
    return {
      continueWatching,
      recentlyAdded: [...movies, ...series].slice(0, 15),
      movies: movies.slice(0, 15),
      series: series.slice(0, 15),
      watchlist: watchlist.slice(0, 15),
    };
  }