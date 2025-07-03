import {
  AppBar,
  Avatar,
  Box,
  Container,
  Divider,
  Drawer,
  Grid2,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { NavLink, Outlet } from "react-router-dom";
import { UserContext } from "../components/context/user";
import { useContext, useRef, useState } from "react";
import { AuthContext } from "../components/context/auth";
import {
  DoubleArrowRounded,
  Home,
  SpatialAudioOffRounded,
} from "@mui/icons-material";
import { URLS } from "../urls";

const drawerWidth = 200;

type NavItemType = {
  text: string;
  icon: React.ReactElement;
  link: string;
};

const NavItems: NavItemType[] = [
  {
    text: "Home",
    icon: <Home />,
    link: URLS.Home,
  },
];

export const MainLayout = (): React.ReactElement => {
  const {
    user: { avatarUrl, email },
  } = useContext(UserContext);
  const { logout } = useContext(AuthContext);
  const anchorEl = useRef(null);
  const [open, setOpen] = useState(false);
  return (
    <Box
      sx={{
        background: (theme) => theme.palette.background.default,
        minHeight: "100dvh",
        display: "flex",
      }}
    >
      <AppBar
        position="fixed"
        sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}
      >
        <Toolbar>
          <Grid2 container width={1} wrap="nowrap">
            <Grid2>
              <Stack direction="row" alignItems={"center"} spacing={1}>
                <Typography variant="h5" noWrap sx={{ fontWeight: 900 }}>
                  Samantha Hughes
                </Typography>{" "}
                <DoubleArrowRounded fontSize="small" />
                <Typography variant="h6" noWrap>
                  Full Stack Engineer
                </Typography>
              </Stack>
            </Grid2>
            <Grid2 offset={{ xs: "auto" }}>
              <IconButton
                sx={{ padding: 0 }}
                ref={anchorEl}
                onClick={() => setOpen(true)}
              >
                <Avatar src={avatarUrl}></Avatar>
              </IconButton>
              <Menu
                open={open}
                anchorEl={anchorEl.current}
                onClose={() => setOpen(false)}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
              >
                <MenuItem disabled>{email}</MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    logout();
                  }}
                >
                  Logout
                </MenuItem>
              </Menu>
            </Grid2>
          </Grid2>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar sx={{ display: "flex", justifyContent: "center" }}>
          <Typography variant="h6" noWrap component="div">
            <SpatialAudioOffRounded fontSize="large" />
          </Typography>
        </Toolbar>
        <Divider />
        <List disablePadding>
          {NavItems.map((item) => {
            return (
              <NavLink
                to={item.link}
                key={item.link}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {({ isActive }) => (
                  <ListItemButton selected={isActive} key={item.text}>
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                )}
              </NavLink>
            );
          })}
        </List>
      </Drawer>
      <Paper
        sx={{
          flexGrow: 1,
          background: (theme) => theme.palette.gradient.default,
        }}
      >
        <Container>
          <Toolbar sx={{ mb: 2 }} />
          <Outlet />
        </Container>
      </Paper>
    </Box>
  );
};
