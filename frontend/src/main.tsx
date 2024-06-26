import { CssBaseline, ThemeProvider } from "@mui/material";
import { SnackbarProvider } from "notistack";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { theme } from "./theme.tsx";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { LoginView } from "./routes/Login/index.tsx";
import { HomeView } from "./routes/Home/index.tsx";
import { AuthenticatedRoute } from "./routes/protected.tsx";
import { GithubCallback } from "./routes/Login/GithubAuth.tsx";
import { URLS } from "./urls.ts";
import { MainLayout } from "./layouts/Main.tsx";
import { initAnalytics } from "./analytics.ts";

initAnalytics();
const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: URLS.Login,
        element: <LoginView />,
      },
      {
        path: URLS.GithubCallback,
        element: <GithubCallback />,
      },
      {
        path: "/",
        element: <AuthenticatedRoute />,
        children: [
          {
            path: "/",
            element: <MainLayout />,
            children: [
              {
                path: URLS.Home,
                element: <HomeView />,
              },
            ],
          },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <SnackbarProvider>
            <RouterProvider router={router} />
          </SnackbarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
