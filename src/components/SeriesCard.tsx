import {
    Box,
    Card,
    CardActionArea,
    CardContent,
    Typography,
  } from "@mui/material";
  import TvIcon from "@mui/icons-material/Tv";
  import { useNavigate } from "react-router";
  import type { SeriesGroup } from "../shared/types/media";
  
  type SeriesCardProps = {
    series: SeriesGroup;
  };
  
  export function SeriesCard({ series }: SeriesCardProps) {
    const navigate = useNavigate();
  
    const seasonCount = new Set(
      series.episodes
        .map((episode) => episode.season)
        .filter((season): season is number => season !== null),
    ).size;
  
    function openSeries() {
      navigate("/series/details", {
        state: {
          series,
        },
      });
    }
  
    return (
      <Card
        sx={{
          width: 190,
          bgcolor: "background.paper",
          transition: "transform 0.2s",
          "&:hover": {
            transform: "translateY(-6px)",
          },
        }}
      >
        <CardActionArea onClick={openSeries}>
          {series.posterPath ? (
            <Box
              component="img"
              src={`https://image.tmdb.org/t/p/w500${series.posterPath}`}
              alt={series.title}
              sx={{
                width: "100%",
                height: 270,
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <Box
              sx={{
                height: 270,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                bgcolor: "#202028",
              }}
            >
              <TvIcon sx={{ fontSize: 72, color: "text.secondary" }} />
            </Box>
          )}
  
          <CardContent>
            <Typography fontWeight={600} noWrap>
              {series.title}
            </Typography>
  
            <Typography variant="body2" color="text.secondary">
              {seasonCount > 0
                ? `Сезонов: ${seasonCount}`
                : `Серий: ${series.episodes.length}`}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  }