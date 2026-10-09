import { BcryptAdapter } from '../../config/bcrypt.adapter.js';
import { prisma } from '../../data/postgres/index.js';
import { CreateUserDto } from '../../domain/Dtos/users/createUser.Dtos.js';
import { CustomError } from '../../domain/errors/custom.error.js';
import { Role } from '../../domain/types/roles.enums.js';

export class UserService{

  public async getAllusers(){
    try {
      const users = prisma.usuarios.findMany({
        include: {
          carnicerias: {
            select: {
              nombre: true
            }
          },
          roles: {
            select: {
              nombre: true
            }
          }
        },
        omit: {
          password_hash: true
        }
      });
      
      return users;
      
    } catch (error) {
      if (error instanceof CustomError) throw error;

      throw CustomError.internalServer();
    }
  }
  
  public async CreateUser(createUserDto: CreateUserDto, creatorRoleId: number){
    const {nombre, usuario, password, id_carniceria, id_rol, email } = createUserDto;
    const targetRolId = Number(id_rol);
    try {

      // Si intenta asignar SUPER_ADMIN, el creador DEBE ser SUPER_ADMIN
      if (targetRolId === Role.SUPER_ADMIN && creatorRoleId !== Role.SUPER_ADMIN) {
        throw CustomError.forbidden('No tienes permisos para asignar el rol de Super Admin');
      }

      // Un ADMIN no puede asignarse roles de igual o mayor jerarquía que el suyo o crear Super Admins
      if (creatorRoleId !== Role.SUPER_ADMIN && targetRolId <= creatorRoleId) {
        throw CustomError.forbidden('No puedes crear usuarios con un rol igual o superior al tuyo');
      }
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