import {
    getSeriesGroups,
    saveSeriesMetadata,
    syncSeriesFromEpisodes,
  } from "./database";
  import { searchSeriesMetadata } from "./tmdb";
  
  export async function updateSeriesMetadata(): Promise<void> {
    await syncSeriesFromEpisodes();
  
    const seriesGroups = await getSeriesGroups();
  
    for (const series of seriesGroups) {
      if (!series.id || series.tmdbId) {
        continue;
      }
  
      const cleanedTitle = series.title
        .replace(/\b(lostfilm|netflix|amazon|web-dl|webrip)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
  
      try {
        let metadata = await searchSeriesMetadata(
          cleanedTitle,
          series.year,
        );
  
        if (!metadata && series.year !== null) {
          metadata = await searchSeriesMetadata(
            cleanedTitle,
            null,
          );
        }
  
        if (!metadata) {
          console.error("Сериал не найден в TMDB:", {
            originalTitle: series.title,
            cleanedTitle,
            year: series.year,
          });
  
          continue;
        }
  
        await saveSeriesMetadata(series.id, metadata);
      } catch (error) {
        console.error(
          `Ошибка загрузки метаданных сериала ${series.title}:`,
          error,
        );
      }
    }
  
    window.dispatchEvent(
      new Event("cinevault:library-changed"),
    );
  }