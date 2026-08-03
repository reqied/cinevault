import Database from "@tauri-apps/plugin-sql";
import type {
  LibraryFolder,
  LibraryFolderType,
  MediaFile,
  MediaRow,
  MovieMetadata,
  SeriesGroup,
  SeriesMetadata,
  SeasonMetadata,
  WatchlistItem,
  WatchlistRow,
} from "../shared/types/media";

let database: Database | null = null;

async function getDatabase(): Promise<Database> {
  if (!database) {
    database = await Database.load("sqlite:cinevault.db");
  }

  return database;
}

export async function saveMovieMetadata(
  mediaId: number,
  metadata: MovieMetadata,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `
      UPDATE media
      SET
        tmdb_id = ?,
        title = ?,
        original_title = ?,
        overview = ?,
        poster_path = ?,
        backdrop_path = ?,
        release_date = ?,
        metadata_status = 'completed',
        metadata_error = NULL,
        metadata_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      metadata.tmdbId,
      metadata.title,
      metadata.originalTitle,
      metadata.overview,
      metadata.posterPath,
      metadata.backdropPath,
      metadata.releaseDate,
      mediaId,
    ],
  );
}

export async function saveMediaFiles(files: MediaFile[],
  libraryFolderId: number,
): Promise<void> {
  const db = await getDatabase();

  for (const file of files) {
    await db.execute(
      `
        INSERT INTO media (
          library_folder_id,
          path,
          file_name,
          title,
          year,
          media_type,
          extension,
          size,
          season,
          episode
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
          library_folder_id = excluded.library_folder_id,
          file_name = excluded.file_name,
          extension = excluded.extension,
          size = excluded.size,
          season = excluded.season,
          episode = excluded.episode,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        libraryFolderId,
        file.path,
        file.name,
        file.title,
        file.year,
        file.mediaType,
        file.extension,
        file.size,
        file.season,
        file.episode,
      ],
    );
  }
}

export async function getMediaFiles(): Promise<MediaFile[]> {
  const db = await getDatabase();

  const rows = await db.select<MediaRow[]>(
    `
      SELECT
        id,
        library_folder_id,
        series_id,
        season_id,
        path,
        file_name,
        title,
        year,
        media_type,
        extension,
        size,
        season,
        episode,
        tmdb_id,
        poster_path,
        backdrop_path,
        overview,
        original_title,
        release_date,
        metadata_status,
        metadata_attempts,
        metadata_error,
        episode_title,
        episode_overview,
        still_path,
        air_date,
        runtime,
        episode_vote_average
      FROM media
      ORDER BY created_at DESC
    `,
  );
  return rows.map((row) => ({
    id: row.id,
    libraryFolderId: row.library_folder_id,
    seriesId: row.series_id,
    seasonId: row.season_id,
    name: row.file_name,
    path: row.path,
    extension: row.extension,
    size: row.size,
    title: row.title,
    year: row.year,
    mediaType: row.media_type,
    season: row.season,
    episode: row.episode,
    tmdbId: row.tmdb_id,
    posterPath: row.poster_path,
    backdropPath: row.backdrop_path,
    overview: row.overview,
    originalTitle: row.original_title,
    releaseDate: row.release_date,
    metadataStatus: row.metadata_status,
    metadataAttempts: row.metadata_attempts,
    metadataError: row.metadata_error,
    episodeTitle: row.episode_title,
    episodeOverview: row.episode_overview,
    stillPath: row.still_path,
    airDate: row.air_date,
    runtime: row.runtime,
    episodeVoteAverage: row.episode_vote_average,
  }));
}

export async function saveLibraryFolder(
  path: string,
  folderType: LibraryFolderType = "mixed",
): Promise<number> {
  const db = await getDatabase();

  await db.execute(
    `
      INSERT INTO library_folders (
        path,
        folder_type
      )
      VALUES (?, ?)
      ON CONFLICT(path) DO UPDATE SET
        folder_type = excluded.folder_type,
        updated_at = CURRENT_TIMESTAMP
    `,
    [path, folderType],
  );

  const rows = await db.select<{ id: number }[]>(
    `
      SELECT id
      FROM library_folders
      WHERE path = ?
      LIMIT 1
    `,
    [path],
  );

  if (!rows[0]) {
    throw new Error("Не удалось сохранить папку библиотеки");
  }

  return rows[0].id;
}

