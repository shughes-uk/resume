import { Grid, Stack, Typography } from "@mui/material";
import { GetInTouchCard } from "./GetInTouchCard";

export const HomeView = (): React.ReactElement => {
  return (
    <>
      <Grid
        container
        sx={{
          paddingTop: { xs: "50px", sm: "120px" },
          // Landscape phones are wide enough for `sm` but too short for it
          "@media (max-height: 500px)": { paddingTop: "8px" },
          margin: 0,
          justifyContent: "center",
          alignItems: "center",
        }}
        spacing={2}
      >
        <Grid size={{ md: 6 }} sx={{ minWidth: "fit-content" }}>
          <Typography
            variant={"h1"}
            sx={{
              fontWeight: "600",
              fontSize: (theme) => ({
                xs: "2rem",
                md: theme.typography.h1.fontSize,
              }),
            }}
          >
            Samantha Hughes
          </Typography>
          <Typography
            variant="h2"
            sx={{
              whiteSpace: "nowrap",
              fontSize: (theme) => ({
                xs: "1.5rem",
                md: theme.typography.h2.fontSize,
              }),
            }}
          >
            Full Stack Engineer
          </Typography>
        </Grid>
        <Grid
          size={{ md: 4 }}
          offset={{ sm: 0, md: 1 }}
          sx={{
            maxWidth: "500px",
            minWidth: "fit-content",
          }}
        >
          <Stack spacing={2}>
            <GetInTouchCard />
          </Stack>
        </Grid>
      </Grid>
    </>
  );
};
