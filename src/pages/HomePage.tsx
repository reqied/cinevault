import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import { MediaCarousel } from "../components/MediaCarousel";
import {
  getHomeData,
  type HomeData,
} from "../services/home";
import { WatchlistCard } from "../components/WatchlistCard";
import AddIcon from "@mui/icons-material/Add";
import { AddWatchlistDialog } from "../components/AddWatchlistDialog";
const emptyHomeData: HomeData = {
  recentlyAdded: [],
  movies: [],
  series: [],
  watchlist: [],
};

export function HomePage() {
  const [data, setData] =
    useState<HomeData>(emptyHomeData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [watchlistDialogOpen, setWatchlistDialogOpen] = useState(false);
  const loadHome = useCallback(async () => {
    setError("");

    try {
      const homeData = await getHomeData();
      setData(homeData);
    } catch (value) {
      setError(String(value));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  useEffect(() => {
    function handleLibraryChanged() {
      void loadHome();
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
  }, [loadHome]);

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
          Главная
        </Typography>
  
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setWatchlistDialogOpen(true)}
        >
          Хочу посмотреть
        </Button>
      </Box>
  
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
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
          <MediaCarousel
            title="Недавно добавленные"
            items={data.recentlyAdded}
          />
  
          {data.watchlist.length > 0 && (
            <Box sx={{ mb: 5 }}>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{ mb: 2 }}
              >
                Хочу посмотреть
              </Typography>
  
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  overflowX: "auto",
                  pb: 2,
                }}
              >
                {data.watchlist.map((item) => (
                  <WatchlistCard
                    key={`watchlist-${item.id}`}
                    item={item}
                    onChanged={() => void loadHome()}
                  />
                ))}
              </Box>
            </Box>
          )}
  
          <MediaCarousel
            title="Фильмы"
            items={data.movies}
          />
  
          <MediaCarousel
            title="Сериалы"
            items={data.series}
          />
  
          {data.recentlyAdded.length === 0 && (
            <Typography color="text.secondary">
              Добавь папку с фильмами или сериалами.
            </Typography>
          )}
        </>
      )}
  
      <AddWatchlistDialog
        open={watchlistDialogOpen}
        onClose={() => setWatchlistDialogOpen(false)}
        onAdded={() => void loadHome()}
      />
    </Box>
  );
}