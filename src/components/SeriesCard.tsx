import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
} from "@mui/material";
import TvIcon from "@mui/icons-material/Tv";
import { useNavigate } from "react-router";
import type { SeriesGroup } from "../shared/types/media";

type SeriesCardProps = {
  series: SeriesGroup;
};

export function SeriesCard({ series }: SeriesCardProps) {
  const navigate = useNavigate();

  const seasonCount = new Set(
    series.episodes
      .map((episode) => episode.season)
      .filter((season): season is number => season !== null),
  ).size;

  const watchedEpisodes = series.episodes.filter(
    (episode) => episode.isWatched,
  ).length;

  const startedEpisode = series.episodes.find(
    (episode) =>
      !episode.isWatched &&
      (episode.watchPosition ?? 0) > 0,
  );

  const totalEpisodes = series.episodes.length;

  const seriesProgress =
    totalEpisodes > 0
      ? (watchedEpisodes / totalEpisodes) * 100
      : 0;

  function openSeries() {
    navigate("/series/details", {
      state: {
        series,
      },
    });
  }

  return (
    <Card
      sx={{
        width: 190,
        bgcolor: "background.paper",
        transition: "transform 0.2s",
        "&:hover": {
          transform: "translateY(-6px)",
        },
      }}
    >
      <CardActionArea onClick={openSeries}>
        {series.posterPath ? (
          <>
            <Box
              component="img"
              src={`https://image.tmdb.org/t/p/w500${series.posterPath}`}
              alt={series.title}
              sx={{
                width: "100%",
                height: 270,
                objectFit: "cover",
                display: "block",
              }}
            />

            {(seriesProgress > 0 || startedEpisode) && (
              <Box
                sx={{
                  height: 4,
                  bgcolor: "action.disabledBackground",
                }}
              >
                <Box
                  sx={{
                    width: `${Math.max(
                      seriesProgress,
                      startedEpisode ? 2 : 0,
                    )}%`,
                    height: "100%",
                    bgcolor:
                      watchedEpisodes === totalEpisodes
                        ? "success.main"
                        : "primary.main",
                  }}
                />
              </Box>
            )}
          </>
        ) : (
          <>
            <Box
              sx={{
                height: 270,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                bgcolor: "#202028",
              }}
            >
              <TvIcon
                sx={{
                  fontSize: 72,
                  color: "text.secondary",
                }}
              />
            </Box>

            {(seriesProgress > 0 || startedEpisode) && (
              <Box
                sx={{
                  height: 4,
                  bgcolor: "action.disabledBackground",
                }}
              >
                <Box
                  sx={{
                    width: `${Math.max(
                      seriesProgress,
                      startedEpisode ? 2 : 0,
                    )}%`,
                    height: "100%",
                    bgcolor:
                      watchedEpisodes === totalEpisodes
                        ? "success.main"
                        : "primary.main",
                  }}
                />
              </Box>
            )}
          </>
        )}

        <CardContent>
          <Typography fontWeight={600} noWrap>
            {series.title}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            {seasonCount > 0
              ? `Сезонов: ${seasonCount}`
              : `Серий: ${totalEpisodes}`}
          </Typography>

          {watchedEpisodes > 0 && (
            <Typography
              variant="caption"
              color={
                watchedEpisodes === totalEpisodes
                  ? "success.main"
                  : "text.secondary"
              }
              display="block"
            >
              {watchedEpisodes === totalEpisodes
                ? "Просмотрено"
                : `${watchedEpisodes} из ${totalEpisodes} серий`}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}