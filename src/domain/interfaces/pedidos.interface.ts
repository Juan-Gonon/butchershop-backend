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