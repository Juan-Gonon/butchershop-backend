import { prisma } from '../../data/postgres/index.js';

export class AuthService{
  //constructor(){}

  public async testConection(){
    const roles = await prisma.roles.findMany();

    return roles;
  }
}