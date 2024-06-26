import { ContentCopyRounded, LibraryAddCheck } from "@mui/icons-material";
import { Stack } from "@mui/material";
import { useSnackbar } from "notistack";
import { ReactElement, useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

export const CopyButton = ({ text }: { text: string }): ReactElement => {
  const [, setCopied] = useCopyToClipboard();
  const [recentlyCopied, setRecentlyCopied] = useState(false);
  const [currentTimeout, setCurrentTimeout] = useState<number | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const copyToClipboard = () => {
    setCopied(text);
    enqueueSnackbar("Copied to clipboard", { variant: "success" });
    setRecentlyCopied(true);
    if (currentTimeout) {
      clearTimeout(currentTimeout);
    }
    setCurrentTimeout(
      setTimeout(() => {
        setRecentlyCopied(false);
      }, 1500),
    );
  };
  const IconToUse = recentlyCopied ? LibraryAddCheck : ContentCopyRounded;
  return (
    <Stack alignItems="center">
      <IconToUse
        fontSize="small"
        onClick={copyToClipboard}
        sx={{
          cursor: "pointer",
        }}
      />
    </Stack>
  );
};
