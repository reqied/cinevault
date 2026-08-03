import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    List,
    ListItemButton,
    ListItemText,
    Typography,
  } from "@mui/material";
  import ArrowBackIcon from "@mui/icons-material/ArrowBack";
  import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
  import PlayArrowIcon from "@mui/icons-material/PlayArrow";
  import { useLocation, useNavigate } from "react-router";
  import type {
    MediaFile,
    SeriesGroup,
  } from "../shared/types/media";
  
  import { useState } from "react";
  import {
    Rating,
    TextField,
    Divider,
  } from "@mui/material";
  import { saveSeriesUserData } from "../services/database";
  
  type LocationState = {
    series?: SeriesGroup;
  };
  
  export function SeriesDetailsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { series } = (location.state ?? {}) as LocationState;
    const [userRating, setUserRating] = useState<number | null>(
        series?.userRating ?? null,
      );
      
      const [review, setReview] = useState(
        series?.review ?? "",
      );
      
      const [saved, setSaved] = useState(false);
    if (!series) {
      return (
        <Alert severity="error">
          Сериал не найден. Вернись в библиотеку.
        </Alert>
      );
    }
  
    const seasons = series.episodes.reduce<
      Record<number, MediaFile[]>
    >((result, episode) => {
      const seasonNumber = episode.season ?? 0;
  
      if (!result[seasonNumber]) {
        result[seasonNumber] = [];
      }
  
      result[seasonNumber].push(episode);
      return result;
    }, {});
    
      
      async function handleSaveUserData() {
        if (!series?.id) {
          return;
        }
      
        await saveSeriesUserData(
          series.id,
          userRating,
          review,
        );
      
        setSaved(true);
      }
    const sortedSeasons = Object.entries(seasons)
      .map(([seasonNumber, episodes]) => ({
        seasonNumber: Number(seasonNumber),
        episodes: [...episodes].sort(
          (left, right) =>
            (left.episode ?? 0) - (right.episode ?? 0),
        ),
      }))
      .sort(
        (left, right) =>
          left.seasonNumber - right.seasonNumber,
      );
  
    function openEpisode(file: MediaFile) {
      navigate("/media/details", {
        state: {
          file,
        },
      });
    }
  
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 3 }}
        >
          Назад
        </Button>
        {series.backdropPath && (
        <Box
            component="img"
            src={`https://image.tmdb.org/t/p/original${series.backdropPath}`}
            alt={series.title}
            sx={{
            width: "100%",
            maxHeight: 450,
            objectFit: "cover",
            borderRadius: 3,
            mb: 4,
            }}
        />
        )}
        <Typography variant="h3" fontWeight={700}>
          {series.title}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
        {series.firstAirDate?.slice(0, 4) ??
            series.year ??
            "Год неизвестен"}
        {series.voteAverage != null &&
            ` · TMDB ${series.voteAverage.toFixed(1)}`}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
          Серий: {series.episodes.length}
        </Typography>
  
        {series.overview && (
          <Typography sx={{ maxWidth: 900, mb: 4 }}>
            {series.overview}
          </Typography>
        )}
  
        {sortedSeasons.map(({ seasonNumber, episodes }) => (
          <Accordion
            key={seasonNumber}
            defaultExpanded={seasonNumber === sortedSeasons[0]?.seasonNumber}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>
                {seasonNumber === 0
                  ? "Сезон не определён"
                  : `Сезон ${seasonNumber}`}
              </Typography>
            </AccordionSummary>
  
            <AccordionDetails sx={{ p: 0 }}>
              <List disablePadding>
                {episodes.map((episode) => (
                  <ListItemButton
                    key={episode.id ?? episode.path}
                    onClick={() => openEpisode(episode)}
                  >
                    <PlayArrowIcon sx={{ mr: 2 }} />
  
                    <ListItemText
                      primary={
                        episode.episode
                          ? `Серия ${episode.episode}`
                          : episode.title
                      }
                      secondary={episode.name}
                    />
                  </ListItemButton>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
    
        ))}
        <Divider sx={{ my: 4 }} />

        <Typography variant="h6">
        Моя оценка
        </Typography>

        <Rating
        max={10}
        value={userRating}
        onChange={(_, value) => {
            setUserRating(value);
            setSaved(false);
        }}
        sx={{ my: 2 }}
        />

        <TextField
        label="Отзыв"
        multiline
        minRows={4}
        fullWidth
        value={review}
        onChange={(event) => {
            setReview(event.target.value);
            setSaved(false);
        }}
        />

        <Button
        variant="contained"
        onClick={handleSaveUserData}
        sx={{ mt: 2 }}
        >
        Сохранить
        </Button>

        {saved && (
        <Typography
            color="success.main"
            sx={{ mt: 1 }}
        >
            Сохранено
        </Typography>
        )}
      </Box>
    );
  }