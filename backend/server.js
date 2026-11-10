import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import pool, { testDatabaseConnection } from './database/database.js';
import authRoutes from './routes/authRoutes.js';
import organogramaRoutes from './routes/organogramaRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import configuracoesRoutes from './routes/configuracoesRoutes.js';
import {
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
  alternarStatusUsuario,
  resetarSenhaUsuario
} from './controllers/userController.js';
import { listarUsuariosAuditoria } from './controllers/auditController.js';
import { notFoundHandler, errorHandler } from './middlewares/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const currentEnv = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(__dirname, `.env.${currentEnv}`) });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Configuração de CORS com suporte a múltiplas origens por ambiente
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`Origem não autorizada pela política CORS: ${origin}`));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Endpoint de Healthcheck
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      ambiente: currentEnv,
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.json({
      status: 'degraded',
      ambiente: currentEnv,
      database: 'fallback-mode',
      timestamp: new Date().toISOString()
    });
  }
});

// Registro de Rotas da API REST JHE
app.use('/api/auth', authRoutes);
app.use('/api/organograma', organogramaRoutes);
app.use('/api/auditoria', auditRoutes);
app.use('/api/logs', auditRoutes);
app.use('/api/configuracoes', configuracoesRoutes);

// Rotas de Gestão de Usuários e Vínculos Estruturais
app.get('/api/usuarios', listarUsuarios);
app.post('/api/usuarios', criarUsuario);
app.put('/api/usuarios/:id', atualizarUsuario);
app.patch('/api/usuarios/:id/status', alternarStatusUsuario);
app.post('/api/usuarios/:id/reset-senha', resetarSenhaUsuario);

// Em Produção (quando SERVE_STATIC_FRONTEND=true), serve o bundle estático do Frontend Vite
if (process.env.SERVE_STATIC_FRONTEND === 'true') {
  const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
  app.use(express.static(frontendDistPath));

  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Middlewares de Erro
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(PORT, async () => {
  console.log(`================================================================`);
  console.log(` JHE ENGENHARIA - API ORGANOGRAMA CORPORATIVO (Express 5)`);
  console.log(` Ambiente : ${currentEnv.toUpperCase()}`);
  console.log(` Servidor : http://localhost:${PORT}`);
  console.log(`================================================================`);
  await testDatabaseConnection();
});

// Encerramento gracioso do Pool MySQL
process.on('SIGINT', async () => {
  console.log('\n[SERVER] Encerrando conexões com o banco de dados...');
  await pool.end();
  server.close(() => process.exit(0));
});
