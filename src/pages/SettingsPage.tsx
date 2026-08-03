import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";

import {
  deleteLibraryFolder,
  deleteMissingMediaFiles,
  getLibraryFolders,
  saveMediaFiles,
} from "../services/database";
import { scanFolder } from "../services/library";
import type { LibraryFolder } from "../shared/types/media";

export function SettingsPage() {
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [folderToDelete, setFolderToDelete] =
    useState<LibraryFolder | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadFolders();
  }, []);

  async function loadFolders() {
    setLoading(true);
    setError("");

    try {
      const storedFolders = await getLibraryFolders();
      setFolders(storedFolders);
    } catch (value) {
      setError(String(value));
    } finally {
      setLoading(false);
    }
  }

  async function handleRescan(folder: LibraryFolder) {
    setProcessingId(folder.id);
    setError("");
    setMessage("");

    try {
      const files = await scanFolder(folder.path);

      await saveMediaFiles(files, folder.id);

      await deleteMissingMediaFiles(
        folder.id,
        files.map((file) => file.path),
      );

      setMessage(
        `Папка обновлена. Найдено файлов: ${files.length}`,
      );
    } catch (value) {
      setError(String(value));
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete() {
    if (!folderToDelete) {
      return;
    }

    setProcessingId(folderToDelete.id);
    setError("");
    setMessage("");

    try {
      await deleteLibraryFolder(folderToDelete.id);
      setFolderToDelete(null);
      await loadFolders();
      setMessage("Папка удалена из библиотеки");
    } catch (value) {
      setError(String(value));
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
        Настройки
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Управление папками библиотеки
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {message && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {message}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && folders.length === 0 && (
        <Typography color="text.secondary">
          Подключённых папок пока нет.
        </Typography>
      )}

      <Stack spacing={2}>
        {folders.map((folder) => {
          const processing = processingId === folder.id;

          return (
            <Card key={folder.id}>
              <CardContent
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    minWidth: 0,
                  }}
                >
                  <FolderOutlinedIcon fontSize="large" />

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      fontWeight={600}
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {folder.path}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip
                        size="small"
                        label={
                          folder.folderType === "movies"
                            ? "Фильмы"
                            : folder.folderType === "series"
                              ? "Сериалы"
                              : "Смешанная"
                        }
                      />
                    </Stack>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={
                      processing ? (
                        <CircularProgress size={18} />
                      ) : (
                        <RefreshIcon />
                      )
                    }
                    disabled={processing}
                    onClick={() => handleRescan(folder)}
                  >
                    Сканировать
                  </Button>

                  <Button
                    color="error"
                    startIcon={<DeleteOutlinedIcon />}
                    disabled={processing}
                    onClick={() => setFolderToDelete(folder)}
                  >
                    Удалить
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Dialog
        open={Boolean(folderToDelete)}
        onClose={() => setFolderToDelete(null)}
      >
        <DialogTitle>Удалить папку?</DialogTitle>

        <DialogContent>
          <Typography>
            Папка и связанные с ней фильмы будут удалены только из
            библиотеки CineVault. Файлы на диске останутся без изменений.
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 2,
              overflowWrap: "anywhere",
            }}
          >
            {folderToDelete?.path}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setFolderToDelete(null)}>
            Отмена
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}