export async function getLibraryFolders(): Promise<LibraryFolder[]> {
  const db = await getDatabase();

  const rows = await db.select<
    {
      id: number;
      path: string;
      folder_type: LibraryFolderType;
      created_at: string;
    }[]
  >(
    `
      SELECT
        id,
        path,
        folder_type,
        created_at
      FROM library_folders
      ORDER BY created_at DESC
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    path: row.path,
    folderType: row.folder_type,
    createdAt: row.created_at,
  }));
}


export async function deleteLibraryFolder(
  libraryFolderId: number,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `
      DELETE FROM media
      WHERE library_folder_id = ?
    `,
    [libraryFolderId],
  );

  await db.execute(
    `
      DELETE FROM library_folders
      WHERE id = ?
    `,
    [libraryFolderId],
  );
}

export async function deleteMissingMediaFiles(
  libraryFolderId: number,
  existingPaths: string[],
): Promise<void> {
  const db = await getDatabase();

  if (existingPaths.length === 0) {
    await db.execute(
      `
        DELETE FROM media
        WHERE library_folder_id = ?
      `,
      [libraryFolderId],
    );

    return;
  }

  const placeholders = existingPaths.map(() => "?").join(", ");

  await db.execute(
    `
      DELETE FROM media
      WHERE library_folder_id = ?
        AND path NOT IN (${placeholders})
    `,
    [libraryFolderId, ...existingPaths],
  );
}

export async function resetInterruptedMetadataTasks(): Promise<void> {
  const db = await getDatabase();

  await db.execute(`
    UPDATE media
    SET
      metadata_status = 'pending',
      metadata_error = NULL
    WHERE metadata_status = 'processing'
  `);
}

export async function getPendingMetadataFiles(
  limit = 20,
): Promise<MediaFile[]> {
  const db = await getDatabase();

  const rows = await db.select<MediaRow[]>(
    `
      SELECT
        id,
        library_folder_id,
        series_id,
        season_id,
        path,
        file_name,
        title,
        year,
        media_type,
        extension,
        size,
        season,
        episode,
        tmdb_id,
        poster_path,
        backdrop_path,
        overview,
        original_title,
        release_date,
        metadata_status,
        metadata_attempts,
        metadata_error
      FROM media
      WHERE media_type = 'movie'
        AND tmdb_id IS NULL
        AND metadata_status = 'pending'
        AND metadata_attempts < 3
      ORDER BY created_at
      LIMIT ?
    `,
    [limit],
  );

  return rows.map((row) => ({
    id: row.id,
    libraryFolderId: row.library_folder_id,
    seriesId: row.series_id,
    seasonId: row.season_id,
    name: row.file_name,
    path: row.path,
    extension: row.extension,
    size: row.size,
    title: row.title,
    year: row.year,
    mediaType: row.media_type,
    season: row.season,
    episode: row.episode,
    tmdbId: row.tmdb_id,
    posterPath: row.poster_path,
    backdropPath: row.backdrop_path,
    overview: row.overview,
    originalTitle: row.original_title,
    releaseDate: row.release_date,
    metadataStatus: row.metadata_status,
    metadataAttempts: row.metadata_attempts,
    metadataError: row.metadata_error,
  }));
}

export async function markMetadataProcessing(
  mediaId: number,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `
      UPDATE media
      SET
        metadata_status = 'processing',
        metadata_attempts = metadata_attempts + 1,
        metadata_error = NULL,
        metadata_updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [mediaId],
  );
}

export async function markMetadataFailed(
  mediaId: number,
  error: string,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `
      UPDATE media
      SET
        metadata_status = CASE
          WHEN metadata_attempts >= 3 THEN 'failed'
          ELSE 'pending'
        END,
        metadata_error = ?,
        metadata_updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [error, mediaId],
  );
}

export async function markMetadataNotFound(
  mediaId: number,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `
      UPDATE media
      SET
        metadata_status = 'failed',
        metadata_error = 'Фильм не найден в TMDB',
        metadata_updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [mediaId],
  );
}

