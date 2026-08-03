import {
    Box,
    Card,
    CardActionArea,
    CardContent,
    Typography,
  } from "@mui/material";
  import { LocalMovies, Tv } from "@mui/icons-material";
  import { useNavigate } from "react-router";
  import type { MediaFile } from "../shared/types/media";
  
  type MovieCardProps = {
    file: MediaFile;
  };
  
  export function MovieCard({ file }: MovieCardProps) {
    const navigate = useNavigate();
  
    function openDetails() {
      navigate("/media/details", {
        state: {
          file,
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
        <CardActionArea onClick={openDetails}>
        {file.posterPath ? (
  <Box
    component="img"
    src={`https://image.tmdb.org/t/p/w500${file.posterPath}`}
    alt={file.title}
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
    {file.mediaType === "episode" ? (
      <Tv sx={{ fontSize: 72, color: "text.secondary" }} />
    ) : (
      <LocalMovies sx={{ fontSize: 72, color: "text.secondary" }} />
    )}
  </Box>
)}
  
          <CardContent>
            <Typography fontWeight={600} noWrap>
              {file.title}
            </Typography>
  
            <Typography variant="body2" color="text.secondary" noWrap>
              {file.mediaType === "episode"
                ? `Сезон ${file.season}, серия ${file.episode}`
                : file.year ?? "Год неизвестен"}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  }