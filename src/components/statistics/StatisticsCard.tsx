import {
    Box,
    Paper,
    Typography,
  } from "@mui/material";
  import type { ReactNode } from "react";
  
  type StatisticsCardProps = {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: ReactNode;
  };
  
  export function StatisticsCard({
    title,
    value,
    subtitle,
    icon,
  }: StatisticsCardProps) {
    return (
      <Paper
        sx={{
          p: 3,
          minHeight: 150,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
          }}
        >
          <Typography
            color="text.secondary"
            fontWeight={600}
          >
            {title}
          </Typography>
  
          {icon && (
            <Box
              sx={{
                display: "flex",
                color: "primary.main",
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
  
        <Box sx={{ mt: 3 }}>
          <Typography
            variant="h4"
            fontWeight={700}
          >
            {value}
          </Typography>
  
          {subtitle && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Paper>
    );
  }