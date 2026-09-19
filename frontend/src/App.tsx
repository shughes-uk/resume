import { GitHub } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import { useLocalStorage } from "usehooks-ts";
import React, { useEffect } from "react";
import { HomeView } from "./routes/Home";

const App = (): React.ReactElement => {
  const [hasSeenSourceTooltip, setHasSeenSourceTooltip] =
    useLocalStorage<boolean>("hasSeenSourceTooltip", false);
  useEffect(() => {
    if (!hasSeenSourceTooltip) {
      const timeoutId = setTimeout(() => {
        setHasSeenSourceTooltip(true);
      }, 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [hasSeenSourceTooltip, setHasSeenSourceTooltip]);
  return (
    <>
      <HomeView />
      <Tooltip
        open={hasSeenSourceTooltip ? undefined : true}
        title="Explore this project on GitHub!"
        arrow
      >
        <IconButton
          component="a"
          href="https://github.com/shughes-uk/resume"
          aria-label="Explore this project on GitHub"
          sx={{
            position: "fixed",
            bottom: "12px",
            right: "12px",
            zIndex: 9999,
          }}
        >
          <GitHub color="action" />
        </IconButton>
      </Tooltip>
    </>
  );
};

export default App;
