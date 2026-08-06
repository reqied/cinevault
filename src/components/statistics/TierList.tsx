import {
    Box,
    Chip,
    Paper,
    Stack,
    Typography,
  } from "@mui/material";
  import { MovieCard } from "../MovieCard";
  import { SeriesCard } from "../SeriesCard";
  import type {
    TierListData,
    TierName,
  } from "../../services/statistics";
  
  type TierListProps = {
    tiers: TierListData;
  };
  
  const tierOrder: TierName[] = [
    "S",
    "A",
    "B",
    "C",
    "D",
    "F",
  ];
  
  export function TierList({
    tiers,
  }: TierListProps) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ mb: 3 }}
        >
          Тирлист по моим оценкам
        </Typography>
  
        <Stack spacing={2}>
          {tierOrder.map((tier) => {
            const items = tiers[tier];
  
            return (
              <Box
                key={tier}
                sx={{
                  display: "grid",
                  gridTemplateColumns:
                    "64px minmax(0, 1fr)",
                  gap: 2,
                  alignItems: "stretch",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 290,
                    borderRadius: 2,
                    bgcolor: "action.hover",
                  }}
                >
                  <Typography
                    variant="h4"
                    fontWeight={800}
                  >
                    {tier}
                  </Typography>
                </Box>
  
                <Box
                  sx={{
                    minWidth: 0,
                    display: "flex",
                    gap: 2,
                    overflowX: "auto",
                    pb: 1,
                    minHeight: 290,
                    alignItems: "flex-start",
                  }}
                >
                  {items.length === 0 ? (
                    <Box
                      sx={{
                        width: "100%",
                        minHeight: 270,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px dashed",
                        borderColor: "divider",
                        borderRadius: 2,
                      }}
                    >
                      <Chip
                        label="Нет оценённых элементов"
                        variant="outlined"
                      />
                    </Box>
                  ) : (
                    items.map((item) =>
                      item.type === "movie" ? (
                        <MovieCard
                          key={`tier-${tier}-movie-${
                            item.file.id ??
                            item.file.path
                          }`}
                          file={item.file}
                        />
                      ) : (
                        <SeriesCard
                          key={`tier-${tier}-series-${
                            item.series.id ??
                            item.series.key
                          }`}
                          series={item.series}
                        />
                      ),
                    )
                  )}
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Paper>
    );
  }