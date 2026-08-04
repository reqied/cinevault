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
import {
  Favorite,
  Home,
  LocalMovies,
  Menu,
  Search,
  Settings,
  WatchLater,
} from "@mui/icons-material";
import { Link, Outlet } from "react-router";

const sidebarWidth = 240;

export function MainLayout() {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh",
      bgcolor: "background.default",
   }}>
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
        }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
          CineVault
        </Typography>

        <List>
          <ListItemButton component={Link} to="/">
            <ListItemIcon>
              <Home />
            </ListItemIcon>
            <ListItemText primary="Главная" />
          </ListItemButton>

          <ListItemButton component={Link} to="/library">
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

          <ListItemButton>
            <ListItemIcon>
              <Favorite />
            </ListItemIcon>
            <ListItemText primary="Избранное" />
          </ListItemButton>
        </List>

        <Divider sx={{ my: 2 }} />

        <ListItemButton component={Link} to="/settings">
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="Настройки" />
        </ListItemButton>
      </Box>

      <Box sx={{ ml: `${sidebarWidth}px`, width: "100%" }}>
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
              placeholder="Поиск фильмов и сериалов"
              sx={{ ml: 1, flex: 1 }}
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