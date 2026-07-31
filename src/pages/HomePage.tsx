import { Box, Typography } from "@mui/material";
import { MovieCard } from "../components/MovieCard";

const movies = [
  {
    title: "Interstellar",
    year: 2014,
    poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  },
  {
    title: "Dune",
    year: 2021,
    poster: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
  },
  {
    title: "Blade Runner 2049",
    year: 2017,
    poster: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
  },
  {
    title: "The Batman",
    year: 2022,
    poster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
  },
];


export function HomePage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Главная
      </Typography>

      <Typography color="text.secondary">
        Добавь папку с фильмами в библиотеке.
      </Typography>
    </Box>
  );
}