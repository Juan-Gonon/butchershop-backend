/**
 * The SQL migration uses PostgreSQL BTRIM(value), which trims ordinary U+0020
 * spaces. Keep application normalization identical so line grouping and the
 * active-line unique indexes agree.
 */
export const trimPedidoObservationSpaces = (value: string): string => value.replace(/^ +| +$/g, '');

export const normalizePedidoObservations = (value?: string | null): string | null => {
  if (value == null) return null;
  const normalized = trimPedidoObservationSpaces(value);
  return normalized.length ? normalized : null;
};
