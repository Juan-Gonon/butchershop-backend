import express, {type Application} from 'express';

interface Options {
  port: number
}

export class Server {

  public readonly app: Application = express();
  port: number;

  constructor({port}: Options){
    this.port = port;
  }

  start = async() => {

    this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  };

}