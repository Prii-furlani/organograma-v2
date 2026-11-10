import pool from '../database/database.js';
import { getFallbackUsuarios } from '../controllers/userController.js';

/**
 * Consulta recursiva MySQL 8 para obter todos os nós descendentes das áreas vinculadas.
 * Se o MySQL estiver indisponível ou em fallback, percorre a árvore em memória.
 */
export async function getDescendantNodeIds(rootNodeIds) {
  if (!rootNodeIds || rootNodeIds.length === 0) return [];

  const numericIds = rootNodeIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0);
  if (numericIds.length === 0) return [];

  try {
    const query = `
      WITH RECURSIVE HierarchyCTE AS (
        SELECT id, parent_id FROM organograma_nos WHERE id IN (?)
        UNION ALL
        SELECT n.id, n.parent_id FROM organograma_nos n
        INNER JOIN HierarchyCTE h ON n.parent_id = h.id
      )
      SELECT id FROM HierarchyCTE;
    `;
    const [rows] = await pool.query(query, [numericIds]);
    return rows.map((r) => Number(r.id));
  } catch (err) {
    console.warn('[RBAC] Aviso: Falha na query recursiva MySQL, utilizando fallback em memória:', err.message);
    // Fallback em memória com nós predefinidos caso DB esteja offline
    const fallbackTree = [
      { id: 1, parent_id: null },
      { id: 2, parent_id: 1 },
      { id: 3, parent_id: 1 },
      { id: 4, parent_id: 1 },
      { id: 5, parent_id: 4 },
      { id: 6, parent_id: 5 },
      { id: 7, parent_id: 5 },
      { id: 8, parent_id: 5 }
    ];

    const result = new Set(numericIds);
    let added = true;
    while (added) {
      added = false;
      for (const node of fallbackTree) {
        if (node.parent_id && result.has(Number(node.parent_id)) && !result.has(Number(node.id))) {
          result.add(Number(node.id));
          added = true;
        }
      }
    }
    return Array.from(result);
  }
}

/**
 * Middleware de autorização por escopo hierárquico (RBAC + Hierarchical Scope)
 * Valida se o usuário tem permissão para atuar sobre o nó alvo (req.params.id, req.body.no_id, req.body.parent_id).
 */
export async function checkNodeScopePermission(req, res, next) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Usuário não autenticado.'
    });
  }

  // 1. Administrador tem liberação irrestrita
  if (user.role_global === 'admin') {
    return next();
  }

  // 2. Colaborador possui acesso estritamente somente-leitura
  if (user.role_global === 'colaborador') {
    return res.status(403).json({
      sucesso: false,
      mensagem: 'Perfil de colaborador possui permissão apenas para consulta.'
    });
  }

  // 3. Diretores e Coordenadores: validar se o nó alvo está dentro do seu escopo
  const targetNodeId = parseInt(req.params.id || req.body.no_id || req.body.parent_id, 10);

  if (!targetNodeId || isNaN(targetNodeId)) {
    // Se for rota sem nó alvo explícito ou criação na raiz, apenas admin pode
    if (req.method === 'POST' && (!req.body.parent_id || req.body.parent_id === null)) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Apenas Administradores podem criar nós no nível raiz.'
      });
    }
  }

  try {
    let userRootNodeIds = [];

    // Tenta carregar vínculos do banco
    try {
      const [vinculos] = await pool.query(
        'SELECT no_id FROM usuario_cargos_nos WHERE usuario_id = ?',
        [user.id]
      );
      userRootNodeIds = vinculos.map((v) => Number(v.no_id));
    } catch (dbErr) {
      // Fallback em memória
      const fallbacks = getFallbackUsuarios();
      const uFallback = fallbacks.find((u) => u.id === user.id || u.email === user.email);
      if (uFallback && Array.isArray(uFallback.vinculos)) {
        userRootNodeIds = uFallback.vinculos.map((v) => Number(v));
      }
    }

    // Se estiver no payload do token como escopos
    if (userRootNodeIds.length === 0 && Array.isArray(user.escopos) && user.escopos.length > 0) {
      userRootNodeIds = user.escopos.map((e) => Number(e.no_id));
    }

    if (userRootNodeIds.length === 0) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Usuário sem área vinculada no organograma.'
      });
    }

    const permittedNodeIds = await getDescendantNodeIds(userRootNodeIds);

    // Se a operação for mover, também valida o nó destino (parent_id)
    if (req.body.parent_id && Number(req.body.parent_id) !== targetNodeId) {
      const targetParentId = Number(req.body.parent_id);
      if (!permittedNodeIds.includes(targetParentId)) {
        return res.status(403).json({
          sucesso: false,
          mensagem: 'Ação não permitida: A área de destino está fora da sua área de gestão.'
        });
      }
    }

    if (targetNodeId && !permittedNodeIds.includes(targetNodeId)) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Ação não permitida: Esta estrutura está fora da sua área de gestão.'
      });
    }

    req.permittedNodeIds = permittedNodeIds;
    next();
  } catch (error) {
    console.error('Erro ao verificar escopo hierárquico:', error);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao validar permissões.'
    });
  }
}
