import { useEffect } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { RouterProvider } from "react-router";
import { router } from "./router";
import { theme } from "./theme";
import { runMetadataQueue } from "../services/metadataQueue";

export function App() {
  useEffect(() => {
    void runMetadataQueue();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}