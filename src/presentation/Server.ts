import express, {type Application} from 'express';

export class Server {

  public readonly app: Application = express();

  start = async() => {

    this.app.listen(3000, () => {
      console.log('Server running on port 3000');
    });
  };

}