import {
    Box,
    Card,
    CardActionArea,
    CardContent,
    Typography,
  } from "@mui/material";
  import PlayArrowIcon from "@mui/icons-material/PlayArrow";
  import { useNavigate } from "react-router";
  import type { MediaFile } from "../shared/types/media";
  
  type ContinueWatchingCardProps = {
    file: MediaFile;
  };
  
  export function ContinueWatchingCard({
    file,
  }: ContinueWatchingCardProps) {
    const navigate = useNavigate();
  
    const progress =
      file.watchDuration && file.watchDuration > 0
        ? Math.min(
            100,
            ((file.watchPosition ?? 0) /
              file.watchDuration) *
              100,
          )
        : 0;
  
    function openPlayer() {
      navigate("/player", {
        state: {
          file,
        },
      });
    }
  
    return (
      <Card
        sx={{
          width: 280,
          flexShrink: 0,
          bgcolor: "background.paper",
        }}
      >
        <CardActionArea onClick={openPlayer}>
          <Box
            sx={{
              position: "relative",
              height: 158,
              bgcolor: "#202028",
            }}
          >
            {file.backdropPath || file.stillPath ? (
              <Box
                component="img"
                src={`https://image.tmdb.org/t/p/w780${
                  file.stillPath ?? file.backdropPath
                }`}
                alt={file.title}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : file.posterPath ? (
              <Box
                component="img"
                src={`https://image.tmdb.org/t/p/w500${file.posterPath}`}
                alt={file.title}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : null}
  
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(0,0,0,0.25)",
              }}
            >
              <PlayArrowIcon sx={{ fontSize: 56 }} />
            </Box>
          </Box>
  
          <Box
            sx={{
              height: 4,
              bgcolor: "action.disabledBackground",
            }}
          >
            <Box
              sx={{
                width: `${progress}%`,
                height: "100%",
                bgcolor: "primary.main",
              }}
            />
          </Box>
  
          <CardContent>
            <Typography fontWeight={600} noWrap>
              {file.mediaType === "episode"
                ? file.episodeTitle ?? file.title
                : file.title}
            </Typography>
  
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
            >
              {file.mediaType === "episode"
                ? `Сезон ${file.season ?? "?"}, серия ${
                    file.episode ?? "?"
                  }`
                : `Просмотрено ${Math.round(progress)}%`}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  }