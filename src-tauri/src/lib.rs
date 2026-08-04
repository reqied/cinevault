use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri_plugin_sql::{Migration, MigrationKind};
use walkdir::WalkDir;

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

fn parse_media_name(
    file_name: &str,
    folder_type: &str,
) -> (String, Option<u16>, String, Option<u16>, Option<u16>) {
    let stem = Path::new(file_name)
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or(file_name);

    let episode_pattern = Regex::new(r"(?i)\bS(\d{1,2})E(\d{1,3})\b").unwrap();

    let alternative_episode_pattern = Regex::new(r"(?i)\b(\d{1,2})x(\d{1,3})\b").unwrap();
    let title_source = if let Some(found) = episode_pattern.find(stem) {
        &stem[..found.start()]
    } else if let Some(found) = alternative_episode_pattern.find(stem) {
        &stem[..found.start()]
    } else {
        stem
    };
    let year_pattern = Regex::new(r"\b(19\d{2}|20\d{2}|2100)\b").unwrap();

    let technical_pattern = Regex::new(
        r"(?ix)
        \b(
            480p|
            576p|
            720p|
            1080p|
            1440p|
            2160p|
            4k|
            8k|
            bluray|
            blu-ray|
            bdrip|
            brrip|
            web-dl|
            webdl|
            webrip|
            hdrip|
            dvdrip|
            remux|
            hdtv|
            hdr|
            hdr10|
            hdr10\+|
            dolby[\s._-]*vision|
            dv|
            x264|
            x265|
            h264|
            h265|
            hevc|
            av1|
            aac|
            ac3|
            eac3|
            dts|
            dts-hd|
            truehd|
            atmos|
            mp3|
            flac|
            proper|
            repack|
            extended|
            unrated|
            dubbed|
            subbed|
            multi |
            lostfilm
        )\b
        ",
    )
    .unwrap();

    let mut season = None;
    let mut episode = None;

    if let Some(captures) = episode_pattern.captures(stem) {
        season = captures
            .get(1)
            .and_then(|value| value.as_str().parse::<u16>().ok());

        episode = captures
            .get(2)
            .and_then(|value| value.as_str().parse::<u16>().ok());
    } else if let Some(captures) = alternative_episode_pattern.captures(stem) {
        season = captures
            .get(1)
            .and_then(|value| value.as_str().parse::<u16>().ok());

        episode = captures
            .get(2)
            .and_then(|value| value.as_str().parse::<u16>().ok());
    }

    let year = year_pattern
        .captures(stem)
        .and_then(|captures| captures.get(1))
        .and_then(|value| value.as_str().parse::<u16>().ok());

    let mut cleaned = title_source.replace(['.', '_'], " ");
    cleaned = episode_pattern.replace_all(&cleaned, " ").to_string();

    cleaned = alternative_episode_pattern
        .replace_all(&cleaned, " ")
        .to_string();

    cleaned = year_pattern.replace_all(&cleaned, " ").to_string();

    cleaned = technical_pattern.replace_all(&cleaned, " ").to_string();

    cleaned = Regex::new(r"[\[\](){}]")
        .unwrap()
        .replace_all(&cleaned, " ")
        .to_string();

    cleaned = Regex::new(r"\s+-\s+")
        .unwrap()
        .replace_all(&cleaned, " ")
        .to_string();

    cleaned = Regex::new(r"\s+")
        .unwrap()
        .replace_all(&cleaned, " ")
        .trim()
        .to_string();

    let title = if cleaned.is_empty() {
        stem.to_string()
    } else {
        cleaned
    };

    let media_type = match folder_type {
        "movies" => {
            season = None;
            episode = None;
            "movie"
        }
        "series" => "episode",
        _ => {
            if season.is_some() && episode.is_some() {
                "episode"
            } else {
                "movie"
            }
        }
    };

    (title, year, media_type.to_string(), season, episode)
}

