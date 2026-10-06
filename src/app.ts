import { envs } from './config/envs.js';
import { Server } from './presentation/Server.js';
import { AppRouter } from './routers/routes.js';

;(async () => {
  await main();
})();

async function main() {
  const server = new Server({port: envs.PORT, publicPath: envs.PUBLIC_PATH, routes: AppRouter.router});
  server.start();
}
