import app from "./app";
import { logger } from "./lib/logger";
import { startCampaignScheduler } from "./services/campaign-scheduler";

const rawPort = process.env["API_PORT"];

if (!rawPort) {
  throw new Error(
    "API_PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid API_PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startCampaignScheduler();
});
