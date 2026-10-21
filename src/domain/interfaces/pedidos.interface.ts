import type { UpdatePedidoDetailsDto } from '../Dtos/pedidos/updatePedidoDetails.dto.js';

export interface VolumenPorUnidad {
  unidad_venta: string;
  abreviatura: string;
  total_volumen_o_cantidad: string | number;
}

export interface VolumenPorTipoCarne {
  tipo_carne_id: string | number;
  tipo_carne_nombre: string;
  total_libras: string | number;
}

export interface PedidoDetailsEditor {
  updatePedidoDetails(
    idCarniceria: number,
    pedidoUuid: string,
    dto: UpdatePedidoDetailsDto
  ): Promise<never>;
}
