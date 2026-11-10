import { Router } from 'express';
import {
  listarLogsAuditoria,
  listarUsuariosAuditoria
} from '../controllers/auditController.js';

const router = Router();

// Rota principal e alias /logs para compatibilidade
router.get('/', listarLogsAuditoria);
router.get('/logs', listarLogsAuditoria);

// Lista de usuários para preenchimento dos filtros de auditoria
router.get('/usuarios', listarUsuariosAuditoria);

export default router;
