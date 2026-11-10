/**
 * ============================================================================
 * JHE ORGANOGRAMA CORPORATIVO - SERVIDOR DE API BACKEND EXPRESS
 * ----------------------------------------------------------------------------
 * Arquivo: server.js
 * Módulo: Servidor HTTP / Configurações de Middleware / Rotas Principais
 * Função Principal: Ponto de entrada do backend Node.js que inicializa o Express,
 * gerencia variáveis de ambiente, configura CORS para Vercel e Render, testa
 * a conexão com o TiDB Cloud e orquestra todas as rotas da API REST.
 *
 * ----------------------------------------------------------------------------
 * GUIA RÁPIDO DE MANUTENÇÃO (ONDE EDITAR SE...):
 * • Alterar porta do servidor: Linha ~50 (PORT)
 * • Configurar domínios permitidos no CORS: Linha ~55 (allowedOrigins / vercelPreviewRegex)
 * • Registrar novas rotas da API: Linha ~80-110 (app.use('/api/...'))
 * • Ajustar tratamento global de erros / 404: Linha ~130 (errorHandler / notFoundHandler)
 * ============================================================================
 */

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

// Configuração Robusta de CORS para Produção (Vercel + Render) e Desenvolvimento Local
const vercelPreviewRegex = /^https:\/\/organograma-v2.*\.vercel\.app$/;

const allowedOrigins = [
  'https://organograma-v2-dun.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

// Incorpora origens dinâmicas definidas na variável de ambiente CORS_ORIGIN
if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .forEach((origin) => {
      if (!allowedOrigins.includes(origin)) {
        allowedOrigins.push(origin);
      }
    });
}

const corsOptions = {
  origin: (origin, callback) => {
    // Permite chamadas sem origin (Postman, curl, SSR, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const isExplicitlyAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');
    const isVercelPreview = vercelPreviewRegex.test(origin);

    if (isExplicitlyAllowed || isVercelPreview) {
      return callback(null, true);
    }

    console.warn(`[CORS] Requisição bloqueada para origem não autorizada: ${origin}`);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Aplica CORS globalmente e intercepta requisições preflight (OPTIONS)
app.use(cors(corsOptions));
app.options('/{*splat}', cors(corsOptions));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Endpoint de Healthcheck
app.get(['/api/health', '/health'], async (req, res) => {
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

// Registro de Rotas da API REST JHE (suporte a /api/* e /*)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/organograma', '/organograma'], organogramaRoutes);
app.use(['/api/auditoria', '/auditoria', '/api/logs', '/logs'], auditRoutes);
app.use(['/api/configuracoes', '/configuracoes'], configuracoesRoutes);

// Rotas de Gestão de Usuários e Vínculos Estruturais
app.get(['/api/usuarios', '/usuarios'], listarUsuarios);
app.post(['/api/usuarios', '/usuarios'], criarUsuario);
app.put(['/api/usuarios/:id', '/usuarios/:id'], atualizarUsuario);
app.patch(['/api/usuarios/:id/status', '/usuarios/:id/status'], alternarStatusUsuario);
app.post(['/api/usuarios/:id/reset-senha', '/usuarios/:id/reset-senha'], resetarSenhaUsuario);

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