export type MetadataProgress = {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
};

export async function getMetadataProgress(): Promise<MetadataProgress> {
  const db = await getDatabase();

  const rows = await db.select<
    {
      total: number;
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    }[]
  >(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN metadata_status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN metadata_status = 'processing' THEN 1 ELSE 0 END) AS processing,
      SUM(CASE WHEN metadata_status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN metadata_status = 'failed' THEN 1 ELSE 0 END) AS failed
    FROM media
    WHERE media_type = 'movie'
  `);

  const row = rows[0];

  return {
    total: Number(row?.total ?? 0),
    pending: Number(row?.pending ?? 0),
    processing: Number(row?.processing ?? 0),
    completed: Number(row?.completed ?? 0),
    failed: Number(row?.failed ?? 0),
  };
}

export async function retryFailedMetadata(): Promise<void> {
  const db = await getDatabase();

  await db.execute(`
    UPDATE media
    SET
      metadata_status = 'pending',
      metadata_attempts = 0,
      metadata_error = NULL,
      metadata_updated_at = CURRENT_TIMESTAMP
    WHERE metadata_status = 'failed'
  `);
}


export async function syncSeriesFromEpisodes(): Promise<void> {
  const db = await getDatabase();
  const episodes = await getMediaFiles();
  const groups = new Map<string, MediaFile[]>();

  for (const episode of episodes) {
    if (episode.mediaType !== "episode" || !episode.id) {
      continue;
    }

    const key = episode.title.trim().toLowerCase();
    const group = groups.get(key) ?? [];

    group.push(episode);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    const firstEpisode = group[0];

    let rows = await db.select<{ id: number }[]>(
      `
        SELECT id
        FROM series
        WHERE LOWER(title) = LOWER(?)
        LIMIT 1
      `,
      [firstEpisode.title],
    );

    if (!rows[0]) {
      await db.execute(
        `
          INSERT INTO series (title, year)
          VALUES (?, ?)
        `,
        [firstEpisode.title, firstEpisode.year],
      );

      rows = await db.select<{ id: number }[]>(
        `
          SELECT id
          FROM series
          WHERE LOWER(title) = LOWER(?)
          ORDER BY id DESC
          LIMIT 1
        `,
        [firstEpisode.title],
      );
    }

    const seriesId = rows[0]?.id;

    if (!seriesId) {
      continue;
    }

    for (const episode of group) {
      await db.execute(
        `
          UPDATE media
          SET series_id = ?
          WHERE id = ?
        `,
        [seriesId, episode.id],
      );
    }
  }
}
type SeriesRow = {
  id: number;
  title: string;
  original_title: string | null;
  year: number | null;
  tmdb_id: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  first_air_date: string | null;
  vote_average: number | null;
  user_rating: number | null;
  review: string | null;
};

export async function getSeriesGroups(): Promise<SeriesGroup[]> {
  const db = await getDatabase();

  const seriesRows = await db.select<SeriesRow[]>(`
    SELECT
      id,
      title,
      original_title,
      year,
      tmdb_id,
      poster_path,
      backdrop_path,
      overview,
      first_air_date,
      vote_average,
      user_rating,
      review
    FROM series
    ORDER BY title
  `);

  const files = await getMediaFiles();

  return seriesRows.map((series) => ({
    id: series.id,
    key: String(series.id),
    title: series.title,
    originalTitle: series.original_title,
    year: series.year,
    tmdbId: series.tmdb_id,
    posterPath: series.poster_path,
    backdropPath: series.backdrop_path,
    overview: series.overview,
    firstAirDate: series.first_air_date,
    voteAverage: series.vote_average,
    userRating: series.user_rating,
    review: series.review,
    episodes: files.filter(
      (file) => file.seriesId === series.id,
    ),
  }));
}

export async function saveSeriesMetadata(
  seriesId: number,
  metadata: SeriesMetadata,
): Promise<void> {
  const db = await getDatabase();

  const existing = await db.select<{ id: number }[]>(
    `
      SELECT id
      FROM series
      WHERE tmdb_id = ?
        AND id != ?
      LIMIT 1
    `,
    [metadata.tmdbId, seriesId],
  );

  const existingSeriesId = existing[0]?.id;

  if (existingSeriesId) {
    await db.execute(
      `
        UPDATE media
        SET series_id = ?
        WHERE series_id = ?
      `,
      [existingSeriesId, seriesId],
    );

    await db.execute(
      `
        DELETE FROM seasons
        WHERE series_id = ?
      `,
      [seriesId],
    );

    await db.execute(
      `
        DELETE FROM series
        WHERE id = ?
      `,
      [seriesId],
    );

    return;
  }

  await db.execute(
    `
      UPDATE series
      SET
        tmdb_id = ?,
        title = ?,
        original_title = ?,
        overview = ?,
        poster_path = ?,
        backdrop_path = ?,
        first_air_date = ?,
        year = ?,
        vote_average = ?,
        metadata_status = 'completed',
        metadata_error = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      metadata.tmdbId,
      metadata.title,
      metadata.originalTitle,
      metadata.overview,
      metadata.posterPath,
      metadata.backdropPath,
      metadata.firstAirDate,
      metadata.firstAirDate
        ? Number(metadata.firstAirDate.slice(0, 4))
        : null,
      metadata.voteAverage,
      seriesId,
    ],
  );
}

