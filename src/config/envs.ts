import { z } from 'zod';

process.loadEnvFile();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  PUBLIC_PATH: z.string().default('public'),
  JWT_SEED: z.string({ error: 'JWT_SEED es obligatorio' }).min(1, 'JWT_SEED no puede estar vacío')
});

export const envs = envSchema.parse(process.env);