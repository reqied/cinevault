import { invoke } from "@tauri-apps/api/core";
import type {
  MovieMetadata,
  SeriesMetadata,
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