export async function saveSeriesUserData(
  seriesId: number,
  userRating: number | null,
  review: string,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `
      UPDATE series
      SET
        user_rating = ?,
        review = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [userRating, review, seriesId],
  );
}

export async function saveSeasonMetadata(
  seriesId: number,
  metadata: SeasonMetadata,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `
      INSERT INTO seasons (
        series_id,
        season_number,
        title,
        poster_path,
        overview,
        air_date,
        metadata_status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'completed')
      ON CONFLICT(series_id, season_number) DO UPDATE SET
        title = excluded.title,
        poster_path = excluded.poster_path,
        overview = excluded.overview,
        air_date = excluded.air_date,
        metadata_status = 'completed',
        metadata_error = NULL
    `,
    [
      seriesId,
      metadata.seasonNumber,
      metadata.name,
      metadata.posterPath,
      metadata.overview,
      metadata.airDate,
    ],
  );

  const seasonRows = await db.select<{ id: number }[]>(
    `
      SELECT id
      FROM seasons
      WHERE series_id = ?
        AND season_number = ?
      LIMIT 1
    `,
    [seriesId, metadata.seasonNumber],
  );

  const seasonId = seasonRows[0]?.id;

  for (const episode of metadata.episodes) {
    await db.execute(
      `
        UPDATE media
        SET
          season_id = ?,
          episode_title = ?,
          episode_overview = ?,
          still_path = ?,
          air_date = ?,
          runtime = ?,
          episode_vote_average = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE series_id = ?
          AND season = ?
          AND episode = ?
      `,
      [
        seasonId ?? null,
        episode.name,
        episode.overview,
        episode.stillPath,
        episode.airDate,
        episode.runtime,
        episode.voteAverage,
        seriesId,
        episode.seasonNumber,
        episode.episodeNumber,
      ],
    );
  }
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const db = await getDatabase();

  const rows = await db.select<WatchlistRow[]>(`
    SELECT
      id,
      media_type,
      tmdb_id,
      title,
      original_title,
      year,
      poster_path,
      backdrop_path,
      overview,
      is_watched,
      linked_media_id,
      linked_series_id,
      created_at
    FROM watchlist
    ORDER BY created_at DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    mediaType: row.media_type,
    tmdbId: row.tmdb_id,
    title: row.title,
    originalTitle: row.original_title,
    year: row.year,
    posterPath: row.poster_path,
    backdropPath: row.backdrop_path,
    overview: row.overview,
    isWatched: Boolean(row.is_watched),
    linkedMediaId: row.linked_media_id,
    linkedSeriesId: row.linked_series_id,
    createdAt: row.created_at,
  }));
}

export async function setWatchlistWatched(
  id: number,
  isWatched: boolean,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `
      UPDATE watchlist
      SET
        is_watched = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [Number(isWatched), id],
  );
}

export async function deleteWatchlistItem(
  id: number,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `
      DELETE FROM watchlist
      WHERE id = ?
    `,
    [id],
  );
}