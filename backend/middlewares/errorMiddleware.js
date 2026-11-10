/**
 * Middleware global de captura de rotas inexistentes (404)
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    sucesso: false,
    mensagem: `Rota não encontrada: [${req.method}] ${req.originalUrl}`
  });
}

/**
 * Middleware global de tratamento de erros do Express 5
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  console.error(`[ERRO API] ${req.method} ${req.originalUrl}:`, err.message);

  res.status(statusCode).json({
    sucesso: false,
    mensagem: err.message || 'Erro interno no servidor JHE Organograma.',
    ...(isProd ? {} : { stack: err.stack, code: err.code })
  });
}
