import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router";
import { MovieCard } from "../components/MovieCard";
import { SeriesCard } from "../components/SeriesCard";
import { WatchlistCard } from "../components/WatchlistCard";
import {
  searchLibrary,
  type SearchResult,
} from "../services/search";

function useSearchQuery(): string {
  const location = useLocation();

  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("q")?.trim() ?? "";
  }, [location.search]);
}

export function SearchPage() {
  const navigate = useNavigate();
  const query = useSearchQuery();

  const [results, setResults] = useState<SearchResult[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      if (!query) {
        setResults([]);
        setLoading(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const nextResults = await searchLibrary(query);

        if (!cancelled) {
          setResults(nextResults);
        }
      } catch (value) {
        if (!cancelled) {
          setError(String(value));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadResults();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const movies = results.filter(
    (
      result,
    ): result is Extract<
      SearchResult,
      { type: "movie" }
    > => result.type === "movie",
  );

  const series = results.filter(
    (
      result,
    ): result is Extract<
      SearchResult,
      { type: "series" }
    > => result.type === "series",
  );

  const episodes = results.filter(
    (
      result,
    ): result is Extract<
      SearchResult,
      { type: "episode" }
    > => result.type === "episode",
  );

  const watchlist = results.filter(
    (
      result,
    ): result is Extract<
      SearchResult,
      { type: "watchlist" }
    > => result.type === "watchlist",
  );

  function openEpisode(
    result: Extract<
      SearchResult,
      { type: "episode" }
    >,
  ) {
    const orderedEpisodes =
      result.series?.episodes
        .slice()
        .sort(
          (left, right) =>
            (left.season ?? 0) -
              (right.season ?? 0) ||
            (left.episode ?? 0) -
              (right.episode ?? 0),
        ) ?? [];

    navigate("/media/details", {
      state: {
        file: result.file,
        series: result.series ?? undefined,
        episodes: orderedEpisodes,
      },
    });
  }

  if (!query) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Поиск
        </Typography>

        <Typography
          color="text.secondary"
          sx={{ mt: 2 }}
        >
          Введи название фильма, сериала или серии.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700}>
        Результаты поиска
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ mt: 1, mb: 4 }}
      >
        Запрос: «{query}»
      </Typography>

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
      ) : results.length === 0 ? (
        <Typography color="text.secondary">
          Ничего не найдено.
        </Typography>
      ) : (
        <>
          {movies.length > 0 && (
            <SearchSection title="Фильмы">
              {movies.map((result) => (
                <MovieCard
                  key={result.key}
                  file={result.file}
                />
              ))}
            </SearchSection>
          )}

          {series.length > 0 && (
            <SearchSection title="Сериалы">
              {series.map((result) => (
                <SeriesCard
                  key={result.key}
                  series={result.series}
                />
              ))}
            </SearchSection>
          )}

          {episodes.length > 0 && (
            <SearchSection title="Серии">
              {episodes.map((result) => (
                <Box
                  key={result.key}
                  onClick={() =>
                    openEpisode(result)
                  }
                  sx={{
                    width: 280,
                    flexShrink: 0,
                    cursor: "pointer",
                    bgcolor: "background.paper",
                    borderRadius: 2,
                    overflow: "hidden",
                    transition: "transform 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                    },
                  }}
                >
                  {result.file.stillPath ||
                  result.file.backdropPath ? (
                    <Box
                      component="img"
                      src={`https://image.tmdb.org/t/p/w500${
                        result.file.stillPath ??
                        result.file.backdropPath
                      }`}
                      alt={
                        result.file.episodeTitle ??
                        result.file.title
                      }
                      sx={{
                        width: "100%",
                        height: 158,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 158,
                        bgcolor: "#202028",
                      }}
                    />
                  )}

                  <Box sx={{ p: 2 }}>
                    <Typography fontWeight={600} noWrap>
                      {result.file.episodeTitle ??
                        `Серия ${result.file.episode ?? "?"}`}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                    >
                      {result.series?.title ??
                        result.file.title}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Сезон {result.file.season ?? "?"},{" "}
                      серия {result.file.episode ?? "?"}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </SearchSection>
          )}

          {watchlist.length > 0 && (
            <SearchSection title="Хочу посмотреть">
              {watchlist.map((result) => (
                <WatchlistCard
                  key={result.key}
                  item={result.item}
                  onChanged={() => undefined}
                />
              ))}
            </SearchSection>
          )}
        </>
      )}
    </Box>
  );
}

type SearchSectionProps = {
  title: string;
  children: React.ReactNode;
};

function SearchSection({
  title,
  children,
}: SearchSectionProps) {
  return (
    <Box sx={{ mb: 5 }}>
      <Typography
        variant="h5"
        fontWeight={700}
        sx={{ mb: 2 }}
      >
        {title}
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          pb: 2,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}