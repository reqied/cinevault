import {
    getSeriesGroups,
    saveSeasonMetadata,
  } from "./database";
  import { getSeasonMetadata } from "./tmdb";
  
  export async function updateSeasonMetadata(): Promise<void> {
    const seriesGroups = await getSeriesGroups();
  
    for (const series of seriesGroups) {
      if (!series.id || !series.tmdbId) {
        continue;
      }
  
      const seasonNumbers = Array.from(
        new Set(
          series.episodes
            .map((episode) => episode.season)
            .filter(
              (season): season is number =>
                season !== null && season > 0,
            ),
        ),
      );
  
      for (const seasonNumber of seasonNumbers) {
        try {
          const metadata = await getSeasonMetadata(
            series.tmdbId,
            seasonNumber,
          );
  
          await saveSeasonMetadata(series.id, metadata);
        } catch (error) {
          console.error(
            `Ошибка загрузки сезона ${series.title} S${seasonNumber}:`,
            error,
          );
        }
      }
    }
  
    window.dispatchEvent(
      new Event("cinevault:library-changed"),
    );
  }