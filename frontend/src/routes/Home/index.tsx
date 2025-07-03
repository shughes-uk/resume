import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Divider,
  Grid2,
  Stack,
  Typography,
} from "@mui/material";
import ResumeThumbnail from "../../assets/resume-thumbnail.png";
import MeetingThumbnail from "../../assets/meeting-thumbnail.png";
import GithubThumbnail from "../../assets/github-thumbnail.png";

import { CalendarMonth, GitHub } from "@mui/icons-material";
import { ContactDetails } from "../../components/contact";
import { useContext } from "react";
import { UserContext } from "../../components/context/user";

const GithubCard = (): React.ReactElement => {
  return (
    <Card elevation={10}>
      <CardMedia src={GithubThumbnail} component="img" />
      <CardActions>
        <Button
          variant="contained"
          href="https://github.com/shughes-uk/resume"
          target="_blank"
          startIcon={<GitHub />}
        >
          Inspect the code
        </Button>
      </CardActions>
    </Card>
  );
};

const ContactCard = (): React.ReactElement => {
  return (
    <Card elevation={10}>
      <CardHeader title="Contact" />
      <Divider />
      <CardContent>
        <Stack direction="row" spacing={2}>
          <Avatar
            src="https://lh3.googleusercontent.com/a/ACg8ocLHF0AVVg5tDNTvWsUXqWZVvDU5qx0iPRcn0jONuWMtNxUrI03CDA=s96-c"
            sx={{ width: 100, height: 100 }}
          />
          <Box>
            <ContactDetails />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

const BookMeetingCard = (): React.ReactElement => {
  return (
    <Card elevation={10}>
      <CardMedia src={MeetingThumbnail} component="img" />
      <CardActions>
        <Button
          variant="contained"
          href="https://calendly.com/samanthahughes"
          target="_blank"
          startIcon={<CalendarMonth />}
        >
          {"Book a meeting"}
        </Button>
      </CardActions>
    </Card>
  );
};

const ResumeCard = (): React.ReactElement => {
  return (
    <Card elevation={10}>
      <CardMedia src={ResumeThumbnail} component="img" />
      <CardActions>
        <Button
          variant="contained"
          href="/Samantha_Hughes_Resume.pdf"
          download
          target="_blank"
        >
          PDF Document (.pdf)
        </Button>
        <Button
          variant="contained"
          href="/Samantha_Hughes_Resume.docx"
          download
          target="_blank"
        >
          Microsoft Word (.docx)
        </Button>
      </CardActions>
    </Card>
  );
};

export const HomeView = (): React.ReactElement => {
  const { user } = useContext(UserContext);
  return (
    <Stack spacing={2}>
      <Typography variant="h2" sx={{ fontWeight: "600" }}>
        Hello there{user.firstName ? ` ${user.firstName}` : ""}! 👋
      </Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: "500" }}>
        This little demo site is intended as a simple showcase of skills.
      </Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: "500" }}>
        Have a look at the source code to see how {"it's"} done!
      </Typography>
      <Divider />
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 4 }} sx={{ minWidth: "450px" }}>
          <ResumeCard />
        </Grid2>
        <Grid2 size={{ xs: 4 }} sx={{ minWidth: "450px" }}>
          <BookMeetingCard />
        </Grid2>
        <Grid2 size={{ xs: 4 }} sx={{ minWidth: "450px" }}>
          <GithubCard />
        </Grid2>
        <Grid2 size={{ xs: 4 }} sx={{ minWidth: "450px" }}>
          <ContactCard />
        </Grid2>
      </Grid2>
    </Stack>
  );
};
