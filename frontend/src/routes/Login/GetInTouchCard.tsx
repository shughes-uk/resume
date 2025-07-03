import { Download } from "@mui/icons-material";
import {
  Button,
  Card,
  CardContent,
  Divider,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { useRef, useState } from "react";
import { ContactDetails } from "../../components/contact";

export const GetInTouchCard = (): React.ReactElement => {
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadMenuAnchorRef = useRef(null);
  return (
    <Card elevation={10}>
      <CardContent>
        <Stack spacing={1}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
          >
            Get In Touch
          </Typography>
          <Divider />
          <ContactDetails />
          <Button
            size="small"
            variant="outlined"
            ref={downloadMenuAnchorRef}
            onClick={() => setIsDownloadMenuOpen(true)}
          >
            Download Resume
          </Button>
          <Menu
            open={isDownloadMenuOpen}
            onClose={() => setIsDownloadMenuOpen(false)}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            anchorEl={downloadMenuAnchorRef.current}
            keepMounted
          >
            <MenuItem
              component={Link}
              href={"/Samantha_Hughes_Resume.docx"}
              download
              target="_blank"
              onClick={() => setIsDownloadMenuOpen(false)}
            >
              <ListItemIcon>
                <Download />
              </ListItemIcon>
              <ListItemText primary="Microsoft Word (.docx)" />
            </MenuItem>
            <MenuItem
              component={Link}
              href={"/Samantha_Hughes_Resume.pdf"}
              download
              target="_blank"
              onClick={() => setIsDownloadMenuOpen(false)}
            >
              <ListItemIcon>
                <Download />
              </ListItemIcon>
              <ListItemText primary="PDF Document (.pdf)" />
            </MenuItem>
          </Menu>
          <Button
            component={Link}
            size="small"
            variant="contained"
            href="https://calendly.com/shughes-uk/60-min-chat"
            target="_blank"
            rel="noreferrer"
          >
            Schedule a call
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};
