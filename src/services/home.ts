import {
    getMediaFiles,
    getSeriesGroups,
    getWatchlist,
  } from "./database";
  import type {
    LibraryItem,
    WatchlistItem,
  } from "../shared/types/media";
  
  export type HomeData = {
    recentlyAdded: LibraryItem[];
    movies: LibraryItem[];
    series: LibraryItem[];
    watchlist: WatchlistItem[];
  };
  
  export async function getHomeData(): Promise<HomeData> {
    const [files, seriesGroups, watchlist] = await Promise.all([
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
  
    const recentlyAdded = [...movies, ...series].slice(0, 15);
  
    return {
      recentlyAdded,
      movies: movies.slice(0, 15),
      series: series.slice(0, 15),
      watchlist: watchlist.slice(0, 15),
    };
  }