import { GitHub } from "@mui/icons-material";
import { Link, Tooltip } from "@mui/material";
import { useLocalStorage } from "usehooks-ts";
import React, { useEffect } from "react";
import { HomeView } from "./routes/Home";

const App = (): React.ReactElement => {
  const [hasSeenSourceTooltip, setHasSeenSourceTooltip] =
    useLocalStorage<boolean>("hasSeenSourceTooltip", false);
  useEffect(() => {
    if (!hasSeenSourceTooltip) {
      setTimeout(() => {
        setHasSeenSourceTooltip(true);
      }, 5000);
    }
  });
  return (
    <>
      <HomeView />
      <Link component={Link} href="https://github.com/shughes-uk/resume">
        <Tooltip
          open={hasSeenSourceTooltip ? undefined : true}
          title="Explore this project on GitHub!"
          arrow
        >
          <GitHub
            color="action"
            sx={{
              position: "fixed",
              bottom: "20px",
              right: "20px",
              zIndex: 9999,
            }}
          />
        </Tooltip>
      </Link>
    </>
  );
};

export default App;
