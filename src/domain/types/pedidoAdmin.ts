import { Prisma } from '../../generated/prisma/client.js';

export const pedidoAdminInclude = {
  clientes: { select: { uuid: true, nombre: true, telefono: true } },
  estados_pedido: { select: { nombre: true } },
  tipos_entrega: { select: { nombre: true } },
  direcciones_envio_carniceria: { select: { nombre_sector: true } },
  detalle_pedidos: {
    include: {
      productos_carniceria: {
        include: {
          productos_catalogo: { select: { nombre: true } },
          unidades_venta: { select: { abreviatura: true } }
        }
      },
      tipos_preparacion: { select: { nombre: true } }
    }
  }
} satisfies Prisma.pedidosInclude;

export type PedidoAdmin = Prisma.pedidosGetPayload<{ include: typeof pedidoAdminInclude }>;