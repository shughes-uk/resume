import {
  GitHub,
  GroupRounded,
  LinkedIn,
  MailRounded,
  PhoneRounded,
} from "@mui/icons-material";
import {
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
} from "@mui/material";
import { CopyButton } from "./CopyButton";

export const ContactDetails = (): React.ReactElement => {
  return (
    <List dense>
      <ListItem secondaryAction={<CopyButton text="shughes.uk@gmail.com" />}>
        <ListItemIcon>
          <MailRounded />
        </ListItemIcon>
        <ListItemText
          primary={
            <Link href="mailto:shughes.uk@gmail.com">shughes.uk@gmail.com</Link>
          }
        />
      </ListItem>
      <ListItem secondaryAction={<CopyButton text="+1-512-909-9300" />}>
        <ListItemIcon>
          <PhoneRounded />
        </ListItemIcon>
        <ListItemText
          primary={<Link href="tel:+15129099300">+1-512-909-9300</Link>}
        />
      </ListItem>
      <ListItem>
        <ListItemIcon>
          <GroupRounded />
        </ListItemIcon>
        <ListItemIcon>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", justifyContent: "center" }}
          >
            <Link
              href="https://www.linkedin.com/in/samantha-hughes-2b8b7716"
              target="_blank"
              rel="noreferrer"
              sx={{ display: "flex", alignItems: "center" }}
            >
              <LinkedIn color="action" />
            </Link>
            <Link
              href="https://github.com/shughes-uk"
              target="_blank"
              rel="noreferrer"
              sx={{ display: "flex", alignItems: "center" }}
            >
              <GitHub color="action" />
            </Link>
          </Stack>
        </ListItemIcon>
      </ListItem>
    </List>
  );
};
