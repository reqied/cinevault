export type MediaType = "movie" | "episode";

export type MediaFile = {
  id?: number;
  name: string;
  path: string;
  extension: string;
  size: number;
  title: string;
  year: number | null;
  mediaType: MediaType;
  season: number | null;
  episode: number | null;
  tmdbId?: number | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  overview?: string | null;
  originalTitle?: string | null;
  releaseDate?: string | null;

};

export type MovieMetadata = {
  tmdbId: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
};


export type MediaRow = {
  id: number;
  file_name: string;
  path: string;
  extension: string;
  size: number;
  title: string;
  year: number | null;
  media_type: MediaType;
  season: number | null;
  episode: number | null;
  tmdb_id: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  original_title: string | null;
  release_date: string | null;
};