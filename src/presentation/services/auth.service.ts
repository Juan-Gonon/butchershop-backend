import { BcryptAdapter } from '../../config/bcrypt.adapter.js';
import { prisma } from '../../data/postgres/index.js';
import { CreateUserDto } from '../../domain/Dtos/users/createUser.Dtos.js';

export class AuthService{
  //constructor(){}

  public async CreateUser(createUserDto: CreateUserDto){
    const {nombre, usuario, password, id_carniceria, id_rol, email } = createUserDto;
    // eslint-disable-next-line no-useless-catch
    try {
      const existUser = await prisma.usuarios.findUnique({
        where: {usuario}
      });

      if(existUser){
        throw new Error(`El nombre de usuario '${usuario}' ya está registrado`);
      }

      const passwordHash = BcryptAdapter.hash(password);

      const user = await prisma.usuarios.create({
        data:{
          nombre,
          usuario,
          password_hash: passwordHash,
          id_carniceria: BigInt(id_carniceria),
          id_rol: BigInt(id_rol),
          email: email || null
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {password_hash, ...userEntity} = user;

      return {
        user: userEntity
      };
      
    } catch (error) {
      throw error;
    }
  
  }
}