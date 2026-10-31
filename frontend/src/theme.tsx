import { createTheme } from "@mui/material";

declare module "@mui/material/styles" {
  interface Palette {
    gradient: Palette["background"];
  }
  interface PaletteOptions {
    gradient?: PaletteOptions["background"];
  }
}
export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#d8acff",
    },
    background: {
      default: "#281942",
      paper: "#281942",
    },
    gradient: {
      default:
        "linear-gradient(to right top, rgb(56, 67, 139), rgb(148, 75, 148), rgb(215, 90, 136), rgb(255, 126, 113), rgb(255, 178, 95), rgb(255, 235, 104))",
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        variant: "contained",
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        // MUI v9 dropped the default from 56px to 36px; keep the contact list layout
        root: { minWidth: 56 },
      },
    },
  },
});
