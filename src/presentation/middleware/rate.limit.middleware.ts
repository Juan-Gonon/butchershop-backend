import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 10, // Máximo 5 peticiones fallidas/exitosas por ventana
  standardHeaders: 'draft-7', // Devuelve headers `RateLimit-*` estándar
  legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*` antiguos
  message: {
    ok: false,
    error: 'Demasiados intentos de inicio de sesión. Por favor, intente nuevamente en 15 minutos.'
  }
});

/**
 * Limitador general para el resto de la API.
 * Permite máximo 100 peticiones cada 15 minutos por IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 300, // Máximo 100 peticiones por ventana
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Has superado el límite de peticiones permitidas. Intenta más tarde.'
  }
});