-- Incremental support for order editing. This assumes the existing schema has
-- already been established; it is not a baseline migration and must not be
-- applied until the physical database and migration history are verified.

ALTER TABLE public.pedidos
  ADD COLUMN version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN inventario_trazable BOOLEAN,
  ADD CONSTRAINT ck_pedidos_version_nonnegative CHECK (version >= 0);

ALTER TABLE public.detalle_pedidos
  ADD COLUMN maneja_inventario_en_base BOOLEAN,
  ADD COLUMN eliminado_en TIMESTAMPTZ(6),
  ADD COLUMN id_operacion_baja BIGINT;

CREATE TABLE public.operaciones_edicion_pedido (
  id BIGSERIAL NOT NULL,
  id_carniceria BIGINT NOT NULL,
  id_pedido BIGINT NOT NULL,
  id_usuario BIGINT NOT NULL,
  clave VARCHAR(160) NOT NULL,
  hash_solicitud CHAR(64) NOT NULL,
  version_anterior INTEGER NOT NULL,
  version_nueva INTEGER NOT NULL,
  resultado JSONB NOT NULL,
  fecha TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT operaciones_edicion_pedido_pkey PRIMARY KEY (id),
  CONSTRAINT ck_operaciones_edicion_clave CHECK (length(btrim(clave)) BETWEEN 1 AND 160),
  CONSTRAINT ck_operaciones_edicion_hash CHECK (hash_solicitud ~ '^[0-9a-f]{64}$'),
  CONSTRAINT ck_operaciones_edicion_versiones
    CHECK (version_anterior >= 0 AND version_nueva = version_anterior + 1),
  CONSTRAINT fk_operaciones_edicion_carniceria
    FOREIGN KEY (id_carniceria) REFERENCES public.carnicerias(id) ON DELETE RESTRICT,
  CONSTRAINT fk_operaciones_edicion_pedido
    FOREIGN KEY (id_pedido) REFERENCES public.pedidos(id) ON DELETE RESTRICT,
  CONSTRAINT fk_operaciones_edicion_usuario
    FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_operaciones_edicion_tenant_pedido_clave
  ON public.operaciones_edicion_pedido (id_carniceria, id_pedido, clave);
CREATE INDEX ix_operaciones_edicion_pedido_fecha
  ON public.operaciones_edicion_pedido (id_carniceria, id_pedido, fecha);
CREATE INDEX ix_operaciones_edicion_usuario_fecha
  ON public.operaciones_edicion_pedido (id_usuario, fecha);

ALTER TABLE public.detalle_pedidos
  ADD CONSTRAINT fk_detalle_pedido_operacion_baja
  FOREIGN KEY (id_operacion_baja)
  REFERENCES public.operaciones_edicion_pedido(id)
  ON DELETE RESTRICT;

ALTER TABLE public.movimientos_inventario
  ADD COLUMN id_operacion_edicion BIGINT,
  DROP CONSTRAINT IF EXISTS fk_movimientos_inventario_detalle;

ALTER TABLE public.movimientos_inventario
  ADD CONSTRAINT fk_movimientos_inventario_detalle
    FOREIGN KEY (id_detalle_pedido)
    REFERENCES public.detalle_pedidos(id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT fk_movimientos_inventario_operacion_edicion
    FOREIGN KEY (id_operacion_edicion)
    REFERENCES public.operaciones_edicion_pedido(id)
    ON DELETE RESTRICT;

CREATE INDEX ix_movimientos_inventario_operacion_edicion
  ON public.movimientos_inventario (id_operacion_edicion);

-- Stop before changing data if the existing rows already violate the new
-- active-line identity. No historical rows are merged or rewritten here.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.detalle_pedidos
    WHERE eliminado_en IS NULL
    GROUP BY id_pedido, id_producto_carniceria, id_tipo_preparacion,
      (COALESCE(NULLIF(BTRIM(observaciones), ''), '') COLLATE "C")
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate active equivalent order details exist; reconcile them before this migration';
  END IF;
END $$;

-- Prisma schema cannot express expression/partial unique indexes. These
-- indexes enforce U+0020-trimmed, case-sensitive observation equivalence and treat
-- NULL preparation consistently without using a sentinel ID.
ALTER TABLE public.detalle_pedidos
  DROP CONSTRAINT IF EXISTS uq_pedido_producto_preparacion;
DROP INDEX IF EXISTS public.uq_pedido_producto_preparacion;

CREATE UNIQUE INDEX uq_detalle_pedido_producto_preparacion_obs_activo
  ON public.detalle_pedidos (
    id_pedido,
    id_producto_carniceria,
    id_tipo_preparacion,
    (COALESCE(NULLIF(BTRIM(observaciones), ''), '') COLLATE "C")
  )
  WHERE eliminado_en IS NULL AND id_tipo_preparacion IS NOT NULL;

CREATE UNIQUE INDEX uq_detalle_pedido_producto_preparacion_null_obs_activo
  ON public.detalle_pedidos (
    id_pedido,
    id_producto_carniceria,
    (COALESCE(NULLIF(BTRIM(observaciones), ''), '') COLLATE "C")
  )
  WHERE eliminado_en IS NULL AND id_tipo_preparacion IS NULL;

ALTER TABLE public.operaciones_edicion_pedido ENABLE ROW LEVEL SECURITY;

-- The application sets this transaction-local value from the authenticated
-- tenant before reading or writing operation rows. An unset context matches
-- no tenant. Table privileges and the deployed database role still require
-- separate verification; RLS does not grant access by itself.
CREATE POLICY operaciones_edicion_pedido_tenant_select
  ON public.operaciones_edicion_pedido
  FOR SELECT
  USING (id_carniceria = NULLIF(current_setting('app.tenant_id', TRUE), '')::BIGINT);

CREATE POLICY operaciones_edicion_pedido_tenant_insert
  ON public.operaciones_edicion_pedido
  FOR INSERT
  WITH CHECK (id_carniceria = NULLIF(current_setting('app.tenant_id', TRUE), '')::BIGINT);

CREATE POLICY operaciones_edicion_pedido_tenant_update
  ON public.operaciones_edicion_pedido
  FOR UPDATE
  USING (id_carniceria = NULLIF(current_setting('app.tenant_id', TRUE), '')::BIGINT)
  WITH CHECK (id_carniceria = NULLIF(current_setting('app.tenant_id', TRUE), '')::BIGINT);
