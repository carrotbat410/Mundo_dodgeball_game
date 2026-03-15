import { createGameServer } from "./server";
import { env } from "./config/env";

const { httpServer } = createGameServer();

httpServer.listen(env.port, () => {
  console.log(`Mundo game server listening on port ${env.port}`);
});
