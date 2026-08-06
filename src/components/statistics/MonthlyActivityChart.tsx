import {
    Box,
    Paper,
    Stack,
    Typography,
  } from "@mui/material";
  import type { MonthlyActivityItem } from "../../services/statistics";
  
  type MonthlyActivityChartProps = {
    items: MonthlyActivityItem[];
  };
  
  function formatMonth(value: string): string {
    const [year, month] = value.split("-");
  
    const date = new Date(
      Number(year),
      Number(month) - 1,
      1,
    );
  
    return new Intl.DateTimeFormat("ru-RU", {
      month: "short",
      year: "2-digit",
    }).format(date);
  }
  
  function formatHours(seconds: number): string {
    const hours = seconds / 3600;
  
    if (hours < 1) {
      return `${Math.round(seconds / 60)} мин`;
    }
  
    return `${hours.toFixed(1)} ч`;
  }
  
  export function MonthlyActivityChart({
    items,
  }: MonthlyActivityChartProps) {
    const recentItems = items.slice(-12);
  
    const maxSeconds = Math.max(
      1,
      ...recentItems.map(
        (item) => item.watchedSeconds,
      ),
    );
  
    return (
      <Paper sx={{ p: 3 }}>
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ mb: 3 }}
        >
          Активность по месяцам
        </Typography>
  
        {recentItems.length === 0 ? (
          <Typography color="text.secondary">
            Пока нет данных о просмотрах.
          </Typography>
        ) : (
          <Box
            sx={{
              height: 280,
              display: "flex",
              alignItems: "flex-end",
              gap: 2,
              overflowX: "auto",
              pb: 1,
            }}
          >
            {recentItems.map((item) => {
              const height =
                Math.max(
                  8,
                  (item.watchedSeconds /
                    maxSeconds) *
                    210,
                );
  
              return (
                <Stack
                  key={item.month}
                  spacing={1}
                  alignItems="center"
                  sx={{
                    minWidth: 64,
                    height: "100%",
                    justifyContent: "flex-end",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      maxHeight: 70,
                    }}
                  >
                    {formatHours(
                      item.watchedSeconds,
                    )}
                  </Typography>
  
                  <Box
                    sx={{
                      width: 34,
                      height,
                      minHeight: 8,
                      borderRadius: "8px 8px 2px 2px",
                      bgcolor: "primary.main",
                    }}
                  />
  
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    textAlign="center"
                  >
                    {formatMonth(item.month)}
                  </Typography>
                </Stack>
              );
            })}
          </Box>
        )}
      </Paper>
    );
  }