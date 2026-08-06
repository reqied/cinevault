import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  Typography,
} from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";
import TvIcon from "@mui/icons-material/Tv";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import StarIcon from "@mui/icons-material/Star";
import {
  getStatisticsData,
  type StatisticsData,
} from "../services/statistics";
import { StatisticsCard } from "../components/statistics/StatisticsCard";
import { RatingDistribution } from "../components/statistics/RatingDistribution";
import { MonthlyActivityChart } from "../components/statistics/MonthlyActivityChart";
import { FavoriteYearsChart } from "../components/statistics/FavoriteYearsChart";
import { TierList } from "../components/statistics/TierList";

function formatHours(seconds: number): string {
  const hours = seconds / 3600;

  if (hours < 1) {
    return `${Math.round(seconds / 60)} мин`;
  }

  return `${hours.toFixed(1)} ч`;
}

const emptyStatistics: StatisticsData = {
  movieCount: 0,
  seriesCount: 0,
  episodeCount: 0,
  watchedMovieCount: 0,
  completedSeriesCount: 0,
  watchedEpisodeCount: 0,
  watchedSeconds: 0,
  remainingSeconds: 0,
  averageRating: null,
  ratedCount: 0,
  ratingDistribution: [],
  monthlyActivity: [],
  dailyActivity: [],
  favoriteYears: [],
  tierList: {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    F: [],
  },
};

export function StatisticsPage() {
  const [data, setData] =
    useState<StatisticsData>(emptyStatistics);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStatistics = useCallback(async () => {
    setError("");

    try {
      const statistics =
        await getStatisticsData();

      setData(statistics);
    } catch (value) {
      setError(String(value));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);

  useEffect(() => {
    function handleProgressChanged() {
      void loadStatistics();
    }

    function handleLibraryChanged() {
      void loadStatistics();
    }

    window.addEventListener(
      "cinevault:progress-changed",
      handleProgressChanged,
    );

    window.addEventListener(
      "cinevault:library-changed",
      handleLibraryChanged,
    );

    return () => {
      window.removeEventListener(
        "cinevault:progress-changed",
        handleProgressChanged,
      );

      window.removeEventListener(
        "cinevault:library-changed",
        handleLibraryChanged,
      );
    };
  }, [loadStatistics]);

  return (
    <Box>
      <Typography
        variant="h4"
        fontWeight={700}
        sx={{ mb: 4 }}
      >
        Статистика
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mt: 8,
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid
            container
            spacing={2}
            sx={{ mb: 4 }}
          >
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatisticsCard
                title="Фильмы"
                value={data.movieCount}
                subtitle={`${data.watchedMovieCount} просмотрено`}
                icon={<MovieIcon />}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatisticsCard
                title="Сериалы"
                value={data.seriesCount}
                subtitle={`${data.completedSeriesCount} завершено`}
                icon={<TvIcon />}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatisticsCard
                title="Серии"
                value={data.episodeCount}
                subtitle={`${data.watchedEpisodeCount} просмотрено`}
                icon={<VideoLibraryIcon />}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatisticsCard
                title="Время просмотра"
                value={formatHours(
                  data.watchedSeconds,
                )}
                subtitle="По сохранённому прогрессу"
                icon={<ScheduleIcon />}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <StatisticsCard
                title="Просмотрено объектов"
                value={
                  data.watchedMovieCount +
                  data.watchedEpisodeCount +
                  data.completedSeriesCount
                }
                subtitle="Фильмы, серии и завершённые сериалы"
                icon={<CheckCircleIcon />}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <StatisticsCard
                title="Осталось времени"
                value={formatHours(
                  data.remainingSeconds,
                )}
                subtitle="По начатым файлам"
                icon={<HourglassBottomIcon />}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <StatisticsCard
                title="Средняя оценка"
                value={
                  data.averageRating === null
                    ? "—"
                    : data.averageRating.toFixed(1)
                }
                subtitle={`${data.ratedCount} оценено`}
                icon={<StarIcon />}
              />
            </Grid>
          </Grid>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(0, 1.4fr) minmax(320px, 1fr)",
              },
              gap: 3,
              mb: 3,
            }}
          >
            <MonthlyActivityChart
              items={data.monthlyActivity}
            />

            <RatingDistribution
              items={data.ratingDistribution}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(320px, 1fr) minmax(0, 1.5fr)",
              },
              gap: 3,
              mb: 3,
            }}
          >
            <FavoriteYearsChart
              items={data.favoriteYears}
            />

            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: "background.paper",
              }}
            >
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ mb: 2 }}
              >
                Календарь активности
              </Typography>

              {data.dailyActivity.length === 0 ? (
                <Typography color="text.secondary">
                  Пока нет данных о просмотрах.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(18px, 1fr))",
                    gap: 0.75,
                  }}
                >
                  {data.dailyActivity.map(
                    (item) => (
                      <Box
                        key={item.date}
                        title={`${item.date}: ${item.count}`}
                        sx={{
                          aspectRatio: "1",
                          minWidth: 14,
                          borderRadius: 0.75,
                          bgcolor:
                            item.count >= 4
                              ? "primary.dark"
                              : item.count >= 2
                                ? "primary.main"
                                : "primary.light",
                        }}
                      />
                    ),
                  )}
                </Box>
              )}
            </Box>
          </Box>

          <TierList tiers={data.tierList} />
        </>
      )}
    </Box>
  );
}