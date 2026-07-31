import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    MenuItem,
    Rating,
    Select,
    Stack,
    TextField,
    Typography,
  } from "@mui/material";
  import { ArrowBack, PlayArrow } from "@mui/icons-material";
  import { useLocation, useNavigate } from "react-router";
  import type { MediaFile } from "../shared/types/media";
  
  type LocationState = {
    file?: MediaFile;
  };
  
  export function MediaDetailsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { file } = (location.state ?? {}) as LocationState;
  
    if (!file) {
      return (
        <Alert severity="error">
          Файл не найден. Вернись в библиотеку и выбери его снова.
        </Alert>
      );
    }
  
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 3 }}>
          Назад
        </Button>
  
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "300px minmax(0, 1fr)",
            gap: 5,
          }}
        >
          <Box
            sx={{
              height: 430,
              bgcolor: "#202028",
              borderRadius: 2,
            }}
          />
  
          <Box>
            <Typography variant="h3" fontWeight={700}>
              {file.title}
            </Typography>
  
            <Stack direction="row" spacing={1} sx={{ my: 2 }}>
              <Chip label={file.mediaType === "movie" ? "Фильм" : "Сериал"} />
              {file.year && <Chip label={file.year} />}
              <Chip label={file.extension.toUpperCase()} />
            </Stack>
  
            {file.mediaType === "episode" && (
              <Typography variant="h6" sx={{ mb: 2 }}>
                Сезон {file.season}, серия {file.episode}
              </Typography>
            )}
  
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {file.path}
            </Typography>
  
            <Button variant="contained" size="large" startIcon={<PlayArrow />}>
              Смотреть
            </Button>
  
            <Divider sx={{ my: 4 }} />
  
            <Typography variant="h6" sx={{ mb: 2 }}>
              Настройки воспроизведения
            </Typography>
  
            <Stack direction="row" spacing={2}>
              <Select defaultValue="auto" sx={{ minWidth: 200 }}>
                <MenuItem value="auto">Аудио: автоматически</MenuItem>
                <MenuItem value="original">Оригинальная дорожка</MenuItem>
              </Select>
  
              <Select defaultValue="off" sx={{ minWidth: 200 }}>
                <MenuItem value="off">Субтитры выключены</MenuItem>
                <MenuItem value="auto">Автоматический выбор</MenuItem>
              </Select>
            </Stack>
  
            <Divider sx={{ my: 4 }} />
  
            <Typography variant="h6">Моя оценка</Typography>
            <Rating sx={{ my: 2 }} max={10} />
  
            <TextField
              label="Отзыв"
              multiline
              minRows={4}
              fullWidth
            />
          </Box>
        </Box>
      </Box>
    );
  }