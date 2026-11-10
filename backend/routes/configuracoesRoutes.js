import express from 'express';
import {
  obterConfiguracoesAparencia,
  atualizarConfiguracoesAparencia,
  obterConfiguracoesGovernanca,
  atualizarConfiguracoesGovernanca
} from '../controllers/configuracoesController.js';
import { authenticateToken, requireRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/configuracoes/aparencia e /api/configuracoes/governanca
router.get('/aparencia', obterConfiguracoesAparencia);
router.get('/governanca', obterConfiguracoesGovernanca);
router.get('/', obterConfiguracoesAparencia);

// PUT e POST /api/configuracoes/aparencia e /api/configuracoes/governanca
router.put('/aparencia', authenticateToken, requireRoles('admin', 'diretor', 'coordenador'), atualizarConfiguracoesAparencia);
router.post('/aparencia', authenticateToken, requireRoles('admin', 'diretor', 'coordenador'), atualizarConfiguracoesAparencia);
router.put('/governanca', authenticateToken, requireRoles('admin', 'diretor', 'coordenador'), atualizarConfiguracoesGovernanca);
router.post('/governanca', authenticateToken, requireRoles('admin', 'diretor', 'coordenador'), atualizarConfiguracoesGovernanca);
router.put('/', authenticateToken, requireRoles('admin', 'diretor', 'coordenador'), atualizarConfiguracoesAparencia);

export default router;
