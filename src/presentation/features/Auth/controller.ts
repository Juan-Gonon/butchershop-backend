import { Request, Response } from 'express';

export class AuthController {

  public loginUser = async (req: Request, res: Response) => {
    
    res.json({data: req.body});
  };

  public createUser = async(req: Request, res: Response) => {
    res.json({data: req.body});
  };

  public revalidateToken = async (req: Request, res: Response) => {
    res.json({data: 'Revalidate'});
  };
}