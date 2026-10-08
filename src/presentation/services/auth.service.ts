import { BcryptAdapter } from '../../config/bcrypt.adapter.js';
import { JwtAdapter } from '../../config/jwt.adapter.js';
import { prisma } from '../../data/postgres/index.js';
import { CreateUserDto } from '../../domain/Dtos/users/createUser.Dtos.js';
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
        id: Number(user.id),
        id_carniceria: Number(user.id_carniceria),
        id_rol: Number(user.id_rol)
      });

      if(!token){
        throw CustomError.internalServer('Error al genera el JWT');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...userEntity } = user;

      return {
        user: userEntity,
        token
      };
    } catch (error) {
      if(error instanceof CustomError) throw error;

      CustomError.internalServer();
    }

  }

  public async renewToken(userId: number | string) {
    try {
      const user = await prisma.usuarios.findUnique({
        where: { id: BigInt(userId) }
      });

      if (!user) {
        throw CustomError.notFound('Usuario no encontrado');
      }

      if (!user.activo) {
        throw CustomError.unauthorized('Usuario inactivo');
      }

      // Generar un nuevo JWT
      const token = await JwtAdapter.generateToken({
        id: Number(user.id),
        id_carniceria: Number(user.id_carniceria),
        id_rol: Number(user.id_rol)
      });

      if (!token) {
        throw CustomError.internalServer('Error al renovar el token');
      }

      // Excluir el password_hash
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...userEntity } = user;

      return {
        user: userEntity,
        token
      };
      
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

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