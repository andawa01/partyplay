import "dotenv/config";

import { createApp } from "./app";
import { ensureClient } from "./config/db";

const PORT = Number(process.env.PORT ?? 4000);

// Ensure the database is connected before we start listening for traffic.
ensureClient()
  .then(() => {
    createApp().listen(PORT, () => {
      console.log(`PartyPlay API listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
