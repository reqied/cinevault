import Database from "@tauri-apps/plugin-sql";
import type { MediaFile, MediaRow } from "../shared/types/media";

let database: Database | null = null;

async function getDatabase(): Promise<Database> {
  if (!database) {
    database = await Database.load("sqlite:cinevault.db");
  }

  return database;
}

export async function saveMediaFiles(files: MediaFile[]): Promise<void> {
  const db = await getDatabase();

  for (const file of files) {
    await db.execute(
      `
        INSERT INTO media (
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
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
        path,
        file_name,
        title,
        year,
        media_type,
        extension,
        size,
        season,
        episode
      FROM media
      ORDER BY created_at DESC
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.file_name,
    path: row.path,
    extension: row.extension,
    size: row.size,
    title: row.title,
    year: row.year,
    mediaType: row.media_type,
    season: row.season,
    episode: row.episode,
  }));
}