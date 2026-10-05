# ButcherShop Backend API

API REST y servicio WebSockets para el sistema de gestión de pedidos en tiempo real para carnicerías. Este Backend está construido con **Node.js**, **TypeScript**, **Prisma ORM** y **Supabase** (PostgreSQL).

---

## 🚀 Tecnologías Principales

* **Node.js** & **TypeScript**
* **pnpm** (Gestor de paquetes)
* **tsx** (Ejecución y modo watch ultrarrápido)
* **Prisma ORM** (Modelado y acceso a base de datos)
* **Supabase / PostgreSQL** (Base de datos relacional)
* **WebSockets** (Notificaciones y sincronización de pedidos en tiempo real)
* **ESLint** (Linting y formato de código)

---

## 🗄️ Modelo de Base de Datos

El sistema gestiona la arquitectura completa del negocio:

```text
[carnicerias] ──┬──> [usuarios]
                ├──> [clientes]
                ├──> [tipos_preparacion]
                └──> [productos_carniceria] ──> [detalle_pedidos] <── [pedidos]
                                                            │
                                                     [estados_pedido]