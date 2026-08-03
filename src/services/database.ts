import Database from "@tauri-apps/plugin-sql";
import type {
  LibraryFolder,
  LibraryFolderType,
  MediaFile,
  MediaRow,
  MovieMetadata,
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
        metadata_status = 'loaded',
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
          title = excluded.title,
          year = excluded.year,
          media_type = excluded.media_type,
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
        release_date
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