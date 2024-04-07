import {
  Button,
  Container,
  Link,
  Stack,
  Table,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import { CopyAll, GitHub, LinkedIn } from "@mui/icons-material";
import { useCopyToClipboard } from "usehooks-ts";
import { useSnackbar } from "notistack";

function App() {
  const [, copy] = useCopyToClipboard();
  const { enqueueSnackbar } = useSnackbar();
  const handleCopy = (text: string) => {
    copy(text);
    enqueueSnackbar("Copied to clipboard", { variant: "success" });
  };
  return (
    <div>
      <Container maxWidth={"sm"}>
        <Typography variant="h2" align="center" gutterBottom>
          Samantha Hughes
        </Typography>
        <Table>
          <TableRow>
            <TableCell>Email:</TableCell>
            <TableCell>
              <Link href="mailto:shughes.uk@gmail.com">
                shughes.uk@gmail.com
              </Link>
            </TableCell>
            <TableCell>
              <Button onClick={() => handleCopy("shughes.uk@gmail.com")}>
                <CopyAll />
              </Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Phone:</TableCell>
            <TableCell>
              <Link href="tel:+15129099300">+1-512-909-9300</Link>
            </TableCell>
            <TableCell>
              <Button onClick={() => handleCopy("+1-512-909-9300")}>
                <CopyAll />
              </Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Social:</TableCell>
            <TableCell sx={{ alignContent: "center" }}>
              <Stack direction="row" spacing={1} alignItems={"center"}>
                <Link
                  href="https://www.linkedin.com/in/samantha-hughes-2b8b7716"
                  target="_blank"
                  rel="noreferrer"
                >
                  <LinkedIn />
                </Link>
                <Link
                  href="https://github.com/shughes-uk"
                  target="_blank"
                  rel="noreferrer"
                >
                  <GitHub htmlColor="black" />
                </Link>
              </Stack>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Link
                href="https://calendly.com/shughes-uk/30min"
                target="_blank"
                rel="noreferrer"
              >
                Schedule a call
              </Link>
            </TableCell>
          </TableRow>
        </Table>
      </Container>
    </div>
  );
}

export default App;
