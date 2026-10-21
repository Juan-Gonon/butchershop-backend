import { normalizePedidoObservations } from './pedidoObservations.js';

export interface PedidoLineToConsolidate {
  id_producto_carniceria: number;
  id_tipo_preparacion?: number | null;
  cantidad: number;
  observaciones?: string | null;
}

interface DecimalParts {
  coefficient: bigint;
  scale: number;
}

const decimalParts = (value: number): DecimalParts => {
  const [mantissa = '', exponentText = '0'] = value.toString().toLowerCase().split('e');
  const exponent = Number(exponentText);
  const [integerPart = '0', fractionalPart = ''] = mantissa.split('.');
  let scale = fractionalPart.length - exponent;
  let coefficient = BigInt(`${integerPart}${fractionalPart}`);

  if (scale < 0) {
    coefficient *= 10n ** BigInt(-scale);
    scale = 0;
  }

  return { coefficient, scale };
};

const addDecimals = (left: DecimalParts, right: DecimalParts): DecimalParts => {
  const scale = Math.max(left.scale, right.scale);
  const leftCoefficient = left.coefficient * (10n ** BigInt(scale - left.scale));
  const rightCoefficient = right.coefficient * (10n ** BigInt(scale - right.scale));
  return { coefficient: leftCoefficient + rightCoefficient, scale };
};

const decimalToNumber = ({ coefficient, scale }: DecimalParts): number => {
  const digits = coefficient.toString().padStart(scale + 1, '0');
  const decimal = scale === 0
    ? digits
    : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  return Number(decimal);
};

export const sumDecimalValues = (values: readonly number[]): number => {
  const total = values.reduce<DecimalParts>(
    (sum, value) => addDecimals(sum, decimalParts(value)),
    { coefficient: 0n, scale: 0 }
  );
  return decimalToNumber(total);
};

/** Consolidates equivalent order lines without losing decimal quantity precision. */
export const consolidatePedidoLines = <T extends PedidoLineToConsolidate>(items: readonly T[]) => {
  const groups = new Map<string, { item: T; quantity: DecimalParts }>();

  for (const item of items) {
    const preparationId = item.id_tipo_preparacion ?? null;
    const observations = normalizePedidoObservations(item.observaciones);
    const key = JSON.stringify([item.id_producto_carniceria, preparationId, observations]);
    const current = groups.get(key);

    if (current) {
      current.quantity = addDecimals(current.quantity, decimalParts(item.cantidad));
      continue;
    }

    groups.set(key, {
      item,
      quantity: decimalParts(item.cantidad)
    });
  }

  return Array.from(groups.values(), ({ item, quantity }) => ({
    ...item,
    id_tipo_preparacion: item.id_tipo_preparacion ?? null,
    observaciones: normalizePedidoObservations(item.observaciones),
    cantidad: decimalToNumber(quantity)
  }));
};
