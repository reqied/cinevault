import {
    Box,
    LinearProgress,
    Paper,
    Stack,
    Typography,
  } from "@mui/material";
  import type { RatingDistributionItem } from "../../services/statistics";
  
  type RatingDistributionProps = {
    items: RatingDistributionItem[];
  };
  
  export function RatingDistribution({
    items,
  }: RatingDistributionProps) {
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
          Распределение оценок
        </Typography>
  
        <Stack spacing={1.5}>
          {[...items]
            .sort(
              (left, right) =>
                right.rating - left.rating,
            )
            .map((item) => {
              const value =
                (item.count / maxCount) * 100;
  
              return (
                <Box
                  key={item.rating}
                  sx={{
                    display: "grid",
                    gridTemplateColumns:
                      "28px minmax(0, 1fr) 40px",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Typography fontWeight={600}>
                    {item.rating}
                  </Typography>
  
                  <LinearProgress
                    variant="determinate"
                    value={value}
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
              );
            })}
        </Stack>
      </Paper>
    );
  }