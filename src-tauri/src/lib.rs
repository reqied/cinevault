use std::path::Path;
use walkdir::WalkDir;
use tauri_plugin_sql::{Migration, MigrationKind};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct TmdbSearchResponse {
    results: Vec<TmdbMovie>,
}

#[derive(Deserialize)]
struct TmdbMovie {
    id: u64,
    title: String,
    original_title: String,
    overview: String,
    poster_path: Option<String>,
    backdrop_path: Option<String>,
    release_date: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MovieMetadata {
    tmdb_id: u64,
    title: String,
    original_title: String,
    overview: String,
    poster_path: Option<String>,
    backdrop_path: Option<String>,
    release_date: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MediaFile {
    name: String,
    path: String,
    extension: String,
    size: u64,
    title: String,
    year: Option<u16>,
    media_type: String,
    season: Option<u16>,
    episode: Option<u16>,
}

fn parse_media_name(file_name: &str) -> (String, Option<u16>, String, Option<u16>, Option<u16>) {
    let stem = Path::new(file_name)
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or(file_name);

    let normalized = stem.replace(['.', '_', '-'], " ");
    let words: Vec<&str> = normalized.split_whitespace().collect();

    let mut year = None;
    let mut season = None;
    let mut episode = None;
    let mut title_words = Vec::new();

    for word in words {
        let upper = word.to_uppercase();

        if word.len() == 4 {
            if let Ok(value) = word.parse::<u16>() {
                if (1900..=2100).contains(&value) {
                    year = Some(value);
                    continue;
                }
            }
        }

        if upper.len() >= 6 && upper.starts_with('S') {
            if let Some(e_position) = upper.find('E') {
                let season_value = &upper[1..e_position];
                let episode_value = &upper[e_position + 1..];

                if let (Ok(s), Ok(e)) = (season_value.parse::<u16>(), episode_value.parse::<u16>())
                {
                    season = Some(s);
                    episode = Some(e);
                    continue;
                }
            }
        }

        title_words.push(word);
    }

    let title = if title_words.is_empty() {
        stem.to_string()
    } else {
        title_words.join(" ")
    };

    let media_type = if season.is_some() && episode.is_some() {
        "episode"
    } else {
        "movie"
    };

    (title, year, media_type.to_string(), season, episode)
}
#[tauri::command]
async fn search_movie_metadata(
    title: String,
    year: Option<u16>,
) -> Result<Option<MovieMetadata>, String> {
    dotenvy::dotenv().ok();

    let token = std::env::var("TMDB_TOKEN")
        .map_err(|_| "Переменная TMDB_TOKEN не задана".to_string())?;

    let client = reqwest::Client::new();

    let mut request = client
        .get("https://api.themoviedb.org/3/search/movie")
        .bearer_auth(token)
        .query(&[
            ("query", title.as_str()),
            ("language", "ru-RU"),
            ("include_adult", "false"),
        ]);

    let year_string;

    if let Some(year) = year {
        year_string = year.to_string();
        request = request.query(&[("primary_release_year", year_string.as_str())]);
    }

    let response = request
        .send()
        .await
        .map_err(|error| format!("Ошибка запроса TMDB: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("TMDB вернул статус {}", response.status()));
    }

    let search_result = response
        .json::<TmdbSearchResponse>()
        .await
        .map_err(|error| format!("Ошибка обработки ответа TMDB: {error}"))?;

    let Some(movie) = search_result.results.into_iter().next() else {
        return Ok(None);
    };

    Ok(Some(MovieMetadata {
        tmdb_id: movie.id,
        title: movie.title,
        original_title: movie.original_title,
        overview: movie.overview,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        release_date: movie.release_date,
    }))
}

#[tauri::command]
fn scan_media_folder(folder_path: String) -> Result<Vec<MediaFile>, String> {
    let folder = Path::new(&folder_path);

    if !folder.exists() {
        return Err("Выбранная папка не существует".to_string());
    }

    if !folder.is_dir() {
        return Err("Указанный путь не является папкой".to_string());
    }

    let supported_extensions = ["mp4", "mkv", "avi", "mov", "webm", "m4v"];
    let mut files = Vec::new();

    for entry in WalkDir::new(folder).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();

        let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
            continue;
        };

        let extension = extension.to_lowercase();

        if !supported_extensions.contains(&extension.as_str()) {
            continue;
        }

        let metadata = entry
            .metadata()
            .map_err(|error| format!("Не удалось прочитать файл: {error}"))?;

        let name = entry.file_name().to_string_lossy().to_string();
        let (title, year, media_type, season, episode) = parse_media_name(&name);

        files.push(MediaFile {
            name,
            path: path.to_string_lossy().to_string(),
            extension,
            size: metadata.len(),
            title,
            year,
            media_type,
            season,
            episode,
        });
    }

    Ok(files)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_media_table",
        sql: r#"
            CREATE TABLE IF NOT EXISTS media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                file_name TEXT NOT NULL,
                title TEXT NOT NULL,
                year INTEGER,
                media_type TEXT NOT NULL,
                extension TEXT NOT NULL,
                size INTEGER NOT NULL,
                season INTEGER,
                episode INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        "#,
        kind: MigrationKind::Up,
    },
    Migration {
        version: 2,
        description: "add_tmdb_metadata",
        sql: r#"
            ALTER TABLE media ADD COLUMN tmdb_id INTEGER;
            ALTER TABLE media ADD COLUMN poster_path TEXT;
            ALTER TABLE media ADD COLUMN backdrop_path TEXT;
            ALTER TABLE media ADD COLUMN overview TEXT;
            ALTER TABLE media ADD COLUMN original_title TEXT;
            ALTER TABLE media ADD COLUMN release_date TEXT;
            ALTER TABLE media ADD COLUMN metadata_status TEXT NOT NULL DEFAULT 'pending';
        "#,
        kind: MigrationKind::Up,
    },
    Migration {
        version: 3,
        description: "add_library_folders_and_series",
        sql: r#"
            CREATE TABLE IF NOT EXISTS library_folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                folder_type TEXT NOT NULL DEFAULT 'mixed',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
    
            CREATE TABLE IF NOT EXISTS series (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                original_title TEXT,
                year INTEGER,
                tmdb_id INTEGER UNIQUE,
                poster_path TEXT,
                backdrop_path TEXT,
                overview TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
    
            CREATE TABLE IF NOT EXISTS seasons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                series_id INTEGER NOT NULL,
                season_number INTEGER NOT NULL,
                title TEXT,
                poster_path TEXT,
                overview TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(series_id, season_number),
                FOREIGN KEY(series_id) REFERENCES series(id) ON DELETE CASCADE
            );
    
            ALTER TABLE media ADD COLUMN library_folder_id INTEGER;
            ALTER TABLE media ADD COLUMN series_id INTEGER;
            ALTER TABLE media ADD COLUMN season_id INTEGER;
    
            CREATE INDEX IF NOT EXISTS idx_media_library_folder
                ON media(library_folder_id);
    
            CREATE INDEX IF NOT EXISTS idx_media_series
                ON media(series_id);
    
            CREATE INDEX IF NOT EXISTS idx_media_season
                ON media(season_id);
    
            CREATE INDEX IF NOT EXISTS idx_series_tmdb
                ON series(tmdb_id);
        "#,
        kind: MigrationKind::Up,
    },
    Migration {
        version: 4,
        description: "add_metadata_queue_fields",
        sql: r#"
            ALTER TABLE media ADD COLUMN metadata_attempts INTEGER NOT NULL DEFAULT 0;
            ALTER TABLE media ADD COLUMN metadata_error TEXT;
            ALTER TABLE media ADD COLUMN metadata_updated_at TEXT;
    
            CREATE INDEX IF NOT EXISTS idx_media_metadata_status
                ON media(metadata_status);
        "#,
        kind: MigrationKind::Up,
    },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:cinevault.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![scan_media_folder, search_movie_metadata])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}