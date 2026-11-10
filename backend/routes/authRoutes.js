import { Router } from 'express';
import { login, me, primeiroAcesso, resetarSenhasPadraoEndpoint } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticateToken, me);
router.post('/primeiro-acesso', authenticateToken, primeiroAcesso);
router.post('/reset-padrao', resetarSenhasPadraoEndpoint);

export default router;
