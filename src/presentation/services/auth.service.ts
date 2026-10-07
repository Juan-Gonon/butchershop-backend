import { BcryptAdapter } from '../../config/bcrypt.adapter.js';
import { prisma } from '../../data/postgres/index.js';
import { CreateUserDto } from '../../domain/Dtos/users/createUser.Dtos.js';
import { CustomError } from '../../domain/errors/custom.error.js';

export class AuthService{
  //constructor(){}

  public async CreateUser(createUserDto: CreateUserDto){
    const {nombre, usuario, password, id_carniceria, id_rol, email } = createUserDto;
     
    try {
      const [existUser, existCarniceria, existRol] = await Promise.all([
        prisma.usuarios.findUnique({
          where: {usuario}
        }),
        prisma.carnicerias.findUnique({
          where: {
            id: BigInt(id_carniceria)
          }
        }),
        prisma.roles.findUnique({
          where: {
            id: BigInt(id_rol)
          }
        })
      ]);

      if(existUser){
        throw CustomError.badRequest(`El nombre de usuario '${usuario}' ya está registrado`);
      }

      if(!existCarniceria){
        throw CustomError.notFound(`La carnicería con el id '${id_carniceria}' no existe`);
      }
      
      if(!existRol){
        throw CustomError.notFound(`El rol con el id '${id_rol}' no existe`);
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

      return userEntity;
      
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  
  }
}