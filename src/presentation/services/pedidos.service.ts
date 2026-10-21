import { prisma } from '../../data/postgres/index.js';
import { CreatePedidoDto } from '../../domain/Dtos/pedidos/createPedidos.dto.js';
import { CustomError } from '../../domain/errors/custom.error.js';
import { VolumenPorTipoCarne, VolumenPorUnidad } from '../../domain/interfaces/pedidos.interface.js';
import { StatePedido } from '../../domain/types/statePedidos.enum.js';
import { ListPedidosDto } from '../../domain/Dtos/pedidos/getPedidos.dto.js';
import { ChangePedidoStateDto } from '../../domain/Dtos/pedidos/changePedidoState.dto.js';
import { UpdatePedidoDetailsDto } from '../../domain/Dtos/pedidos/updatePedidoDetails.dto.js';
import type { PedidoDetailsEditor } from '../../domain/interfaces/pedidos.interface.js';
import { PedidoAdmin, pedidoAdminInclude } from '../../domain/types/pedidoAdmin.js';
import { consolidatePedidoLines, sumDecimalValues } from '../../domain/types/pedidoLineConsolidation.js';
import { Prisma } from '../../generated/prisma/client.js';
import { isPedidoStateTransitionAllowed } from '../../domain/types/pedidoStateTransitions.js';

export class PedidoService implements PedidoDetailsEditor {
  public async updatePedidoDetails(
    _idCarniceria: number,
    _pedidoUuid: string,
    _dto: UpdatePedidoDetailsDto
  ): Promise<never> {
    throw CustomError.notImplemented(
      'La edición de pedidos requiere el soporte transaccional y de esquema pendiente'
    );
  }

  private calculateDateRange(periodo: string) {
    const periodoLimpio = ['hoy', 'ayer', 'semana', 'mes'].includes(periodo) ? periodo : 'hoy';

    const ahora = new Date();
    const fechaInicio = new Date();
    let fechaFin = new Date();

    fechaFin.setHours(23, 59, 59, 999); // El fin siempre es el final del día actual

    if (periodoLimpio === 'ayer') {
      fechaInicio.setDate(ahora.getDate() - 1);
      fechaInicio.setHours(0, 0, 0, 0);
      
      fechaFin = new Date(fechaInicio);
      fechaFin.setHours(23, 59, 59, 999);
    } else if (periodoLimpio === 'semana') {
      // Últimos 7 días incluyendo hoy
      fechaInicio.setDate(ahora.getDate() - 6);
      fechaInicio.setHours(0, 0, 0, 0);
    } else if (periodoLimpio === 'mes') {
      // Primer día del mes actual o últimos 30 días (aquí usamos el primer día del mes actual)
      fechaInicio.setDate(1);
      fechaInicio.setHours(0, 0, 0, 0);
    } else {
      // Por defecto 'hoy'
      fechaInicio.setHours(0, 0, 0, 0);
    }

    return {
      fechaInicio,
      fechaFin
    };
  }

  private async getVolumenDesp(fechaInicio:Date, fechaFin:Date, id_carniceria:number){
    return await prisma.$queryRaw<VolumenPorUnidad[]>`
        SELECT 
            u.nombre AS unidad_venta,
            u.abreviatura,
            SUM(dp.cantidad) AS total_volumen_o_cantidad
        FROM pedidos p
        INNER JOIN detalle_pedidos dp ON p.id = dp.id_pedido
        INNER JOIN productos_carniceria pc ON dp.id_producto_carniceria = pc.id
        INNER JOIN unidades_venta u ON pc.id_unidad_venta = u.id
        WHERE p.id_carniceria = ${id_carniceria}
          AND p.id_estado = ${StatePedido.ENTREGADO}
          AND p.fecha >= ${fechaInicio}
          AND p.fecha <= ${fechaFin}
        GROUP BY u.id, u.nombre, u.abreviatura;
      `;

  }

