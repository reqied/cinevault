export type MediaType = "movie" | "episode";
export type LibraryFolderType = "movies" | "series" | "mixed";

export type MetadataStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";
export type EpisodeDetails = {
  tmdbId: number;
  name: string;
  overview: string;
  stillPath: string | null;
  airDate: string | null;
  runtime: number | null;
  voteAverage: number;
  seasonNumber: number;
  episodeNumber: number;
};
export type LibraryFolder = {
  id: number;
  path: string;
  folderType: LibraryFolderType;
  createdAt: string;
};

export type Series = {
  id: number;
  title: string;
  originalTitle: string | null;
  year: number | null;
  tmdbId: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
};

export type Season = {
  id: number;
  seriesId: number;
  seasonNumber: number;
  title: string | null;
  posterPath: string | null;
  overview: string | null;
};


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
  metadataStatus?: MetadataStatus;
  metadataAttempts?: number;
  metadataError?: string | null;
  episodeTitle?: string | null;
  episodeOverview?: string | null;
  stillPath?: string | null;
  airDate?: string | null;
  runtime?: number | null;
  episodeVoteAverage?: number | null;
  watchPosition?: number;
  watchDuration?: number;
  isWatched?: boolean;
  lastWatchedAt?: string | null;
  seriesId?: number | null;
  userRating?: number | null;
  review?: string | null;
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
  metadata_status: MetadataStatus;
  metadata_attempts: number;
  metadata_error: string | null;
  episode_title: string | null;
  episode_overview: string | null;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  episode_vote_average: number | null;
  watch_position: number | null;
  watch_duration: number | null;
  is_watched: number | null;
  last_watched_at: string | null;
  user_rating: number | null;
  review: string | null;
};

export type EpisodeMetadata = {
  tmdbId: number;
  name: string;
  overview: string;
  stillPath: string | null;
  airDate: string | null;
  episodeNumber: number;
  seasonNumber: number;
  runtime: number | null;
  voteAverage: number;
};

export type SeasonMetadata = {
  tmdbId: number;
  name: string;
  overview: string;
  posterPath: string | null;
  airDate: string | null;
  seasonNumber: number;
  episodes: EpisodeMetadata[];
};

export type SeriesMetadata = {
  tmdbId: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  firstAirDate: string | null;
  voteAverage: number;
};

export type SeriesGroup = {
  id?: number;
  key: string;
  title: string;
  originalTitle?: string | null;
  year: number | null;
  tmdbId?: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  firstAirDate?: string | null;
  voteAverage?: number | null;
  userRating?: number | null;
  review?: string | null;
  episodes: MediaFile[];
};

export type LibraryItem =
  | {
      type: "movie";
      file: MediaFile;
    }
  | {
      type: "series";
      series: SeriesGroup;
    };

    export type WatchlistMediaType = "movie" | "series";

    export type WatchlistItem = {
      id: number;
      mediaType: WatchlistMediaType;
      tmdbId: number;
      title: string;
      originalTitle: string | null;
      year: number | null;
      posterPath: string | null;
      backdropPath: string | null;
      overview: string | null;
      isWatched: boolean;
      linkedMediaId: number | null;
      linkedSeriesId: number | null;
      createdAt: string;
      userRating: number | null;
      review: string | null;
      linkedPath: string | null;
      linkedKind: "file" | "folder" | null;
    };
    
    export type WatchlistRow = {
      id: number;
      media_type: WatchlistMediaType;
      tmdb_id: number;
      title: string;
      original_title: string | null;
      year: number | null;
      poster_path: string | null;
      backdrop_path: string | null;
      overview: string | null;
      is_watched: number;
      linked_media_id: number | null;
      linked_series_id: number | null;
      created_at: string;
      user_rating: number | null;
      review: string | null;
      linked_path: string | null;
      linked_kind: "file" | "folder" | null;
    };

    export type TmdbSearchItem = {
      tmdbId: number;
      mediaType: WatchlistMediaType;
      title: string;
      originalTitle: string;
      year: number | null;
      posterPath: string | null;
      backdropPath: string | null;
      overview: string;
    };