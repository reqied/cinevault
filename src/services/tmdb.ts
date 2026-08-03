import { invoke } from "@tauri-apps/api/core";
import type { MovieMetadata } from "../shared/types/media";

export async function searchMovieMetadata(
  title: string,
  year: number | null,
): Promise<MovieMetadata | null> {
  return invoke<MovieMetadata | null>("search_movie_metadata", {
    title,
    year,
  });
}