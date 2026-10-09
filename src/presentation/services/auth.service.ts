import { BcryptAdapter } from '../../config/bcrypt.adapter.js';
import { JwtAdapter } from '../../config/jwt.adapter.js';
import { prisma } from '../../data/postgres/index.js';
import { LoginUserDto } from '../../domain/Dtos/users/loginUser.Dtos.js';
import { CustomError } from '../../domain/errors/custom.error.js';

export class AuthService{
  //constructor(){}

  public async loginUser(loginUserDto: LoginUserDto){
    const { usuario, password } = loginUserDto;
    try {
      const user = await prisma.usuarios.findUnique({
        where: {
          usuario
        }
      });

      if(!user) throw CustomError.badRequest('Credenciales no válidas');
      if(!user.activo) throw CustomError.unauthorized('Usuario inactivo, contacte al administrador');

      const isMatching = BcryptAdapter.compare(password, user.password_hash);

      if(!isMatching) throw CustomError.badRequest('Credenciales no válidas');

      const token = await JwtAdapter.generateToken({
        uuid: user.uuid,
        id_carniceria: Number(user.id_carniceria),
        id_rol: Number(user.id_rol)
      });

      if(!token){
        throw CustomError.internalServer('Error al genera el JWT');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, password_hash, ...userEntity } = user;

      return {
        user: userEntity,
        token
      };
    } catch (error) {
      if(error instanceof CustomError) throw error;

      throw CustomError.internalServer();
    }

  }

  public async renewToken(userUuid: string) {
    try {
      const user = await prisma.usuarios.findUnique({
        where: { uuid: userUuid }
      });

      if (!user) {
        throw CustomError.notFound('Usuario no encontrado');
      }

      if (!user.activo) {
        throw CustomError.unauthorized('Usuario inactivo');
      }

      // Generar un nuevo JWT
      const token = await JwtAdapter.generateToken({
        uuid: user.uuid,
        id_carniceria: Number(user.id_carniceria),
        id_rol: Number(user.id_rol)
      });

      if (!token) {
        throw CustomError.internalServer('Error al renovar el token');
      }

      // Excluir el password_hash
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, password_hash, ...userEntity } = user;

      return {
        user: userEntity,
        token
      };
      
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

}