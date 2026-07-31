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
};