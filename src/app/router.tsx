import { createBrowserRouter } from "react-router";
import { MainLayout } from "../layouts/MainLayout";
import { HomePage } from "../pages/HomePage";
import { LibraryPage } from "../pages/LibraryPage";
import { MediaDetailsPage } from "../pages/MediaDetailsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { SeriesDetailsPage } from "../pages/SeriesDetailsPage";
import { WatchlistDetailsPage } from "../pages/WatchlistDetailsPage";
import { PlayerPage } from "../pages/PlayerPage";
import { SearchPage } from "../pages/SearchPage";

export const router = createBrowserRouter([
  {
    path: "/player",
    element: <PlayerPage />,
  },
  {
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/library",
        element: <LibraryPage />,
      },
      {
        path: "/search",
        element: <SearchPage />,
      },
      {
        path: "/media/details",
        element: <MediaDetailsPage />,
      },
      {
        path: "/series/details",
        element: <SeriesDetailsPage />,
      },
      {
        path: "/watchlist/details",
        element: <WatchlistDetailsPage />,
      },
      {
        path: "/settings",
        element: <SettingsPage />,
      },
    ],
  },
]);