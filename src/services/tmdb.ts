import { invoke } from "@tauri-apps/api/core";
import type {
  MovieMetadata,
  SeriesMetadata,
  SeasonMetadata,
  EpisodeDetails
} from "../shared/types/media";

export async function searchMovieMetadata(
  title: string,
  year: number | null,
): Promise<MovieMetadata | null> {
  return invoke<MovieMetadata | null>("search_movie_metadata", {
    title,
    year,
  });
}

export async function searchSeriesMetadata(
  title: string,
  year: number | null,
): Promise<SeriesMetadata | null> {
  return invoke<SeriesMetadata | null>("search_series_metadata", {
    title,
    year,
  });
}

export async function getSeasonMetadata(
  seriesId: number,
  seasonNumber: number,
): Promise<SeasonMetadata> {
  return invoke<SeasonMetadata>("get_season_metadata", {
    seriesId,
    seasonNumber,
  });
}

export async function getEpisodeDetails(
  seriesId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<EpisodeDetails> {
  return invoke<EpisodeDetails>("get_episode_details", {
    seriesId,
    seasonNumber,
    episodeNumber,
  });
}