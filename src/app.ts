import { envs } from './config/envs.js';
import { Server } from './presentation/Server.js';

;(async () => {
  await main();
})();

async function main() {
  const server = new Server({port: envs.PORT});
  server.start();
}
