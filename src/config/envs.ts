import { z } from 'zod';

process.loadEnvFile();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  PUBLIC_PATH: z.string().default('public')
  //JWT_SEED: z.string({ required_error: 'JWT_SEED es obligatorio' })
});

export const envs = envSchema.parse(process.env);