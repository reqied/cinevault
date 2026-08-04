import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Rating,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import SaveIcon from "@mui/icons-material/Save";
import { open } from "@tauri-apps/plugin-dialog";
import { useLocation, useNavigate } from "react-router";
import {
  linkWatchlistPath,
  saveWatchlistUserData,
  setWatchlistWatched,
  unlinkWatchlistPath,
} from "../services/database";
import type { WatchlistItem } from "../shared/types/media";

type LocationState = {
  item?: WatchlistItem;
};

const imageBaseUrl = "https://image.tmdb.org/t/p";

export function WatchlistDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { item } = (location.state ?? {}) as LocationState;

  const [isWatched, setIsWatched] = useState(
    item?.isWatched ?? false,
  );
  const [userRating, setUserRating] = useState<number | null>(
    item?.userRating ?? null,
  );
  const [review, setReview] = useState(item?.review ?? "");
  const [linkedPath, setLinkedPath] = useState(
    item?.linkedPath ?? null,
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  if (!item) {
    return (
      <Alert severity="error">
        Карточка не найдена. Вернись на главную.
      </Alert>
    );
  }

  const posterUrl = item.posterPath
    ? `${imageBaseUrl}/w500${item.posterPath}`
    : null;

  const backdropUrl = item.backdropPath
    ? `${imageBaseUrl}/original${item.backdropPath}`
    : null;

  async function toggleWatched() {
    const nextValue = !isWatched;

    try {
      await setWatchlistWatched(item.id, nextValue);
      setIsWatched(nextValue);
    } catch (value) {
      setError(String(value));
    }
  }

  async function handleSaveUserData() {
    setError("");

    try {
      await saveWatchlistUserData(
        item.id,
        userRating,
        review,
      );

      setSaved(true);
    } catch (value) {
      setError(String(value));
    }
  }

  async function handleLinkPath() {
    setError("");

    try {
      const isSeries = item.mediaType === "series";

      const selected = await open({
        directory: isSeries,
        multiple: false,
        title: isSeries
          ? "Выберите папку с сериями"
          : "Выберите видеофайл",
        filters: isSeries
          ? undefined
          : [
              {
                name: "Видео",
                extensions: [
                  "mkv",
                  "mp4",
                  "avi",
                  "mov",
                  "webm",
                  "m4v",
                ],
              },
            ],
      });

      if (!selected || Array.isArray(selected)) {
        return;
      }

      await linkWatchlistPath(
        item.id,
        selected,
        isSeries ? "folder" : "file",
      );

      setLinkedPath(selected);
    } catch (value) {
      setError(String(value));
    }
  }

  async function handleUnlinkPath() {
    setError("");

    try {
      await unlinkWatchlistPath(item.id);
      setLinkedPath(null);
    } catch (value) {
      setError(String(value));
    }
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

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
              alt={item.title}
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
              {item.title}
            </Typography>

            {item.originalTitle &&
              item.originalTitle !== item.title && (
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {item.originalTitle}
                </Typography>
              )}

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
                  item.mediaType === "movie"
                    ? "Фильм"
                    : "Сериал"
                }
              />

              {item.year && <Chip label={item.year} />}

              <Chip
                label={
                  linkedPath
                    ? "Файл привязан"
                    : "Нет локального файла"
                }
              />
            </Stack>

            <Typography
              sx={{
                maxWidth: 800,
                mb: 3,
                lineHeight: 1.7,
              }}
            >
              {item.overview || "Описание отсутствует."}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              <Button
                variant={isWatched ? "contained" : "outlined"}
                startIcon={
                  isWatched ? (
                    <CheckCircleIcon />
                  ) : (
                    <RadioButtonUncheckedIcon />
                  )
                }
                onClick={toggleWatched}
              >
                {isWatched
                  ? "Просмотрено"
                  : "Отметить просмотренным"}
              </Button>

              <Button
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                onClick={handleLinkPath}
              >
                {linkedPath
                  ? "Изменить путь"
                  : item.mediaType === "movie"
                    ? "Привязать файл"
                    : "Привязать папку"}
              </Button>

              {linkedPath && (
                <Button
                  color="error"
                  startIcon={<LinkOffIcon />}
                  onClick={handleUnlinkPath}
                >
                  Отвязать
                </Button>
              )}
            </Stack>

            {linkedPath && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 2,
                  overflowWrap: "anywhere",
                }}
              >
                {linkedPath}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h6">Моя оценка</Typography>

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
        startIcon={<SaveIcon />}
        onClick={handleSaveUserData}
        sx={{ mt: 2 }}
      >
        Сохранить
      </Button>

      {saved && (
        <Typography color="success.main" sx={{ mt: 1 }}>
          Сохранено
        </Typography>
      )}
    </Box>
  );
}