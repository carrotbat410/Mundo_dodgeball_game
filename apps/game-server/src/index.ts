import { createGameServer } from "./server.js";
import { env } from "./config/env.js";

const { httpServer } = createGameServer();

httpServer.listen(env.port, () => {
  console.log(`Mundo game server listening on port ${env.port}`);
});
