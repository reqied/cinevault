import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import { MovieCard } from "../components/MovieCard";
import { selectAndScanFolder } from "../services/library";
import {
  getMediaFiles,
  getMetadataProgress,
  getSeriesGroups,
  retryFailedMetadata,
  saveLibraryFolder,
  saveMediaFiles,
  type MetadataProgress,
} from "../services/database";
import { runMetadataQueue } from "../services/metadataQueue";
import type {
  LibraryFolderType,
  LibraryItem,
  MediaFile,
  SeriesGroup,
} from "../shared/types/media";
import { SeriesCard } from "../components/SeriesCard";
const emptyProgress: MetadataProgress = {
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
};
import { updateSeriesMetadata } from "../services/seriesMetadata";

export function LibraryPage() {
  const [seriesGroups, setSeriesGroups] = useState<SeriesGroup[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [progress, setProgress] =
    useState<MetadataProgress>(emptyProgress);
  const [initialLoading, setInitialLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [folderTypeDialogOpen, setFolderTypeDialogOpen] =
    useState(false);
  const [folderType, setFolderType] =
    useState<LibraryFolderType>("movies");
  const [error, setError] = useState("");

  const loadLibrary = useCallback(
    async (showLoader = false) => {
      if (showLoader) {
        setInitialLoading(true);
      }

      try {
        const [storedFiles, storedSeries, metadataProgress] = await Promise.all([
          getMediaFiles(),
          getSeriesGroups(),
          getMetadataProgress(),
        ]);

        setFiles(storedFiles);
        setSeriesGroups(storedSeries);
        setProgress(metadataProgress);
      } catch (value) {
        setError(String(value));
      } finally {
        if (showLoader) {
          setInitialLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadLibrary(true);
  }, [loadLibrary]);

  useEffect(() => {
    function handleLibraryChanged() {
      void loadLibrary();
    }

    window.addEventListener(
      "cinevault:library-changed",
      handleLibraryChanged,
    );

    return () => {
      window.removeEventListener(
        "cinevault:library-changed",
        handleLibraryChanged,
      );
    };
  }, [loadLibrary]);

  async function handleSelectFolder() {
    setFolderTypeDialogOpen(false);
    setImporting(true);
    setError("");

    try {
      const result = await selectAndScanFolder(folderType);

      if (!result) {
        return;
      }

      const libraryFolderId = await saveLibraryFolder(
        result.folderPath,
        folderType,
      );

      await saveMediaFiles(result.files, libraryFolderId);
      await loadLibrary();

      void runMetadataQueue();
      void updateSeriesMetadata();
    } catch (value) {
      setError(String(value));
    } finally {
      setImporting(false);
    }
  }

  async function handleRetryFailed() {
    setError("");

    try {
      await retryFailedMetadata();
      await loadLibrary();
      void runMetadataQueue();
      void updateSeriesMetadata();
    } catch (value) {
      setError(String(value));
    }
  }

  const processedCount = progress.completed + progress.failed;

  const progressValue =
    progress.total > 0
      ? (processedCount / progress.total) * 100
      : 0;

  const queueActive =
    progress.pending > 0 || progress.processing > 0;

  const libraryItems: LibraryItem[] = (() => {
    const movies: LibraryItem[] = files
      .filter((file) => file.mediaType === "movie")
      .map((file) => ({
        type: "movie",
        file,
      }));

    const seriesItems: LibraryItem[] = seriesGroups
      .filter((series) => series.episodes.length > 0)
      .map((series) => ({
        type: "series",
        series,
      }));

    return [...movies, ...seriesItems];
  })();
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 3,
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Библиотека
          </Typography>

          {files.length > 0 && (
            <Typography color="text.secondary">
              Файлов: {files.length}
            </Typography>
          )}
        </Box>

        <Button
          variant="contained"
          startIcon={
            importing ? (
              <CircularProgress size={18} />
            ) : (
              <AddIcon />
            )
          }
          onClick={() => setFolderTypeDialogOpen(true)}
          disabled={importing}
        >
          Добавить папку
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {progress.total > 0 && (
        <Box sx={{ mb: 4 }}>
          <Stack
            direction="row"
            sx={{
              mb: 1,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2">
              {queueActive
                ? "Загрузка метаданных"
                : "Обработка завершена"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {processedCount} / {progress.total}
            </Typography>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={progressValue}
          />

          <Stack
            direction="row"
            spacing={2}
            sx={{
              mt: 1,
              alignItems: "center",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              В очереди: {progress.pending}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Обрабатывается: {progress.processing}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Готово: {progress.completed}
            </Typography>

            {progress.failed > 0 && (
              <Button
                size="small"
                color="warning"
                startIcon={<RefreshIcon />}
                onClick={handleRetryFailed}
              >
                Повторить ошибки: {progress.failed}
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {initialLoading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mt: 8,
          }}
        >
          <CircularProgress />
        </Box>
      ) : files.length === 0 ? (
        <Typography color="text.secondary">
          В библиотеке пока нет видеофайлов.
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(190px, 1fr))",
            gap: 3,
          }}
        >
          {libraryItems.map((item) =>
          item.type === "movie" ? (
            <MovieCard
              key={`movie-${item.file.id ?? item.file.path}`}
              file={item.file}
            />
          ) : (
            <SeriesCard
            key={`series-${item.series.id ?? item.series.key}`}
            series={item.series}
            />
          ),
        )}
        </Box>
      )}

      <Dialog
        open={folderTypeDialogOpen}
        onClose={() => setFolderTypeDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Тип папки</DialogTitle>

        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Выбери, какой контент хранится в папке.
          </Typography>

          <FormControl fullWidth>
            <InputLabel>Тип контента</InputLabel>

            <Select
              value={folderType}
              label="Тип контента"
              onChange={(event) =>
                setFolderType(
                  event.target.value as LibraryFolderType,
                )
              }
            >
              <MenuItem value="movies">Фильмы</MenuItem>
              <MenuItem value="series">Сериалы</MenuItem>
              <MenuItem value="mixed">Смешанная папка</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setFolderTypeDialogOpen(false)}
          >
            Отмена
          </Button>

          <Button
            variant="contained"
            onClick={handleSelectFolder}
          >
            Выбрать папку
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}