  private async getTotalBilling(fechaInicio:Date, fechaFin:Date, id_carniceria:number){
    const resultado = await prisma.pedidos.aggregate({
      _sum: {
        total: true // Suma el campo total de los pedidos
      },
      where: {
        id_carniceria: id_carniceria,
        id_estado: StatePedido.ENTREGADO, // Entregado
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    });

    return resultado._sum.total || 0;
  }

  private async getQuantityPreparation(fechaInicio:Date, fechaFin:Date, id_carniceria:number){
    const resultado = await prisma.pedidos.aggregate({
      _count: {
        id: true
      },
      where: {
        id_carniceria: id_carniceria,
        id_estado: StatePedido.EN_PREPARACION,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    });

    return resultado._count.id || 0;
  }

  private async getQuantityConfirmed(fechaInicio:Date, fechaFin:Date, id_carniceria:number){
    const resultado = await prisma.pedidos.aggregate({
      _count: {
        id: true
      },
      where: {
        id_carniceria: id_carniceria,
        id_estado: StatePedido.CONFIRMADO,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    });

    return resultado._count.id || 0;
  }

  public async getMetrics(uuid: string, id_carniceria: number, filtro: string){
    try {

      const {fechaInicio, fechaFin } = this.calculateDateRange(filtro);

      const [volume, total, quantityPreparation, quantityConfirmed ] = await Promise.all([
        this.getVolumenDesp(fechaInicio, fechaFin, id_carniceria),
        this.getTotalBilling(fechaInicio, fechaFin, id_carniceria),
        this.getQuantityPreparation(fechaInicio, fechaFin, id_carniceria),
        this.getQuantityConfirmed(fechaInicio, fechaFin, id_carniceria)
      ]);

      return {
        id_carniceria,
        filtro_aplicado: filtro,
        desde: fechaInicio,
        hasta: fechaFin,
        volume,
        total,
        quantityPreparation,
        quantityConfirmed
      };
      
    } catch (error) {
      if(error instanceof CustomError) throw error;
      
      throw CustomError.internalServer();
    }
  }
  public async getVolumenDespachoPorTipoCarne(id_carniceria: number, periodo: string, unidad: string) {
    try {
      const { fechaInicio, fechaFin } = this.calculateDateRange(periodo);

      // Ejecutar consulta SQL agrupada por Tipo de Carne
      const resultado = await prisma.$queryRaw<VolumenPorTipoCarne[]>`
        SELECT 
            tc.id AS tipo_carne_id,
            tc.nombre AS tipo_carne_nombre,
            SUM(dp.cantidad) AS total_libras
        FROM pedidos p
        INNER JOIN detalle_pedidos dp ON p.id = dp.id_pedido
        INNER JOIN productos_carniceria pc ON dp.id_producto_carniceria = pc.id
        INNER JOIN productos_catalogo cat ON pc.id_producto_catalogo = cat.id
        INNER JOIN categorias c ON cat.id_categoria = c.id
        INNER JOIN tipos_carne tc ON c.id_tipo_carne = tc.id
        WHERE p.id_carniceria = ${id_carniceria}
          AND p.id_estado = ${StatePedido.ENTREGADO}
          AND p.fecha >= ${fechaInicio}
          AND p.fecha <= ${fechaFin}
        GROUP BY tc.id, tc.nombre;
      `;

      // Calcular el volumen global para sacar los porcentajes
      let volumenGlobal = 0;
      const datosProcesados = resultado.map(item => {
        let cantidad = Number(item.total_libras) || 0;
        
        // libras a kg (1 kg = 2.20462 lb)
        if (unidad === 'kg') {
          cantidad = cantidad / 2.20462;
        }

        volumenGlobal += cantidad;
        return {
          tipo_carne_id: item.tipo_carne_id,
          tipo_carne_nombre: item.tipo_carne_nombre,
          cantidad: Number(cantidad.toFixed(2))
        };
      });

      // Agregar el porcentaje exacto a cada tipo de carne para la barra de progreso
      const desgloseConPorcentaje = datosProcesados.map(item => {
        const porcentaje = volumenGlobal > 0 ? (item.cantidad / volumenGlobal) * 100 : 0;
        return {
          ...item,
          porcentaje: Number(porcentaje.toFixed(1)) // Ej. 75.5%
        };
      });

      return {
        id_carniceria,
        periodo_aplicado: periodo,
        unidad_medida: unidad,
        desde: fechaInicio,
        hasta: fechaFin,
        volumen_total_general: Number(volumenGlobal.toFixed(2)),
        desglose: desgloseConPorcentaje
      };

    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

  public async getLivePedidos(id_carniceria: number) {
    try {
      const pedidosLive = await prisma.pedidos.findMany({
        where: {
          id_carniceria,
          id_estado: {
            in: [StatePedido.CONFIRMADO, StatePedido.EN_PREPARACION, StatePedido.EN_CAMINO] 
          }
        },
        include: {
          clientes: {
            select: { nombre: true, telefono: true }
          },
          estados_pedido: {
            select: { nombre: true }
          },
          tipos_entrega: {
            select: { nombre: true }
          },
          detalle_pedidos: {
            include: {
              productos_carniceria: {
                include: {
                  productos_catalogo: { select: { nombre: true } },
                  unidades_venta: { select: { abreviatura: true } }
                }
              },
              tipos_preparacion: { select: { nombre: true, descripcion: true } }
            }
          }
        },
        orderBy: {
          fecha: 'asc' 
        },
        take: 10
      });
     
      return pedidosLive.map(p => ({
        uuid: p.uuid,
        id_pedido: p.id.toString(),
        cliente: p.clientes.nombre,
        canal_origen: p.canal_origen,
        tipo_entrega: p.tipos_entrega.nombre,
        estado: p.estados_pedido.nombre,
        fecha: p.fecha,
        total: p.total.toString(),
        detalles: p.detalle_pedidos.map(dp => ({
          cantidad: dp.cantidad.toString(),
          unidad: dp.productos_carniceria.unidades_venta.abreviatura,
          producto: dp.productos_carniceria.productos_catalogo.nombre,
          preparacion: dp.tipos_preparacion?.nombre || null,
          observaciones: dp.observaciones
        }))
      }));

    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

  private serializarPedido(pedido: PedidoAdmin) {
    return {
      uuid: pedido.uuid,
      id_pedido: pedido.id.toString(),
      canal_origen: pedido.canal_origen,
      fecha: pedido.fecha.toISOString(),
      estado: pedido.estados_pedido.nombre,
      tipo_entrega: pedido.tipos_entrega.nombre,
      costo_envio: pedido.costo_envio.toString(),
      total: pedido.total.toString(),
      cliente: {
        uuid: pedido.clientes.uuid,
        nombre: pedido.clientes.nombre,
        telefono: pedido.clientes.telefono
      },
      direccion_envio: pedido.direcciones_envio_carniceria
        ? pedido.direcciones_envio_carniceria.nombre_sector
        : null,
      detalles: pedido.detalle_pedidos.map((detalle) => ({
        id_detalle_pedido: detalle.id.toString(),
        cantidad: detalle.cantidad.toString(),
        precio_unitario: detalle.precio_unitario.toString(),
        subtotal: detalle.subtotal.toString(),
        observaciones: detalle.observaciones,
        producto: detalle.productos_carniceria.productos_catalogo.nombre,
        unidad: detalle.productos_carniceria.unidades_venta.abreviatura,
        preparacion: detalle.tipos_preparacion?.nombre ?? null
      }))
    };
  }

  public async listPedidos(id_carniceria: number, dto: ListPedidosDto) {
    try {
      const where: Prisma.pedidosWhereInput = {
        id_carniceria: BigInt(id_carniceria),
        ...(dto.estado ? { estados_pedido: { is: { nombre: dto.estado } } } : {}),
        ...(dto.cliente_uuid ? { clientes: { is: { uuid: dto.cliente_uuid } } } : {}),
        ...(dto.desde || dto.hasta
          ? {
            fecha: {
              ...(dto.desde ? { gte: dto.desde } : {}),
              ...(dto.hasta ? { lte: dto.hasta } : {})
            }
          }
          : {})
      };

      const skip = (dto.page - 1) * dto.pageSize;
      const [pedidos, total] = await Promise.all([
        prisma.pedidos.findMany({
          where,
          include: pedidoAdminInclude,
          orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
          skip,
          take: dto.pageSize
        }),
        prisma.pedidos.count({ where })
      ]);

      return {
        items: pedidos.map((pedido) => this.serializarPedido(pedido)),
        pagination: {
          page: dto.page,
          pageSize: dto.pageSize,
          total,
          totalPages: Math.ceil(total / dto.pageSize)
        }
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

  public async getPedidoByUuid(id_carniceria: number, uuid: string) {
    try {
      const pedido = await prisma.pedidos.findFirst({
        where: {
          uuid,
          id_carniceria: BigInt(id_carniceria)
        },
        include: pedidoAdminInclude
      });

      if (!pedido) throw CustomError.notFound('Pedido no encontrado');
      return this.serializarPedido(pedido);
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

  public async changePedidoState(
    id_carniceria: number,
    uuid: string,
    dto: ChangePedidoStateDto
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        const pedido = await tx.pedidos.findFirst({
          where: {
            uuid,
            id_carniceria: BigInt(id_carniceria)
          },
          select: {
            id_estado: true,
            estados_pedido: { select: { nombre: true } },
            tipos_entrega: { select: { nombre: true } }
          }
        });

        if (!pedido) throw CustomError.notFound('Pedido no encontrado');

        if (pedido.estados_pedido.nombre !== dto.estado_actual_esperado) {
          throw CustomError.conflict('El pedido ya no está en el estado esperado; vuelve a consultarlo');
        }

        if (!isPedidoStateTransitionAllowed(
          pedido.estados_pedido.nombre as Parameters<typeof isPedidoStateTransitionAllowed>[0],
          dto.estado_destino,
          pedido.tipos_entrega.nombre
        )) {
          throw CustomError.conflict('La transición solicitada no está permitida para el pedido');
        }

        const estadoDestino = await tx.estados_pedido.findUnique({
          where: { nombre: dto.estado_destino },
          select: { id: true }
        });

        if (!estadoDestino) {
          throw CustomError.internalServer('El estado destino no está configurado');
        }

        const updateResult = await tx.pedidos.updateMany({
          where: {
            uuid,
            id_carniceria: BigInt(id_carniceria),
            id_estado: pedido.id_estado
          },
          data: { id_estado: estadoDestino.id }
        });

        if (updateResult.count === 0) {
          const pedidoActual = await tx.pedidos.findFirst({
            where: { uuid, id_carniceria: BigInt(id_carniceria) },
            select: { id: true }
          });

          if (!pedidoActual) throw CustomError.notFound('Pedido no encontrado');
          throw CustomError.conflict('El pedido cambió concurrentemente; vuelve a consultarlo');
        }

        const pedidoActualizado = await tx.pedidos.findFirst({
          where: { uuid, id_carniceria: BigInt(id_carniceria) },
          include: pedidoAdminInclude
        });

        if (!pedidoActualizado) throw CustomError.notFound('Pedido no encontrado');
        return this.serializarPedido(pedidoActualizado);
      });
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

  public async createPedidoPos(id_carniceria: number, dto: CreatePedidoDto) {
    try {
      const productosConsolidados = consolidatePedidoLines(dto.productos);
      if (productosConsolidados.some((item) => item.cantidad > 300)) {
        throw CustomError.badRequest('La cantidad consolidada de un producto excede el límite permitido por venta');
      }

      // Validar Cliente y Tenant
      const cliente = await prisma.clientes.findFirst({
        where: {
          uuid: dto.cliente_uuid,
          id_carniceria: BigInt(id_carniceria)
        }
      });

      if (!cliente) {
        throw CustomError.badRequest('El cliente especificado no existe o no pertenece a esta carnicería');
      }

      // Validar Tipo de Entrega
      const tipoEntrega = await prisma.tipos_entrega.findUnique({
        where: { id: BigInt(dto.id_tipo_entrega) }
      });

      if (!tipoEntrega) {
        throw CustomError.badRequest('El tipo de entrega especificado no existe');
      }

      // Normalizar nombre de la entrega para evaluación limpia
      const nombreEntregaLower = tipoEntrega.nombre.toLowerCase();
      const esDomicilio = nombreEntregaLower.includes('domicilio');

      let costoEnvioReal = 0;
      let direccionEnvioIdBigInt: bigint | null = null;

      // Regla de Negocio Estricta para Entrega
      if (esDomicilio) {
        if (!dto.id_direccion_envio) {
          throw CustomError.badRequest('Para entregas a domicilio es obligatorio seleccionar una dirección de envío');
        }

        const direccion = await prisma.direcciones_envio_carniceria.findFirst({
          where: {
            id: BigInt(dto.id_direccion_envio),
            id_carniceria: BigInt(id_carniceria),
            activo: true
          }
        });

        if (!direccion) {
          throw CustomError.badRequest('La dirección de envío seleccionada no existe, está inactiva o no pertenece a esta carnicería');
        }

        costoEnvioReal = Number(direccion.costo_envio);
        direccionEnvioIdBigInt = direccion.id;
      } else {
        // En tienda / Recoger: Forzar dirección nula y costo 0
        costoEnvioReal = 0;
        direccionEnvioIdBigInt = null;
      }

      // Validar Tipos de Preparación Enviados
      const prepIds = Array.from(
        new Set(productosConsolidados.map((p) => p.id_tipo_preparacion).filter((id): id is number => id !== null && id !== undefined))
      );

      if (prepIds.length > 0) {
        const prepDbCount = await prisma.tipos_preparacion.count({
          where: {
            id: { in: prepIds.map((id) => BigInt(id)) },
            activo: true
          }
        });

        if (prepDbCount !== prepIds.length) {
          throw CustomError.badRequest('Uno o más tipos de preparación seleccionados no son válidos o están inactivos');
        }
      }

      // Validar Productos y Pertenencia al Tenant
      const productIds = Array.from(new Set(productosConsolidados.map((p) => BigInt(p.id_producto_carniceria))));

      const productosDb = await prisma.productos_carniceria.findMany({
        where: {
          id: { in: productIds },
          id_carniceria: BigInt(id_carniceria) // Multi-Tenant Security
        },
        include: {
          productos_catalogo: true
        }
      });

      if (productosDb.length !== productIds.length) {
        throw CustomError.badRequest('Uno o más productos no existen o no pertenecen a esta carnicería');
      }

      const productMap = new Map(productosDb.map((p) => [p.id.toString(), p]));

      // Agrupar Cantidades Totales por Producto para la Validación de Inventario Atómico
      const requerimientosStockMap = new Map<string, number>();

      for (const item of productosConsolidados) {
        const prodIdStr = item.id_producto_carniceria.toString();
        const prodDb = productMap.get(prodIdStr)!;

        if (!prodDb.disponible) {
          const nombreProd = prodDb.productos_catalogo?.nombre || `ID ${prodDb.id}`;
          throw CustomError.badRequest(`El producto ${nombreProd} no está disponible para la venta`);
        }

        if (prodDb.maneja_inventario) {
          if (prodDb.stock_actual === null) {
            const nombreProd = prodDb.productos_catalogo?.nombre || `ID ${prodDb.id}`;
            throw CustomError.badRequest(`El producto ${nombreProd} maneja inventario pero no tiene stock inicial configurado`);
          }

          const acumulado = requerimientosStockMap.get(prodIdStr) || 0;
          requerimientosStockMap.set(prodIdStr, sumDecimalValues([acumulado, item.cantidad]));
        }
      }

      // Calcular Totales con Redondeo Preciso
      let totalProductosCalculado = 0;
      const detallesParaInsertar: {
        id_producto_carniceria: bigint;
        id_tipo_preparacion: bigint | null;
        cantidad: number;
        precio_unitario: number;
        subtotal: number;
        observaciones: string | null;
        maneja_inventario_en_base: boolean;
      }[] = [];

      for (const item of productosConsolidados) {
        const prodDb = productMap.get(item.id_producto_carniceria.toString())!;
        const precioUnitarioReal = Number(prodDb.precio);
        
        // Redondeo exacto a 2 decimales para evitar imprecisiones flotantes
        const subtotalCalculado = Math.round((precioUnitarioReal * item.cantidad) * 100) / 100;
        totalProductosCalculado += subtotalCalculado;

        detallesParaInsertar.push({
          id_producto_carniceria: prodDb.id,
          id_tipo_preparacion: item.id_tipo_preparacion ? BigInt(item.id_tipo_preparacion) : null,
          cantidad: item.cantidad,
          precio_unitario: precioUnitarioReal,
          subtotal: subtotalCalculado,
          observaciones: item.observaciones,
          maneja_inventario_en_base: prodDb.maneja_inventario
        });
      }

      const totalGeneral = Math.round((totalProductosCalculado + costoEnvioReal) * 100) / 100;

      // 7. Transacción Atómica
      const resultadoTransaccion = await prisma.$transaction(async (tx) => {
        const movimientosParaRegistrar: {
          id_producto_carniceria: bigint;
          cantidad: number;
        }[] = [];

        // 7.1 Resta de Stock Atómica Condicional con Cantidades Agrupadas
        for (const [prodIdStr, cantidadTotalRequerida] of requerimientosStockMap.entries()) {
          const prodDb = productMap.get(prodIdStr)!;

          const updateResult = await tx.productos_carniceria.updateMany({
            where: {
              id: prodDb.id,
              id_carniceria: BigInt(id_carniceria),
              stock_actual: {
                gte: cantidadTotalRequerida // Verifica que el acumulado completo quepa en el stock
              }
            },
            data: {
              stock_actual: {
                decrement: cantidadTotalRequerida // Descontamos el acumulado en una sola instrucción SQL atómica
              }
            }
          });

          if (updateResult.count === 0) {
            const nombreProd = prodDb.productos_catalogo?.nombre || `ID ${prodDb.id}`;
            throw CustomError.badRequest(
              `Stock insuficiente o agotado concurrentemente para ${nombreProd}. Requerido: ${cantidadTotalRequerida}`
            );
          }

          movimientosParaRegistrar.push({
            id_producto_carniceria: prodDb.id,
            cantidad: cantidadTotalRequerida
          });
        }

        // 7.2 Crear Encabezado del Pedido
        const nuevoPedido = await tx.pedidos.create({
          data: {
            id_carniceria: BigInt(id_carniceria),
            id_cliente: cliente.id,
            id_estado: StatePedido.CONFIRMADO,
            id_tipo_entrega: BigInt(dto.id_tipo_entrega),
            id_direccion_envio: direccionEnvioIdBigInt,
            costo_envio: costoEnvioReal,
            canal_origen: dto.canal_origen,
            total: totalGeneral
          }
        });

        // 7.3 Crear Líneas de Detalle
        const detallesConPedidoId = detallesParaInsertar.map((det) => ({
          ...det,
          id_pedido: nuevoPedido.id
        }));

        await tx.detalle_pedidos.createMany({
          // The generated Prisma client is intentionally not regenerated in this
          // task; snapshot columns are written below using parameterized SQL.
          data: detallesConPedidoId.map(({ maneja_inventario_en_base: _snapshot, ...detail }) => detail)
        });

        if (movimientosParaRegistrar.length > 0) {
          await tx.movimientos_inventario.createMany({
            data: movimientosParaRegistrar.map((movimiento) => ({
              id_carniceria: BigInt(id_carniceria),
              id_producto_carniceria: movimiento.id_producto_carniceria,
              id_pedido: nuevoPedido.id,
              tipo: 'SALIDA',
              sentido: 'SALIDA',
              cantidad: movimiento.cantidad,
              motivo: 'VENTA_POS',
              referencia_operacion: `PEDIDO_POS:${nuevoPedido.uuid}`,
              clave_idempotencia: `PEDIDO_POS:${nuevoPedido.uuid}:SALIDA:${movimiento.id_producto_carniceria}`
            }))
          });
        }

        // Store the inventory configuration that was actually applied to each
        // new line. This also distinguishes legitimate no-stock lines from a
        // missing movement when the catalog flag changes later.
        for (const detalle of detallesParaInsertar) {
          const snapshotCount = await tx.$executeRaw`
            UPDATE public.detalle_pedidos
            SET maneja_inventario_en_base = ${detalle.maneja_inventario_en_base}
            WHERE id_pedido = ${nuevoPedido.id}
              AND id_producto_carniceria = ${detalle.id_producto_carniceria}
              AND id_tipo_preparacion IS NOT DISTINCT FROM CAST(${detalle.id_tipo_preparacion} AS BIGINT)
              AND observaciones IS NOT DISTINCT FROM CAST(${detalle.observaciones} AS TEXT)
              AND eliminado_en IS NULL
          `;

          if (snapshotCount !== 1) {
            throw CustomError.internalServer('No se pudo guardar la trazabilidad de inventario del detalle');
          }
        }

        const orderTraceCount = await tx.$executeRaw`
          UPDATE public.pedidos
          SET inventario_trazable = TRUE
          WHERE id = ${nuevoPedido.id}
            AND id_carniceria = ${BigInt(id_carniceria)}
        `;

        if (orderTraceCount !== 1) {
          throw CustomError.internalServer('No se pudo marcar la trazabilidad de inventario del pedido');
        }

        return nuevoPedido;
      });

      return {
        message: 'Pedido confirmado correctamente',
        id_pedido: resultadoTransaccion.id.toString(),
        uuid: resultadoTransaccion.uuid,
        total_cobrado: resultadoTransaccion.total.toString()
      };

    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer(`Error al procesar la venta en POS: ${error}`);
    }
  }

}
