import express, {Router, type Application} from 'express';

interface Options {
  port: number
  publicPath: string
  routes: Router
}

export class Server {

  public readonly app: Application = express();
  private readonly PORT: number;
  private readonly PUBLIC_PATH: string;
  private readonly routes: Router;

  constructor({port, publicPath, routes}: Options){
    this.PORT = port;
    this.PUBLIC_PATH = publicPath;
    this.routes = routes;
  }

  start = async() => {

    this.app.listen(this.PORT, () => {
      console.log(`Server running on port ${this.PORT}`);
    });
  };

}