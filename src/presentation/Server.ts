import express, {Router, type Application} from 'express';
import helmet from 'helmet';
import cors from 'cors';

interface Options {
  port: number
  publicPath: string
  routes: Router
  allowedOrigins?: string[];
}

export class Server {

  public readonly app: Application = express();
  private readonly PORT: number;
  private readonly PUBLIC_PATH: string;
  private readonly routes: Router;
  private readonly allowedOrigins: string[];

  constructor({port, publicPath, routes, allowedOrigins = ['http://localhost:5173']}: Options){
    this.PORT = port;
    this.PUBLIC_PATH = publicPath;
    this.routes = routes;
    this.allowedOrigins = allowedOrigins;

    this.app.set('json replacer', (_key: string, value: unknown) =>
      typeof value === 'bigint' ? Number(value) : value
    );
  }

  start = async() => {

    // Seguridades globales (Helmet y CORS al inicio)
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || this.allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          return callback(new Error('No permitido por políticas de CORS'));
        },
        credentials: true
      })
    );

    // Archivos estaticos
    this.app.use(express.static(this.PUBLIC_PATH));

    // Middleware de parseo
    this.app.use(express.json());
    this.app.use(express.urlencoded({extended: true}));

    // Rutas de la app
    this.app.use(this.routes);

    this.app.listen(this.PORT, () => {
      console.log(`Server running on port ${this.PORT}`);
    });
  };

}