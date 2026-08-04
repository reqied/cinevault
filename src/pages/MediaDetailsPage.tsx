import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Rating,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { ArrowBack, PlayArrow } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router";
import { getEpisodeDetails } from "../services/tmdb";
import type {
  EpisodeDetails,
  MediaFile,
  SeriesGroup,
} from "../shared/types/media";

type LocationState = {
  file?: MediaFile;
  series?: SeriesGroup;
  episodes?: MediaFile[];
};

const imageBaseUrl = "https://image.tmdb.org/t/p";

export function MediaDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { file, series, episodes } = (location.state ?? {}) as LocationState;

  const [episodeDetails, setEpisodeDetails] =
    useState<EpisodeDetails | null>(null);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [episodeError, setEpisodeError] = useState("");

  useEffect(() => {
    if (
      file?.mediaType !== "episode" ||
      !series?.tmdbId ||
      file.season === null ||
      file.episode === null
    ) {
      return;
    }

    let cancelled = false;

    async function loadEpisode() {
      setEpisodeLoading(true);
      setEpisodeError("");

      try {
        const details = await getEpisodeDetails(
          series!.tmdbId!,
          file!.season!,
          file!.episode!,
        );

        if (!cancelled) {
          setEpisodeDetails(details);
        }
      } catch (value) {
        if (!cancelled) {
          setEpisodeError(String(value));
        }
      } finally {
        if (!cancelled) {
          setEpisodeLoading(false);
        }
      }
    }

    void loadEpisode();

    return () => {
      cancelled = true;
    };
  }, [
    file?.mediaType,
    file?.season,
    file?.episode,
    series?.tmdbId,
  ]);

  if (!file) {
    return (
      <Alert severity="error">
        Файл не найден. Вернись в библиотеку и выбери его снова.
      </Alert>
    );
  }

  const title = series?.title ?? file.title;

  const episodeTitle =
    episodeDetails?.name ??
    file.episodeTitle ??
    `Серия ${file.episode}`;

  const overview =
    episodeDetails?.overview ||
    file.episodeOverview ||
    series?.overview ||
    file.overview ||
    null;

  const posterPath =
    series?.posterPath ??
    file.posterPath ??
    null;

  const backdropPath =
    episodeDetails?.stillPath ??
    file.stillPath ??
    series?.backdropPath ??
    file.backdropPath ??
    null;

  const releaseYear =
    episodeDetails?.airDate?.slice(0, 4) ??
    series?.firstAirDate?.slice(0, 4) ??
    series?.year ??
    file.releaseDate?.slice(0, 4) ??
    file.year ??
    null;

  const posterUrl = posterPath
    ? `${imageBaseUrl}/w500${posterPath}`
    : null;

  const backdropUrl = backdropPath
    ? `${imageBaseUrl}/original${backdropPath}`
    : null;

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
      >
        Назад
      </Button>

      <Box
        sx={{
          position: "relative",
          minHeight: 540,
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        {backdropUrl && (
          <Box
            component="img"
            src={backdropUrl}
            alt=""
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.3,
            }}
          />
        )}

        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(10,10,14,0.98) 0%, rgba(10,10,14,0.82) 55%, rgba(10,10,14,0.45) 100%)",
          }}
        />

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "300px minmax(0, 1fr)",
            },
            gap: 5,
            p: 5,
          }}
        >
          {posterUrl ? (
            <Box
              component="img"
              src={posterUrl}
              alt={title}
              sx={{
                width: "100%",
                maxWidth: 300,
                borderRadius: 2,
                boxShadow: 8,
              }}
            />
          ) : (
            <Box
              sx={{
                width: "100%",
                maxWidth: 300,
                height: 430,
                borderRadius: 2,
                bgcolor: "#202028",
              }}
            />
          )}

          <Box>
            <Typography variant="h3" fontWeight={700}>
              {title}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                flexWrap: "wrap",
                my: 2,
              }}
            >
              <Chip
                label={
                  file.mediaType === "movie" ? "Фильм" : "Сериал"
                }
              />

              {releaseYear && <Chip label={releaseYear} />}

              <Chip label={file.extension.toUpperCase()} />
            </Stack>

            {file.mediaType === "episode" && (
              <>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  {episodeLoading ? "Загрузка серии..." : episodeTitle}
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Сезон {file.season}, серия {file.episode}
                  {episodeDetails?.runtime
                    ? ` · ${episodeDetails.runtime} мин`
                    : ""}
                  {episodeDetails?.voteAverage != null
                    ? ` · TMDB ${episodeDetails.voteAverage.toFixed(1)}`
                    : ""}
                </Typography>

                {episodeError && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Не удалось загрузить данные серии.
                  </Alert>
                )}
              </>
            )}

            <Typography
              sx={{
                maxWidth: 800,
                mb: 3,
                lineHeight: 1.7,
              }}
            >
              {overview || "Описание отсутствует."}
            </Typography>

            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrow />}
              onClick={() =>
                navigate("/player", {
                  state: {
                    file,
                    episodes,
                  },
                })
              }
            >
              Смотреть
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Настройки воспроизведения
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Select defaultValue="auto" sx={{ minWidth: 220 }}>
            <MenuItem value="auto">Аудио: автоматически</MenuItem>
            <MenuItem value="original">Оригинальная дорожка</MenuItem>
          </Select>

          <Select defaultValue="off" sx={{ minWidth: 220 }}>
            <MenuItem value="off">Субтитры выключены</MenuItem>
            <MenuItem value="auto">Автоматический выбор</MenuItem>
          </Select>
        </Stack>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6">Моя оценка</Typography>

        <Rating sx={{ my: 2 }} max={10} />

        <TextField
          label="Отзыв"
          multiline
          minRows={4}
          fullWidth
        />

        <Divider sx={{ my: 4 }} />

        <Typography variant="body2" color="text.secondary">
          {file.path}
        </Typography>
      </Box>
    </Box>
  );
}