import { useCallback, useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Rating,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useLocation, useNavigate } from "react-router";
import {
  getSeriesProgress,
  saveSeriesUserData,
  type SeriesProgress,
} from "../services/database";
import type {
  MediaFile,
  SeriesGroup,
} from "../shared/types/media";

type LocationState = {
  series?: SeriesGroup;
};

export function SeriesDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { series } = (location.state ?? {}) as LocationState;

  const [userRating, setUserRating] =
    useState<number | null>(
      series?.userRating ?? null,
    );

  const [review, setReview] = useState(
    series?.review ?? "",
  );

  const [saved, setSaved] = useState(false);

  const [seriesProgress, setSeriesProgress] =
    useState<SeriesProgress | null>(null);

  const [progressLoading, setProgressLoading] =
    useState(true);

  const [progressError, setProgressError] =
    useState("");

  const loadProgress = useCallback(async () => {
    if (!series?.id) {
      setProgressLoading(false);
      return;
    }

    try {
      setProgressError("");

      const progress = await getSeriesProgress(
        series.id,
      );

      setSeriesProgress(progress);
    } catch (value) {
      setProgressError(String(value));
    } finally {
      setProgressLoading(false);
    }
  }, [series?.id]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    function handleProgressChanged() {
      void loadProgress();
    }

    window.addEventListener(
      "cinevault:progress-changed",
      handleProgressChanged,
    );

    return () => {
      window.removeEventListener(
        "cinevault:progress-changed",
        handleProgressChanged,
      );
    };
  }, [loadProgress]);

  if (!series) {
    return (
      <Alert severity="error">
        Сериал не найден. Вернись в библиотеку.
      </Alert>
    );
  }

  const seasons = series.episodes.reduce<
    Record<number, MediaFile[]>
  >((result, episode) => {
    const seasonNumber = episode.season ?? 0;

    if (!result[seasonNumber]) {
      result[seasonNumber] = [];
    }

    result[seasonNumber].push(episode);

    return result;
  }, {});

  const sortedSeasons = Object.entries(seasons)
    .map(([seasonNumber, episodes]) => ({
      seasonNumber: Number(seasonNumber),
      episodes: [...episodes].sort(
        (left, right) =>
          (left.episode ?? 0) -
          (right.episode ?? 0),
      ),
    }))
    .sort(
      (left, right) =>
        left.seasonNumber -
        right.seasonNumber,
    );

  const orderedEpisodes =
    sortedSeasons.flatMap(
      ({ episodes }) => episodes,
    );

  function openEpisode(file: MediaFile) {
    navigate("/media/details", {
      state: {
        file,
        series,
        episodes: orderedEpisodes,
      },
    });
  }

  async function handleSaveUserData() {
    if (!series.id) {
      return;
    }

    await saveSeriesUserData(
      series.id,
      userRating,
      review,
    );

    setSaved(true);
  }

  function getEpisodeProgress(
    episode: MediaFile,
  ): number {
    if (episode.isWatched) {
      return 100;
    }

    if (
      !episode.watchDuration ||
      episode.watchDuration <= 0
    ) {
      return 0;
    }

    return Math.min(
      100,
      ((episode.watchPosition ?? 0) /
        episode.watchDuration) *
        100,
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
      >
        Назад
      </Button>

      {series.backdropPath && (
        <Box
          component="img"
          src={`https://image.tmdb.org/t/p/original${series.backdropPath}`}
          alt={series.title}
          sx={{
            width: "100%",
            maxHeight: 450,
            objectFit: "cover",
            borderRadius: 3,
            mb: 4,
          }}
        />
      )}

      <Typography
        variant="h3"
        fontWeight={700}
      >
        {series.title}
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ mt: 1 }}
      >
        {series.firstAirDate?.slice(0, 4) ??
          series.year ??
          "Год неизвестен"}

        {series.voteAverage != null &&
          ` · TMDB ${series.voteAverage.toFixed(1)}`}
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ mt: 1 }}
      >
        Серий: {series.episodes.length}
      </Typography>

      {progressError && (
        <Alert
          severity="error"
          sx={{ mt: 3 }}
        >
          {progressError}
        </Alert>
      )}

      {!progressLoading && seriesProgress && (
        <Box
          sx={{
            mt: 3,
            mb: 4,
            maxWidth: 700,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 1 }}
          >
            <Typography fontWeight={600}>
              Прогресс сериала
            </Typography>

            {seriesProgress.isWatched && (
              <Chip
                size="small"
                color="success"
                icon={<CheckCircleIcon />}
                label="Просмотрено"
              />
            )}
          </Stack>

          <LinearProgress
            variant="determinate"
            value={seriesProgress.progress}
            sx={{
              height: 8,
              borderRadius: 4,
            }}
          />

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            {seriesProgress.watchedEpisodes} из{" "}
            {seriesProgress.totalEpisodes} серий ·{" "}
            {Math.round(seriesProgress.progress)}%
          </Typography>
        </Box>
      )}

      {series.overview && (
        <Typography
          sx={{
            maxWidth: 900,
            mb: 4,
          }}
        >
          {series.overview}
        </Typography>
      )}

      {sortedSeasons.map(
        ({ seasonNumber, episodes }) => {
          const seasonProgress =
            seriesProgress?.seasons.find(
              (item) =>
                item.season === seasonNumber,
            );

          return (
            <Accordion
              key={seasonNumber}
              defaultExpanded={
                seasonNumber ===
                sortedSeasons[0]?.seasonNumber
              }
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
              >
                <Box sx={{ width: "100%" }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                    sx={{ pr: 2 }}
                  >
                    <Typography fontWeight={600}>
                      {seasonNumber === 0
                        ? "Сезон не определён"
                        : `Сезон ${seasonNumber}`}
                    </Typography>

                    {seasonProgress && (
                      <Typography
                        variant="body2"
                        color={
                          seasonProgress.isWatched
                            ? "success.main"
                            : "text.secondary"
                        }
                      >
                        {seasonProgress.isWatched
                          ? "Просмотрено"
                          : `${seasonProgress.watchedEpisodes} из ${seasonProgress.totalEpisodes}`}
                      </Typography>
                    )}
                  </Stack>

                  {seasonProgress && (
                    <LinearProgress
                      variant="determinate"
                      value={
                        seasonProgress.progress
                      }
                      sx={{
                        height: 4,
                        mt: 1,
                        mr: 2,
                        borderRadius: 2,
                      }}
                    />
                  )}
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ p: 0 }}>
                <List disablePadding>
                  {episodes.map((episode) => {
                    const progress =
                      getEpisodeProgress(episode);

                    return (
                      <ListItemButton
                        key={
                          episode.id ??
                          episode.path
                        }
                        onClick={() =>
                          openEpisode(episode)
                        }
                      >
                        {episode.isWatched ? (
                          <CheckCircleIcon
                            color="success"
                            sx={{ mr: 2 }}
                          />
                        ) : (
                          <PlayArrowIcon
                            sx={{ mr: 2 }}
                          />
                        )}

                        <ListItemText
                          primary={
                            episode.episodeTitle ??
                            (episode.episode
                              ? `Серия ${episode.episode}`
                              : episode.title)
                          }
                          secondary={
                            <Box
                              component="span"
                              sx={{
                                display: "block",
                              }}
                            >
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.secondary"
                              >
                                {episode.episode
                                  ? `Серия ${episode.episode}`
                                  : episode.name}
                                {episode.runtime
                                  ? ` · ${episode.runtime} мин`
                                  : ""}
                              </Typography>

                              {progress > 0 && (
                                <LinearProgress
                                  variant="determinate"
                                  value={progress}
                                  sx={{
                                    height: 3,
                                    mt: 1,
                                    maxWidth: 300,
                                    borderRadius: 2,
                                  }}
                                />
                              )}
                            </Box>
                          }
                        />

                        {episode.isWatched ? (
                          <Typography
                            variant="caption"
                            color="success.main"
                          >
                            Просмотрено
                          </Typography>
                        ) : progress > 0 ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {Math.round(progress)}%
                          </Typography>
                        ) : null}
                      </ListItemButton>
                    );
                  })}
                </List>
              </AccordionDetails>
            </Accordion>
          );
        },
      )}

      <Divider sx={{ my: 4 }} />

      <Typography variant="h6">
        Моя оценка
      </Typography>

      <Rating
        max={10}
        value={userRating}
        onChange={(_, value) => {
          setUserRating(value);
          setSaved(false);
        }}
        sx={{ my: 2 }}
      />

      <TextField
        label="Отзыв"
        multiline
        minRows={4}
        fullWidth
        value={review}
        onChange={(event) => {
          setReview(event.target.value);
          setSaved(false);
        }}
      />

      <Button
        variant="contained"
        onClick={() =>
          void handleSaveUserData()
        }
        sx={{ mt: 2 }}
      >
        Сохранить
      </Button>

      {saved && (
        <Typography
          color="success.main"
          sx={{ mt: 1 }}
        >
          Сохранено
        </Typography>
      )}
    </Box>
  );
}