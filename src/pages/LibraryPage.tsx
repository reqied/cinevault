import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
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
  retryFailedMetadata,
  saveLibraryFolder,
  saveMediaFiles,
  type MetadataProgress,
} from "../services/database";
import { runMetadataQueue } from "../services/metadataQueue";
import type { MediaFile } from "../shared/types/media";

const emptyProgress: MetadataProgress = {
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
};

export function LibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [progress, setProgress] =
    useState<MetadataProgress>(emptyProgress);
  const [initialLoading, setInitialLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const loadLibrary = useCallback(
    async (showLoader = false) => {
      if (showLoader) {
        setInitialLoading(true);
      }

      try {
        const [storedFiles, metadataProgress] = await Promise.all([
          getMediaFiles(),
          getMetadataProgress(),
        ]);

        setFiles(storedFiles);
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
    setImporting(true);
    setError("");

    try {
      const result = await selectAndScanFolder();

      if (!result) {
        return;
      }

      const libraryFolderId = await saveLibraryFolder(
        result.folderPath,
        "mixed",
      );

      await saveMediaFiles(result.files, libraryFolderId);
      await loadLibrary();

      void runMetadataQueue();
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
    } catch (value) {
      setError(String(value));
    }
  }

  const processedCount =
    progress.completed + progress.failed;

  const progressValue =
    progress.total > 0
      ? (processedCount / progress.total) * 100
      : 0;

  const queueActive =
    progress.pending > 0 || progress.processing > 0;

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
          onClick={handleSelectFolder}
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
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography variant="body2">
              {queueActive
                ? "Загрузка метаданных"
                : "Обработка завершена"}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
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
            alignItems="center"
            sx={{ mt: 1 }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
            >
              В очереди: {progress.pending}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
            >
              Обрабатывается: {progress.processing}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
            >
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
          {files.map((file) => (
            <MovieCard
              key={file.id ?? file.path}
              file={file}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}