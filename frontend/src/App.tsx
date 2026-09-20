import { GitHub } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import { useLocalStorage } from "usehooks-ts";
import React, { useEffect, useRef } from "react";
import { GardenFrame } from "./components/GardenFrame";
import { HomeView } from "./routes/Home";

const App = (): React.ReactElement => {
  const [hasSeenSourceTooltip, setHasSeenSourceTooltip] =
    useLocalStorage<boolean>("hasSeenSourceTooltip", false);
  const githubButton = useRef<HTMLAnchorElement>(null);
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
      <GardenFrame button={githubButton}>
        <HomeView />
      </GardenFrame>
      <Tooltip
        open={hasSeenSourceTooltip ? undefined : true}
        title="Explore this project on GitHub!"
        arrow
      >
        <IconButton
          component="a"
          ref={githubButton}
          href="https://github.com/shughes-uk/resume"
          aria-label="Explore this project on GitHub"
          sx={{
            position: "fixed",
            bottom: "12px",
            // Leaves room at the right edge for the jasmine drawn by
            // GardenFrame
            right: "52px",
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
