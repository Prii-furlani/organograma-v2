import { Router } from 'express';
import {
  listarEstruturaCompleta,
  getArvoreOrganograma,
  listarNiveis,
  criarNo,
  atualizarNo,
  moverNo,
  excluirNo,
  salvarNiveis
} from '../controllers/organogramaController.js';
import { authenticateToken, requireRoles } from '../middlewares/authMiddleware.js';
import { checkNodeScopePermission } from '../middlewares/authorizeScope.js';

const router = Router();

// 1. Leitura pública ou autenticada da árvore hierárquica e níveis
router.get('/', listarEstruturaCompleta);
router.get('/arvore', getArvoreOrganograma);
router.get('/nos', getArvoreOrganograma);
router.get('/niveis', listarNiveis);

// 2. Criação de novos nós (com validação de escopo do nó pai)
router.post('/', authenticateToken, requireRoles('admin', 'diretor', 'coordenador'), checkNodeScopePermission, criarNo);
router.post('/nos', authenticateToken, requireRoles('admin', 'diretor', 'coordenador'), checkNodeScopePermission, criarNo);

// 3. Atualização do catálogo de níveis hierárquicos (administrador de governança)
router.put('/niveis', authenticateToken, requireRoles('admin'), salvarNiveis);

// 4. Atualização de dados cadastrais (restrito ao escopo do nó)
router.put('/:id', authenticateToken, requireRoles('admin', 'diretor', 'coordenador'), checkNodeScopePermission, atualizarNo);
router.put('/nos/:id', authenticateToken, requireRoles('admin', 'diretor', 'coordenador'), checkNodeScopePermission, atualizarNo);

// 5. Movimentação de nós na hierarquia com validação anti-ciclo e escopo
router.patch('/:id/mover', authenticateToken, requireRoles('admin', 'diretor', 'coordenador'), checkNodeScopePermission, moverNo);
router.patch('/nos/:id/mover', authenticateToken, requireRoles('admin', 'diretor', 'coordenador'), checkNodeScopePermission, moverNo);

// 6. Exclusão de nós (apenas admin e diretor dentro do seu escopo)
router.delete('/:id', authenticateToken, requireRoles('admin', 'diretor'), checkNodeScopePermission, excluirNo);
router.delete('/nos/:id', authenticateToken, requireRoles('admin', 'diretor'), checkNodeScopePermission, excluirNo);

export default router;
