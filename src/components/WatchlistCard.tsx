import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import {
  deleteWatchlistItem,
  setWatchlistWatched,
} from "../services/database";
import type { WatchlistItem } from "../shared/types/media";

type WatchlistCardProps = {
  item: WatchlistItem;
  onChanged: () => void;
};

export function WatchlistCard({
  item,
  onChanged,
}: WatchlistCardProps) {
  const [processing, setProcessing] = useState(false);

  async function toggleWatched() {
    setProcessing(true);

    try {
      await setWatchlistWatched(
        item.id,
        !item.isWatched,
      );

      onChanged();
    } finally {
      setProcessing(false);
    }
  }

  async function removeItem() {
    setProcessing(true);

    try {
      await deleteWatchlistItem(item.id);
      onChanged();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Card
      sx={{
        width: 190,
        flexShrink: 0,
        bgcolor: "background.paper",
        transition: "transform 0.2s",
        "&:hover": {
          transform: "translateY(-6px)",
        },
      }}
    >
      <CardActionArea>
        {item.posterPath ? (
          <Box
            component="img"
            src={`https://image.tmdb.org/t/p/w500${item.posterPath}`}
            alt={item.title}
            sx={{
              width: "100%",
              height: 270,
              objectFit: "cover",
              display: "block",
              opacity: item.isWatched ? 0.55 : 1,
            }}
          />
        ) : (
          <Box
            sx={{
              height: 270,
              bgcolor: "#202028",
            }}
          />
        )}

        <CardContent>
          <Typography fontWeight={600} noWrap>
            {item.title}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            {item.year ?? "Год неизвестен"}
          </Typography>
        </CardContent>
      </CardActionArea>

      <Stack spacing={1} sx={{ px: 1, pb: 1 }}>
        <Button
          size="small"
          disabled={processing}
          startIcon={
            item.isWatched ? (
              <CheckCircleIcon />
            ) : (
              <RadioButtonUncheckedIcon />
            )
          }
          onClick={toggleWatched}
        >
          {item.isWatched
            ? "Просмотрено"
            : "Не просмотрено"}
        </Button>

        <Button
          size="small"
          color="error"
          disabled={processing}
          startIcon={<DeleteOutlinedIcon />}
          onClick={removeItem}
        >
          Удалить
        </Button>
      </Stack>
    </Card>
  );
}