#[tauri::command]
async fn search_movie_metadata(
    title: String,
    year: Option<u16>,
) -> Result<Option<MovieMetadata>, String> {
    dotenvy::dotenv().ok();

    let token =
        std::env::var("TMDB_TOKEN").map_err(|_| "Переменная TMDB_TOKEN не задана".to_string())?;

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
fn scan_media_folder(folder_path: String, folder_type: String) -> Result<Vec<MediaFile>, String> {
    if !matches!(folder_type.as_str(), "movies" | "series" | "mixed") {
        return Err("Неизвестный тип папки".to_string());
    }
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
        let (title, year, media_type, season, episode) = parse_media_name(&name, &folder_type);
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
    let migrations = vec![
        Migration {
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
        Migration {
            version: 5,
            description: "add_series_metadata_and_user_data",
            sql: r#"
            ALTER TABLE series ADD COLUMN first_air_date TEXT;
            ALTER TABLE series ADD COLUMN vote_average REAL;
            ALTER TABLE series ADD COLUMN user_rating INTEGER;
            ALTER TABLE series ADD COLUMN review TEXT;
            ALTER TABLE series ADD COLUMN metadata_status TEXT NOT NULL DEFAULT 'pending';
            ALTER TABLE series ADD COLUMN metadata_error TEXT;
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_unique_series_title",
            sql: r#"
            CREATE UNIQUE INDEX IF NOT EXISTS idx_series_unique_title
                ON series(title COLLATE NOCASE);
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "remove_unique_series_title",
            sql: r#"
            DROP INDEX IF EXISTS idx_series_unique_title;
    
            CREATE INDEX IF NOT EXISTS idx_series_title
                ON series(title COLLATE NOCASE);
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "add_season_and_episode_metadata",
            sql: r#"
            ALTER TABLE media ADD COLUMN episode_title TEXT;
            ALTER TABLE media ADD COLUMN episode_overview TEXT;
            ALTER TABLE media ADD COLUMN still_path TEXT;
            ALTER TABLE media ADD COLUMN air_date TEXT;
            ALTER TABLE media ADD COLUMN runtime INTEGER;
            ALTER TABLE media ADD COLUMN episode_vote_average REAL;
    
            ALTER TABLE seasons ADD COLUMN air_date TEXT;
            ALTER TABLE seasons ADD COLUMN metadata_status TEXT NOT NULL DEFAULT 'pending';
            ALTER TABLE seasons ADD COLUMN metadata_error TEXT;
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "create_watchlist",
            sql: r#"
            CREATE TABLE IF NOT EXISTS watchlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                media_type TEXT NOT NULL,
                tmdb_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                original_title TEXT,
                year INTEGER,
                poster_path TEXT,
                backdrop_path TEXT,
                overview TEXT,
                is_watched INTEGER NOT NULL DEFAULT 0,
                linked_media_id INTEGER,
                linked_series_id INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
                UNIQUE(media_type, tmdb_id),
    
                FOREIGN KEY(linked_media_id)
                    REFERENCES media(id)
                    ON DELETE SET NULL,
    
                FOREIGN KEY(linked_series_id)
                    REFERENCES series(id)
                    ON DELETE SET NULL
            );
    
            CREATE INDEX IF NOT EXISTS idx_watchlist_created_at
                ON watchlist(created_at);
    
            CREATE INDEX IF NOT EXISTS idx_watchlist_is_watched
                ON watchlist(is_watched);
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "add_watchlist_user_data_and_path",
            sql: r#"
            ALTER TABLE watchlist ADD COLUMN user_rating INTEGER;
            ALTER TABLE watchlist ADD COLUMN review TEXT;
            ALTER TABLE watchlist ADD COLUMN linked_path TEXT;
            ALTER TABLE watchlist ADD COLUMN linked_kind TEXT;
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "create_watch_progress",
            sql: r#"
                CREATE TABLE IF NOT EXISTS watch_progress (
                    media_id INTEGER PRIMARY KEY,
                    position_seconds REAL NOT NULL DEFAULT 0,
                    duration_seconds REAL NOT NULL DEFAULT 0,
                    watched INTEGER NOT NULL DEFAULT 0,
                    last_watched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(media_id)
                        REFERENCES media(id)
                        ON DELETE CASCADE
                );
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_mpv::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:cinevault.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            scan_media_folder,
            search_movie_metadata,
            search_series_metadata,
            get_season_metadata,
            get_episode_details,
            search_watchlist_media
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Deserialize)]
struct TmdbTvSearchResponse {
    results: Vec<TmdbTvSeries>,
}

#[derive(Deserialize)]
struct TmdbTvSeries {
    id: u64,
    name: String,
    original_name: String,
    overview: String,
    poster_path: Option<String>,
    backdrop_path: Option<String>,
    first_air_date: Option<String>,
    vote_average: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SeriesMetadata {
    tmdb_id: u64,
    title: String,
    original_title: String,
    overview: String,
    poster_path: Option<String>,
    backdrop_path: Option<String>,
    first_air_date: Option<String>,
    vote_average: f64,
}

#[tauri::command]
async fn search_series_metadata(
    title: String,
    year: Option<u16>,
) -> Result<Option<SeriesMetadata>, String> {
    dotenvy::dotenv().ok();

    let token =
        std::env::var("TMDB_TOKEN").map_err(|_| "Переменная TMDB_TOKEN не задана".to_string())?;

    let client = reqwest::Client::new();

    let mut request = client
        .get("https://api.themoviedb.org/3/search/tv")
        .bearer_auth(token)
        .query(&[
            ("query", title.as_str()),
            ("language", "ru-RU"),
            ("include_adult", "false"),
        ]);

    let year_string;

    if let Some(year) = year {
        year_string = year.to_string();

        request = request.query(&[("first_air_date_year", year_string.as_str())]);
    }

    let response = request
        .send()
        .await
        .map_err(|error| format!("Ошибка запроса TMDB: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("TMDB вернул статус {}", response.status()));
    }

    let result = response
        .json::<TmdbTvSearchResponse>()
        .await
        .map_err(|error| format!("Ошибка ответа TMDB: {error}"))?;

    let Some(series) = result.results.into_iter().next() else {
        return Ok(None);
    };

    Ok(Some(SeriesMetadata {
        tmdb_id: series.id,
        title: series.name,
        original_title: series.original_name,
        overview: series.overview,
        poster_path: series.poster_path,
        backdrop_path: series.backdrop_path,
        first_air_date: series.first_air_date,
        vote_average: series.vote_average,
    }))
}
#[derive(Deserialize)]
struct TmdbSeasonDetails {
    id: u64,
    name: String,
    overview: String,
    poster_path: Option<String>,
    air_date: Option<String>,
    season_number: u16,
    episodes: Vec<TmdbEpisodeDetails>,
}

#[derive(Deserialize)]
struct TmdbEpisodeDetails {
    id: u64,
    name: String,
    overview: String,
    still_path: Option<String>,
    air_date: Option<String>,
    runtime: Option<u16>,
    vote_average: f64,
    season_number: u16,
    episode_number: u16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SeasonMetadata {
    tmdb_id: u64,
    name: String,
    overview: String,
    poster_path: Option<String>,
    air_date: Option<String>,
    season_number: u16,
    episodes: Vec<EpisodeMetadata>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EpisodeMetadata {
    tmdb_id: u64,
    name: String,
    overview: String,
    still_path: Option<String>,
    air_date: Option<String>,
    episode_number: u16,
    season_number: u16,
    runtime: Option<u16>,
    vote_average: f64,
}

#[tauri::command]
async fn get_season_metadata(series_id: u64, season_number: u16) -> Result<SeasonMetadata, String> {
    dotenvy::dotenv().ok();

    let token =
        std::env::var("TMDB_TOKEN").map_err(|_| "Переменная TMDB_TOKEN не задана".to_string())?;

    let url = format!("https://api.themoviedb.org/3/tv/{series_id}/season/{season_number}");

    let response = reqwest::Client::new()
        .get(url)
        .bearer_auth(token)
        .query(&[("language", "ru-RU")])
        .send()
        .await
        .map_err(|error| format!("Ошибка запроса TMDB: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("TMDB вернул статус {}", response.status()));
    }

    let season = response
        .json::<TmdbSeasonDetails>()
        .await
        .map_err(|error| format!("Ошибка ответа TMDB: {error}"))?;

    Ok(SeasonMetadata {
        tmdb_id: season.id,
        name: season.name,
        overview: season.overview,
        poster_path: season.poster_path,
        air_date: season.air_date,
        season_number: season.season_number,
        episodes: season
            .episodes
            .into_iter()
            .map(|episode| EpisodeMetadata {
                tmdb_id: episode.id,
                name: episode.name,
                overview: episode.overview,
                still_path: episode.still_path,
                air_date: episode.air_date,
                episode_number: episode.episode_number,
                season_number: episode.season_number,
                runtime: episode.runtime,
                vote_average: episode.vote_average,
            })
            .collect(),
    })
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EpisodeDetails {
    tmdb_id: u64,
    name: String,
    overview: String,
    still_path: Option<String>,
    air_date: Option<String>,
    runtime: Option<u16>,
    vote_average: f64,
    season_number: u16,
    episode_number: u16,
}

#[tauri::command]
async fn get_episode_details(
    series_id: u64,
    season_number: u16,
    episode_number: u16,
) -> Result<EpisodeDetails, String> {
    dotenvy::dotenv().ok();

    let token =
        std::env::var("TMDB_TOKEN").map_err(|_| "Переменная TMDB_TOKEN не задана".to_string())?;

    let url = format!(
        "https://api.themoviedb.org/3/tv/{series_id}/season/{season_number}/episode/{episode_number}"
    );

    let response = reqwest::Client::new()
        .get(url)
        .bearer_auth(token)
        .query(&[("language", "ru-RU")])
        .send()
        .await
        .map_err(|error| format!("Ошибка запроса TMDB: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("TMDB вернул статус {}", response.status()));
    }

    let episode = response
        .json::<TmdbEpisodeDetails>()
        .await
        .map_err(|error| format!("Ошибка ответа TMDB: {error}"))?;

    Ok(EpisodeDetails {
        tmdb_id: episode.id,
        name: episode.name,
        overview: episode.overview,
        still_path: episode.still_path,
        air_date: episode.air_date,
        runtime: episode.runtime,
        vote_average: episode.vote_average,
        season_number: episode.season_number,
        episode_number: episode.episode_number,
    })
}

#[derive(Deserialize)]
struct TmdbMultiSearchResponse {
    results: Vec<TmdbMultiSearchItem>,
}

#[derive(Deserialize)]
struct TmdbMultiSearchItem {
    id: u64,
    media_type: String,
    title: Option<String>,
    name: Option<String>,
    original_title: Option<String>,
    original_name: Option<String>,
    release_date: Option<String>,
    first_air_date: Option<String>,
    poster_path: Option<String>,
    backdrop_path: Option<String>,
    overview: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WatchlistSearchItem {
    tmdb_id: u64,
    media_type: String,
    title: String,
    original_title: String,
    year: Option<u16>,
    poster_path: Option<String>,
    backdrop_path: Option<String>,
    overview: String,
}

#[tauri::command]
async fn search_watchlist_media(query: String) -> Result<Vec<WatchlistSearchItem>, String> {
    dotenvy::dotenv().ok();

    let token =
        std::env::var("TMDB_TOKEN").map_err(|_| "Переменная TMDB_TOKEN не задана".to_string())?;

    let response = reqwest::Client::new()
        .get("https://api.themoviedb.org/3/search/multi")
        .bearer_auth(token)
        .query(&[
            ("query", query.as_str()),
            ("language", "ru-RU"),
            ("include_adult", "false"),
        ])
        .send()
        .await
        .map_err(|error| format!("Ошибка запроса TMDB: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("TMDB вернул статус {}", response.status()));
    }

    let result = response
        .json::<TmdbMultiSearchResponse>()
        .await
        .map_err(|error| format!("Ошибка ответа TMDB: {error}"))?;

    let items = result
        .results
        .into_iter()
        .filter(|item| matches!(item.media_type.as_str(), "movie" | "tv"))
        .filter_map(|item| {
            let title = item.title.or(item.name)?;
            let original_title = item
                .original_title
                .or(item.original_name)
                .unwrap_or_else(|| title.clone());

            let date = item.release_date.or(item.first_air_date);

            let year = date
                .as_deref()
                .and_then(|value| value.get(0..4))
                .and_then(|value| value.parse::<u16>().ok());

            Some(WatchlistSearchItem {
                tmdb_id: item.id,
                media_type: if item.media_type == "tv" {
                    "series".to_string()
                } else {
                    "movie".to_string()
                },
                title,
                original_title,
                year,
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                overview: item.overview.unwrap_or_default(),
            })
        })
        .take(20)
        .collect();

    Ok(items)
}
