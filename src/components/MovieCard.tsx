import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
} from "@mui/material";
import { LocalMovies, Tv } from "@mui/icons-material";
import { useNavigate } from "react-router";
import type { MediaFile } from "../shared/types/media";

type MovieCardProps = {
  file: MediaFile;
};

export function MovieCard({ file }: MovieCardProps) {
  const navigate = useNavigate();

  const progress =
    file.watchDuration && file.watchDuration > 0
      ? Math.min(
          100,
          ((file.watchPosition ?? 0) / file.watchDuration) * 100,
        )
      : 0;

  function openDetails() {
    navigate("/media/details", {
      state: {
        file,
      },
    });
  }

  return (
    <Card
      sx={{
        width: 190,
        flexShrink: 0,
        bgcolor: "background.paper",
        transition: "transform 0.2s",
        "&:hover": {
          transform: "translateY(-6px)",
        },
      }}
    >
      <CardActionArea onClick={openDetails}>
        {file.posterPath ? (
          <Box
            component="img"
            src={`https://image.tmdb.org/t/p/w500${file.posterPath}`}
            alt={file.title}
            sx={{
              width: "100%",
              height: 270,
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <Box
            sx={{
              height: 270,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              bgcolor: "#202028",
            }}
          >
            {file.mediaType === "episode" ? (
              <Tv
                sx={{
                  fontSize: 72,
                  color: "text.secondary",
                }}
              />
            ) : (
              <LocalMovies
                sx={{
                  fontSize: 72,
                  color: "text.secondary",
                }}
              />
            )}
          </Box>
        )}

        {progress > 0 && (
          <Box
            sx={{
              height: 4,
              bgcolor: "action.disabledBackground",
            }}
          >
            <Box
              sx={{
                width: `${progress}%`,
                height: "100%",
                bgcolor: file.isWatched
                  ? "success.main"
                  : "primary.main",
              }}
            />
          </Box>
        )}

        <CardContent>
          <Typography fontWeight={600} noWrap>
            {file.title}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
          >
            {file.mediaType === "episode"
              ? `Сезон ${file.season ?? "?"}, серия ${
                  file.episode ?? "?"
                }`
              : file.year ?? "Год неизвестен"}
          </Typography>

          {file.isWatched ? (
            <Typography
              variant="caption"
              color="success.main"
              display="block"
            >
              Просмотрено
            </Typography>
          ) : progress > 0 ? (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Просмотрено {Math.round(progress)}%
            </Typography>
          ) : null}

          {file.metadataStatus === "processing" && (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Загружаем данные...
            </Typography>
          )}

          {file.metadataStatus === "pending" && (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Ожидает обработки
            </Typography>
          )}

          {file.metadataStatus === "failed" && (
            <Typography
              variant="caption"
              color="error"
              display="block"
            >
              Метаданные не найдены
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}