import {
    Box,
    LinearProgress,
    Paper,
    Stack,
    Typography,
  } from "@mui/material";
  import type { YearStatisticsItem } from "../../services/statistics";
  
  type FavoriteYearsChartProps = {
    items: YearStatisticsItem[];
  };
  
  export function FavoriteYearsChart({
    items,
  }: FavoriteYearsChartProps) {
    const maxCount = Math.max(
      1,
      ...items.map((item) => item.count),
    );
  
    return (
      <Paper sx={{ p: 3 }}>
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ mb: 3 }}
        >
          Любимые годы
        </Typography>
  
        {items.length === 0 ? (
          <Typography color="text.secondary">
            Пока нет данных.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {items.map((item) => (
              <Box
                key={item.year}
                sx={{
                  display: "grid",
                  gridTemplateColumns:
                    "56px minmax(0, 1fr) 40px",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Typography fontWeight={600}>
                  {item.year}
                </Typography>
  
                <LinearProgress
                  variant="determinate"
                  value={
                    (item.count / maxCount) * 100
                  }
                  sx={{
                    height: 10,
                    borderRadius: 5,
                  }}
                />
  
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="right"
                >
                  {item.count}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    );
  }