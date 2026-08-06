import {
  Box,
  Divider,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import {
  Favorite,
  Home,
  LocalMovies,
  Menu,
  Search,
  Settings,
  WatchLater,
} from "@mui/icons-material";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";

const sidebarWidth = 240;

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState("");

  useEffect(() => {
    if (location.pathname !== "/search") {
      return;
    }

    const params = new URLSearchParams(
      location.search,
    );

    setQuery(params.get("q") ?? "");
  }, [location.pathname, location.search]);

  function handleSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      navigate("/search");
      return;
    }

    navigate(
      `/search?q=${encodeURIComponent(
        trimmedQuery,
      )}`,
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Box
        component="aside"
        sx={{
          width: sidebarWidth,
          position: "fixed",
          inset: 0,
          right: "auto",
          bgcolor: "background.paper",
          borderRight: "1px solid",
          borderColor: "divider",
          p: 2,
          zIndex: 20,
        }}
      >
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ mb: 3 }}
        >
          CineVault
        </Typography>

        <List>
          <ListItemButton component={Link} to="/">
            <ListItemIcon>
              <Home />
            </ListItemIcon>
            <ListItemText primary="Главная" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/library"
          >
            <ListItemIcon>
              <LocalMovies />
            </ListItemIcon>
            <ListItemText primary="Библиотека" />
          </ListItemButton>

          <ListItemButton>
            <ListItemIcon>
              <WatchLater />
            </ListItemIcon>
            <ListItemText primary="Продолжить просмотр" />
          </ListItemButton>

          <ListItemButton
          component={Link}
          to="/statistics"
        >
          <ListItemIcon>
            <BarChartIcon />
          </ListItemIcon>

          <ListItemText primary="Статистика" />
        </ListItemButton>
        </List>

        <Divider sx={{ my: 2 }} />

        <ListItemButton
          component={Link}
          to="/settings"
        >
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="Настройки" />
        </ListItemButton>
      </Box>

      <Box
        sx={{
          ml: `${sidebarWidth}px`,
          width: `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        <Box
          component="header"
          sx={{
            height: 72,
            px: 4,
            display: "flex",
            alignItems: "center",
            gap: 2,
            position: "sticky",
            top: 0,
            zIndex: 10,
            bgcolor: "background.default",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <IconButton>
            <Menu />
          </IconButton>

          <Paper
            component="form"
            onSubmit={handleSearch}
            sx={{
              display: "flex",
              alignItems: "center",
              width: 420,
              px: 2,
              py: 0.5,
            }}
          >
            <Search />

            <InputBase
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder="Поиск фильмов, сериалов и серий"
              sx={{
                ml: 1,
                flex: 1,
              }}
            />
          </Paper>
        </Box>

        <Box component="main" sx={{ p: 4 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}