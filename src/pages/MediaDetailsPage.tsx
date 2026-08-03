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
import { ArrowBack, PlayArrow } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router";
import type { MediaFile } from "../shared/types/media";

type LocationState = {
  file?: MediaFile;
};

const imageBaseUrl = "https://image.tmdb.org/t/p";

export function MediaDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { file } = (location.state ?? {}) as LocationState;

  if (!file) {
    return (
      <Alert severity="error">
        Файл не найден. Вернись в библиотеку и выбери его снова.
      </Alert>
    );
  }

  const posterUrl = file.posterPath
    ? `${imageBaseUrl}/w500${file.posterPath}`
    : null;

  const backdropUrl = file.backdropPath
    ? `${imageBaseUrl}/original${file.backdropPath}`
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
              alt={file.title}
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
              {file.title}
            </Typography>

            {file.originalTitle && file.originalTitle !== file.title && (
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {file.originalTitle}
              </Typography>
            )}

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{ my: 2 }}
            >
              <Chip label={file.mediaType === "movie" ? "Фильм" : "Сериал"} />

              {file.releaseDate && (
                <Chip label={file.releaseDate.slice(0, 4)} />
              )}

              {!file.releaseDate && file.year && <Chip label={file.year} />}

              <Chip label={file.extension.toUpperCase()} />
            </Stack>

            {file.mediaType === "episode" && (
              <Typography variant="h6" sx={{ mb: 2 }}>
                Сезон {file.season}, серия {file.episode}
              </Typography>
            )}

            <Typography
              sx={{
                maxWidth: 800,
                mb: 3,
                lineHeight: 1.7,
              }}
            >
              {file.overview || "Описание отсутствует."}
            </Typography>

            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrow />}
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