import { Box, Typography } from "@mui/material";
import type {
  LibraryItem,
  MediaFile,
  SeriesGroup,
} from "../shared/types/media";
import { MovieCard } from "./MovieCard";
import { SeriesCard } from "./SeriesCard";

type MediaCarouselProps = {
  title: string;
  items: LibraryItem[];
};

export function MediaCarousel({
  title,
  items,
}: MediaCarouselProps) {
  if (items.length === 0) {
    return null;
  }

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
          scrollbarWidth: "thin",
        }}
      >
        {items.map((item) =>
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
    </Box>
  );
}