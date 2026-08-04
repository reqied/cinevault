import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import { addWatchlistItem } from "../services/database";
import { searchWatchlistMedia } from "../services/tmdb";
import type { TmdbSearchItem } from "../shared/types/media";

type AddWatchlistDialogProps = {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
};

export function AddWatchlistDialog({
  open,
  onClose,
  onAdded,
}: AddWatchlistDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError("");
    }
  }, [open]);

  async function handleSearch() {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const items = await searchWatchlistMedia(normalizedQuery);
      setResults(items);
    } catch (value) {
      setError(String(value));
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(item: TmdbSearchItem) {
    setAddingId(item.tmdbId);
    setError("");

    try {
      await addWatchlistItem(item);
      onAdded();
      onClose();
    } catch (value) {
      setError(String(value));
    } finally {
      setAddingId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Добавить в «Хочу посмотреть»</DialogTitle>

      <DialogContent>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mt: 1,
            mb: 2,
          }}
        >
          <TextField
            autoFocus
            fullWidth
            label="Название фильма или сериала"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSearch();
              }
            }}
          />

          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            Найти
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && results.length === 0 && query.trim() && (
          <Typography color="text.secondary">
            Выполни поиск или уточни название.
          </Typography>
        )}

        <List>
          {results.map((item) => (
            <ListItemButton
              key={`${item.mediaType}-${item.tmdbId}`}
              disabled={addingId !== null}
              onClick={() => handleAdd(item)}
            >
              <ListItemAvatar>
                {item.posterPath ? (
                  <Box
                    component="img"
                    src={`https://image.tmdb.org/t/p/w92${item.posterPath}`}
                    alt={item.title}
                    sx={{
                      width: 46,
                      height: 69,
                      objectFit: "cover",
                      borderRadius: 1,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 46,
                      height: 69,
                      bgcolor: "action.hover",
                      borderRadius: 1,
                    }}
                  />
                )}
              </ListItemAvatar>

              <ListItemText
                sx={{ ml: 2 }}
                primary={item.title}
                secondary={[
                  item.mediaType === "movie" ? "Фильм" : "Сериал",
                  item.year,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />

              {addingId === item.tmdbId && (
                <CircularProgress size={20} />
              )}
            </ListItemButton>
          ))}
        </List>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}