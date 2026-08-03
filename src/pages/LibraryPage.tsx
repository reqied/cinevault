import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { MovieCard } from "../components/MovieCard";
import { selectAndScanFolder } from "../services/library";
import {
  getMediaFiles,
  saveMediaFiles,
  saveMovieMetadata,
} from "../services/database";
import { searchMovieMetadata } from "../services/tmdb";
import type { MediaFile } from "../shared/types/media";

export function LibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    setLoading(true);
    setError("");

    try {
      const storedFiles = await getMediaFiles();
      setFiles(storedFiles);
    } catch (value) {
      setError(String(value));
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectFolder() {
    setLoading(true);
    setError("");

    try {
      const result = await selectAndScanFolder();

      if (!result) {
        return;
      }

      await saveMediaFiles(result.files);

      const importedFiles = await getMediaFiles();

      for (const file of importedFiles) {
        if (file.mediaType !== "movie" || file.tmdbId || !file.id) {
          continue;
        }

        const metadata = await searchMovieMetadata(file.title, file.year);

        if (metadata) {
          await saveMovieMetadata(file.id, metadata);
        }
      }

      await loadLibrary();
    } catch (value) {
      setError(String(value));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          Библиотека
        </Typography>

        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={18} /> : <Add />}
          onClick={handleSelectFolder}
          disabled={loading}
        >
          Добавить папку
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && files.length === 0 && (
        <Typography color="text.secondary">
          В библиотеке пока нет видеофайлов.
        </Typography>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          gap: 3,
        }}
      >
        {files.map((file) => (
          <MovieCard key={file.id ?? file.path} file={file} />
        ))}
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && files.length > 0 && (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          Найдено файлов: {files.length}
        </Typography>
      )}
    </Box>
  );
}