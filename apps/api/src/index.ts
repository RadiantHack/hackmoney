import { config } from "dotenv";
import { log } from "@openpay/logger";
import { createServer } from "./server";

config();

const port = process.env.PORT || 5001;
const server = createServer();

server.listen(port, () => {
  log(`api running on ${port}`);
});
