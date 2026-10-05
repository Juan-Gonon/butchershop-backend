import { Server } from './presentation/Server.js';

;(async () => {
  await main();
})();

async function main() {
  const server = new Server();
  server.start();
}
