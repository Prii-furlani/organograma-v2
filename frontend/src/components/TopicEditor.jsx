import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  GripVertical,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  Edit3,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  History,
  User,
  ChevronsUpDown,
  ChevronsDownUp,
  X,
  HelpCircle,
  Users
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import ConfirmMoveModal from './modals/ConfirmMoveModal';

/* =============================================================================
   PARTE 1: COMPONENTE RECURSIVO TopicItem
   Renderiza cada linha (setor/área) da tabela e chama a si mesmo recursivamente
   (level + 1) para desenhar os filhos quando o nó está expandido.
   ============================================================================= */
function TopicItem({
  node,
  level = 0,
  expandedNodeIds,
  onToggleExpand,
  searchQuery,
  canEditNode,
  onOpenCreateDrawer,
  onEditNode,
  onDeleteNode,
  onMoveRequest,
  draggedNodeId,
  setDraggedNodeId
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const children = node.children || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedNodeIds.has(String(node.id));
  const canEdit = canEditNode(node);

  // Cálculo recursivo de subordinados diretos e totais (abaixo)
  const diretos = children.length;
  const countAbaixo = useCallback((n) => {
    const ch = n.children || [];
    return ch.reduce((acc, child) => acc + 1 + countAbaixo(child), 0);
  }, []);
  const abaixo = useMemo(() => countAbaixo(node), [node, countAbaixo]);

  // 1. Filtro Inteligente de Busca com Preservação da Árvore (hasChildMatch)
  const query = searchQuery.trim().toLowerCase();

  const matchesNode = (n, q) => {
    if (!q) return true;
    const respStr = Array.isArray(n.responsavel)
      ? n.responsavel.join(' & ')
      : String(n.responsavel || '');
    return (
      n.titulo?.toLowerCase().includes(q) ||
      n.descricao?.toLowerCase().includes(q) ||
      respStr.toLowerCase().includes(q) ||
      n.sigla?.toLowerCase().includes(q) ||
      n.nivel_nome?.toLowerCase().includes(q)
    );
  };

  const hasChildMatch = (n, q) => {
    if (!q) return false;
    return (n.children || []).some((child) => matchesNode(child, q) || hasChildMatch(child, q));
  };

  const matchSearch = matchesNode(node, query);
  const childMatch = hasChildMatch(node, query);

  if (query && !matchSearch && !childMatch) {
    return null;
  }

  const shouldRenderChildren = hasChildren && (isExpanded || Boolean(query && childMatch));

  // Exclusão com verificação de cascata (confirmCascadeDeleteNode vs confirmDeleteNode)
  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!canEdit) return;

    const totalSubordinados = abaixo;

    if (totalSubordinados > 0) {
      // Alerta de exclusão em cascata (confirmCascadeDeleteNode)
      const res = await Swal.fire({
        title: 'Exclusão em Cascata!',
        html: `O setor <strong>"${node.titulo}"</strong> possui <strong>${totalSubordinados} setor(es) subordinado(s)</strong>.<br/><br/>Se confirmar, este setor e todos os <strong>${totalSubordinados} subordinados</strong> serão apagados juntos.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#E11D48',
        cancelButtonColor: '#64748B',
        confirmButtonText: `Sim, excluir tudo (${totalSubordinados + 1})`,
        cancelButtonText: 'Cancelar'
      });
      if (res.isConfirmed) {
        onDeleteNode(node.id);
      }
    } else {
      // Confirmação simples (confirmDeleteNode)
      const res = await Swal.fire({
        title: 'Excluir Tópico?',
        html: `Deseja realmente excluir o setor <strong>"${node.titulo}"</strong>?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#E11D48',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar'
      });
      if (res.isConfirmed) {
        onDeleteNode(node.id);
      }
    }
  };

  // Eventos Drag-and-Drop
  const handleDragStart = (e) => {
    if (!canEdit || node.parent_id === null) {
      e.preventDefault();
      return;
    }
    const idStr = String(node.id);
    window.__JHE_DRAGGED_NODE_ID__ = idStr;
    setDraggedNodeId(idStr);
    e.dataTransfer.setData('text/plain', idStr);
    e.dataTransfer.setData('text', idStr);
    e.dataTransfer.setData('application/json', JSON.stringify({ id: idStr, titulo: node.titulo }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    window.__JHE_DRAGGED_NODE_ID__ = null;
    setDraggedNodeId(null);
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const currentDragged = draggedNodeId || window.__JHE_DRAGGED_NODE_ID__;
    if (currentDragged && String(currentDragged) === String(node.id)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const currentDragged = draggedNodeId || window.__JHE_DRAGGED_NODE_ID__;
    if (currentDragged && String(currentDragged) === String(node.id)) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Previne que filhos internos cancelem o estado de dragOver
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    let sourceId =
      e.dataTransfer.getData('text/plain') ||
      e.dataTransfer.getData('text') ||
      draggedNodeId ||
      window.__JHE_DRAGGED_NODE_ID__;

    if (!sourceId) {
      try {
        const json = e.dataTransfer.getData('application/json');
        if (json) {
          const parsed = JSON.parse(json);
          sourceId = parsed.id;
        }
      } catch (err) {
        // ignora
      }
    }

    window.__JHE_DRAGGED_NODE_ID__ = null;
    setDraggedNodeId(null);

    if (sourceId && String(sourceId) !== String(node.id)) {
      onMoveRequest(String(sourceId), String(node.id));
    }
  };

  const isDraggable = canEdit && node.parent_id !== null;

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`topic-row-bar flex flex-col md:flex-row md:items-center md:justify-between p-3 md:py-2.5 md:px-5 gap-2 border-b transition-all duration-150 ${!canEdit ? 'is-scope-locked' : ''} ${
          isDragOver
            ? 'is-drag-over border-2 border-dashed border-sky-400 bg-sky-50/70 dark:bg-sky-950/40 shadow-sm'
            : ''
        } ${draggedNodeId === String(node.id) ? 'opacity-40 scale-[0.99] border-dashed border-slate-300' : ''} ${
          query && matchSearch ? 'is-search-match' : ''
        }`}
      >
        {/* Coluna 1 — Informações e Indentação (topic-col-info) */}
        <div className="topic-col-info flex items-start sm:items-center min-w-0 flex-1 w-full">
          {/* Guias de Indentação (topic-indent-group) */}
          <div className="topic-indent-group shrink-0 flex items-stretch self-stretch">
            {Array.from({ length: level }).map((_, idx) => (
              <span key={idx} className="topic-indent-guide" />
            ))}
          </div>

          {/* Alça de Arraste (Restrita a Desktop para prevenir travamento de scroll vertical táctil) */}
          <span
            draggable={isDraggable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`hidden sm:flex mr-2 items-center justify-center p-1 rounded-md transition-colors shrink-0 ${
              isDraggable
                ? 'cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                : 'opacity-20 cursor-not-allowed text-slate-300'
            }`}
            title={
              isDraggable
                ? 'Clique e arraste para subordinar este setor a outro'
                : node.parent_id === null
                ? 'Nível Raiz (Presidência/Co-CEOs) não pode ser subordinado'
                : 'Movimentação restrita pelo seu escopo de permissão'
            }
          >
            <GripVertical size={16} />
          </span>

          {/* Seta de Expansão (topic-chevron-box) */}
          <button
            type="button"
            onClick={() => hasChildren && onToggleExpand(String(node.id))}
            className="topic-chevron-box shrink-0"
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
            title={isExpanded ? 'Recolher subárvore' : 'Expandir subárvore'}
            aria-label={isExpanded ? 'Recolher subárvore' : 'Expandir subárvore'}
          >
            {shouldRenderChildren ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>

          {/* Avatar (topic-avatar-squircle) */}
          <div
            className="topic-avatar-squircle shrink-0"
            style={{ backgroundColor: node.cor_hex || 'var(--jhe-primary)' }}
          >
            <User size={14} color="#FFFFFF" />
          </div>

          {/* Textos e Badges (topic-text-group) */}
          <div className="topic-text-group min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm truncate max-w-full" style={{ color: 'var(--jhe-text-main)' }}>
                {node.titulo}
              </span>

              <span className={`slug-badge slug-badge-${node.nivel_slug || 'diretoria'} shrink-0 text-[10px] font-bold uppercase`}>
                {node.nivel_nome || node.tipo || node.sigla}
              </span>

              {!canEdit && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                  <ShieldAlert size={10} />
                  Leitura
                </span>
              )}
            </div>

            {/* Badges de Subordinados no Mobile (abaixo do nome, NUNCA sobreposto) */}
            <div className="md:hidden flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                <Users className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                {diretos} diretos
              </span>
              {abaixo > diretos && (
                <span className="text-[11px] text-slate-400 font-normal">
                  ({abaixo} no total)
                </span>
              )}
              {node.responsavel && (
                <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                  • {Array.isArray(node.responsavel) ? node.responsavel.join(' & ') : node.responsavel}
                </span>
              )}
            </div>

            {/* Descrição em Desktop */}
            <div className="hidden md:flex items-center gap-2 flex-wrap mt-0.5 text-xs" style={{ color: 'var(--jhe-text-muted)' }}>
              {node.responsavel && (
                <span>
                  {Array.isArray(node.responsavel) ? node.responsavel.join(' & ') : node.responsavel} —
                </span>
              )}
              <span className="truncate max-w-md">
                {node.descricao || 'Sem descrição cadastrada'}
              </span>
            </div>
          </div>
        </div>

        {/* Coluna 2 — Contador de Subordinados em Desktop (topic-col-subordinates) */}
        <div className="hidden md:flex topic-col-subordinates shrink-0">
          <span className="text-xs font-bold" style={{ color: 'var(--jhe-text-main)' }}>
            {diretos} diretos
          </span>
          <span className="text-[11px]" style={{ color: 'var(--jhe-text-muted)' }}>
            {abaixo} abaixo
          </span>
        </div>

        {/* Coluna 3 — Botões de Ação (Acessíveis para toque no mobile com 36x36px) */}
        <div className="flex items-center justify-end gap-1.5 self-end md:self-center w-full md:w-[120px] pt-1.5 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/60 shrink-0">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onOpenCreateDrawer(node)}
            className="min-w-[36px] min-h-[36px] w-9 h-9 md:w-[1.9rem] md:h-[1.9rem] md:min-w-0 md:min-h-0 rounded-lg md:rounded-md border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Adicionar Subordinado direto neste setor"
            aria-label="Adicionar subordinado"
          >
            <Plus size={15} />
          </button>

          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onEditNode(node)}
            className="min-w-[36px] min-h-[36px] w-9 h-9 md:w-[1.9rem] md:h-[1.9rem] md:min-w-0 md:min-h-0 rounded-lg md:rounded-md border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Editar dados deste setor"
            aria-label="Editar setor"
          >
            <Edit3 size={14} />
          </button>

          <button
            type="button"
            disabled={!canEdit || node.parent_id === null}
            onClick={handleDelete}
            className="min-w-[36px] min-h-[36px] w-9 h-9 md:w-[1.9rem] md:h-[1.9rem] md:min-w-0 md:min-h-0 rounded-lg md:rounded-md border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={
              node.parent_id === null
                ? 'O nó raiz institucional não pode ser excluído'
                : 'Excluir setor'
            }
            aria-label="Excluir setor"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Renderização Recursiva dos Filhos (level + 1) */}
      {shouldRenderChildren &&
        children.map((child) => (
          <TopicItem
            key={child.id}
            node={child}
            level={level + 1}
            expandedNodeIds={expandedNodeIds}
            onToggleExpand={onToggleExpand}
            searchQuery={searchQuery}
            canEditNode={canEditNode}
            onOpenCreateDrawer={onOpenCreateDrawer}
            onEditNode={onEditNode}
            onDeleteNode={onDeleteNode}
            onMoveRequest={onMoveRequest}
            draggedNodeId={draggedNodeId}
            setDraggedNodeId={setDraggedNodeId}
          />
        ))}
    </>
  );
}

/* =============================================================================
   PARTE 2: FUNÇÕES UTILITÁRIAS DE ÁRVORE (linhas 247-283 da arquitetura)
   ============================================================================= */

/**
 * Localiza qualquer nó dentro da árvore aninhada pelo ID.
 */
export function findNodeInTree(nodes = [], id) {
  for (const node of nodes) {
    if (String(node.id) === String(id)) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Coleta os IDs de todos os nós que possuem filhos (usado pelo botão "Expandir tudo").
 */
export function getAllParentNodeIds(nodes = []) {
  const ids = [];
  const walk = (list) => {
    list.forEach((node) => {
      if (node.children && node.children.length > 0) {
        ids.push(String(node.id));
        walk(node.children);
      }
    });
  };
  walk(nodes);
  return ids;
}

/**
 * Verifica se um setor é descendente de outro (usado para impedir que uma área seja
 * arrastada para dentro de um de seus próprios subordinados).
 */
export function isDescendant(rootNode, childId) {
  if (!rootNode || !rootNode.children) return false;
  for (const child of rootNode.children) {
    if (String(child.id) === String(childId)) return true;
    if (isDescendant(child, childId)) return true;
  }
  return false;
}

/**
 * Converte a lista achatada de nós em árvore aninhada ordenada por `ordem` ASC.
 */
function buildNestedTree(flatNodes = []) {
  const map = new Map();
  flatNodes.forEach((n) => {
    map.set(String(n.id), { ...n, children: [] });
  });

  const roots = [];
  map.forEach((node) => {
    const pId =
      node.parent_id !== null && node.parent_id !== undefined && node.parent_id !== ''
        ? String(node.parent_id)
        : null;
    if (pId && map.has(pId)) {
      map.get(pId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRecursive = (list) => {
    list.sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0) || Number(a.id) - Number(b.id));
    list.forEach((item) => {
      if (item.children?.length) sortRecursive(item.children);
    });
  };

  sortRecursive(roots);
  return roots;
}

/* =============================================================================
   PARTE 3: COMPONENTE PRINCIPAL TopicEditor
   Gerencia o layout da tela, estados de expansão (expandedNodeIds), busca
   (searchQuery), validações de movimentação (handleMoveRequest) e modais.
   ============================================================================= */
export default function TopicEditor({
  nos = [],
  onClose,
  onSelectNode,
  onCreateChild,
  onCreateRoot,
  onDeleteNode,
  onMoveNode,
  fetchTopicsData,
  onOpenAuditModal,
  onOpenQuickGuide
}) {
  const { usuario } = useAuth();
  const treeData = useMemo(() => buildNestedTree(nos), [nos]);

  // Por padrão inicia com todos os nós pais expandidos
  const [expandedNodeIds, setExpandedNodeIds] = useState(() => new Set(getAllParentNodeIds(treeData)));
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [confirmMoveData, setConfirmMoveData] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [historyStack, setHistoryStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const roleGlobal = (usuario?.role_global || 'admin').toUpperCase();
  const isAdmin = roleGlobal === 'ADMIN';

  // Verifica se o usuário tem permissão de edição no nó (RBAC + escopo setorial)
  const canEditNode = useCallback(
    (targetNode) => {
      if (!usuario) return true;
      if (!usuario.role_global || usuario.role_global === 'admin') return true;
      if (usuario.role_global === 'colaborador' || usuario.role_global === 'visualizador') return false;

      // Diretor ou Coordenador: valida se o nó pertence à linhagem dos nós vinculados
      if (Array.isArray(usuario.escopos) && usuario.escopos.length > 0) {
        return usuario.escopos.some((esc) => {
          if (String(esc.no_id) === String(targetNode.id)) return true;
          const scopeRoot = findNodeInTree(treeData, esc.no_id);
          return isDescendant(scopeRoot, targetNode.id);
        });
      }

      // Se possui vinculos diretos simples (ex: usuario.vinculos)
      if (Array.isArray(usuario.vinculos) && usuario.vinculos.length > 0) {
        return usuario.vinculos.some((vId) => {
          if (String(vId) === String(targetNode.id)) return true;
          const scopeRoot = findNodeInTree(treeData, vId);
          return isDescendant(scopeRoot, targetNode.id);
        });
      }

      // Diretores e Coordenadores podem atuar sobre os níveis organizacionais
      return true;
    },
    [usuario, treeData]
  );

  // Alterna expansão individual
  const handleToggleExpand = (nodeId) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(String(nodeId))) {
        next.delete(String(nodeId));
      } else {
        next.add(String(nodeId));
      }
      return next;
    });
  };

  // Expandir tudo (handleExpandAll)
  const handleExpandAll = () => {
    setExpandedNodeIds(new Set(getAllParentNodeIds(treeData)));
  };

  // Recolher tudo mantendo apenas o nível raiz (Co-CEOs) aberto (handleCollapseAll)
  const handleCollapseAll = () => {
    const rootIds = treeData.map((r) => String(r.id));
    setExpandedNodeIds(new Set(rootIds));
  };

  // Trava de segurança do botão "+ Novo tópico" (handleCreateNewRoot)
  const handleCreateNewRoot = () => {
    if (!isAdmin) {
      Swal.fire({
        title: 'Permissão Restrita (Apenas ADMIN)',
        html: 'Apenas <strong>Administradores</strong> podem criar tópicos no nível raiz.<br/><br/>Para adicionar uma nova área sob sua gestão, clique no botão <strong>(+)</strong> na linha correspondente à sua Diretoria ou Coordenação.',
        icon: 'info',
        confirmButtonColor: '#194775',
        confirmButtonText: 'Entendi'
      });
      return;
    }

    if (onCreateRoot) {
      onCreateRoot();
    } else if (onCreateChild) {
      onCreateChild(1);
    }
  };

  // Validação de Drag-and-Drop (handleMoveRequest)
  const handleMoveRequest = (sourceId, targetParentId) => {
    const draggedNode = findNodeInTree(treeData, sourceId);
    const targetParentNode = findNodeInTree(treeData, targetParentId);

    if (!draggedNode || !targetParentNode) return;

    if (!canEditNode(draggedNode)) {
      Swal.fire({
        title: 'Ação Não Permitida',
        text: `O setor "${draggedNode.titulo}" está fora da sua área de gestão hierárquica.`,
        icon: 'error',
        confirmButtonColor: '#0E284E'
      });
      return;
    }

    if (!canEditNode(targetParentNode)) {
      Swal.fire({
        title: 'Destino Não Permitido',
        text: `A área superior de destino "${targetParentNode.titulo}" está fora da sua área de gestão hierárquica.`,
        icon: 'error',
        confirmButtonColor: '#0E284E'
      });
      return;
    }

    if (String(draggedNode.parent_id) === String(targetParentNode.id)) {
      return; // Já está subordinado a este pai
    }

    // Impede que uma área seja arrastada para dentro de um de seus próprios subordinados
    if (isDescendant(draggedNode, targetParentNode.id)) {
      Swal.fire({
        title: 'Movimentação Inválida',
        text: `Não é permitido mover "${draggedNode.titulo}" para dentro de um de seus próprios subordinados ("${targetParentNode.titulo}").`,
        icon: 'error',
        confirmButtonColor: '#194775'
      });
      return;
    }

    const oldParentNode = draggedNode.parent_id
      ? findNodeInTree(treeData, draggedNode.parent_id)
      : null;

    setConfirmMoveData({
      draggedNode,
      targetParentNode,
      oldParentNode
    });
  };

  const handleConfirmMove = async () => {
    if (!confirmMoveData) return;
    const { draggedNode, targetParentNode, oldParentNode } = confirmMoveData;

    setIsMoving(true);
    try {
      const token =
        localStorage.getItem('jhe_org_token') || sessionStorage.getItem('jhe_org_token') || '';

      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 1. Chamada à API para atualizar parent_id no MySQL
      const response = await fetch(`/api/organograma/nos/${draggedNode.id}/mover`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          parent_id: targetParentNode.id
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.mensagem || 'Falha ao mover tópico');
      }

      // 2. Registrar na pilha de Undo para permitir desfazer na sessão
      const moveEntry = {
        tipo: 'MOVIMENTACAO',
        noId: draggedNode.id,
        noTitulo: draggedNode.titulo,
        origemPaiId: oldParentNode?.id ?? null,
        origemPaiTitulo: oldParentNode?.titulo || 'Nível Raiz',
        destinoPaiId: targetParentNode.id,
        destinoPaiTitulo: targetParentNode.titulo,
        timestamp: new Date().toISOString()
      };

      setHistoryStack((prev) => [...prev, moveEntry]);
      setRedoStack([]);

      // 3. OBRIGATÓRIO: Recarregar a lista completa a partir da base de dados
      if (typeof fetchTopicsData === 'function') {
        await fetchTopicsData();
      } else if (typeof onMoveNode === 'function') {
        await onMoveNode(draggedNode, targetParentNode.id);
      }

      // 4. Fechar modal e limpar estado
      setConfirmMoveData(null);

      // Garante que o nó de destino fique expandido para visualização imediata da alteração
      setExpandedNodeIds((prev) => new Set([...prev, String(targetParentNode.id)]));
    } catch (error) {
      console.error('Erro na movimentação:', error);
      if (typeof onMoveNode === 'function') {
        try {
          await onMoveNode(draggedNode, targetParentNode.id);
          setConfirmMoveData(null);
          setExpandedNodeIds((prev) => new Set([...prev, String(targetParentNode.id)]));
          return;
        } catch (fallbackErr) {
          console.error('Fallback onMoveNode falhou:', fallbackErr);
        }
      }
      alert('Erro ao mover a estrutura: ' + error.message);
    } finally {
      setIsMoving(false);
    }
  };

  const handleUndo = async () => {
    if (historyStack.length === 0) return;
    const last = historyStack[historyStack.length - 1];

    const result = await Swal.fire({
      title: 'Desfazer Movimentação?',
      html: `Deseja retornar o setor <strong>"${last.noTitulo}"</strong> para a área superior anterior <strong>"${last.origemPaiTitulo}"</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0E284E',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sim, desfazer',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      const token =
        localStorage.getItem('jhe_org_token') || sessionStorage.getItem('jhe_org_token') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/organograma/nos/${last.noId}/mover`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ parent_id: last.origemPaiId })
      });

      if (typeof fetchTopicsData === 'function') {
        await fetchTopicsData();
      } else if (typeof onMoveNode === 'function') {
        const nodeObj = findNodeInTree(treeData, last.noId);
        if (nodeObj) await onMoveNode(nodeObj, last.origemPaiId);
      }

      setHistoryStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, last]);
    } catch (err) {
      console.error('Erro ao desfazer movimentação:', err);
    }
  };

  const handleRedo = async () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];

    const result = await Swal.fire({
      title: 'Refazer Movimentação?',
      html: `Deseja mover novamente o setor <strong>"${next.noTitulo}"</strong> para a área superior <strong>"${next.destinoPaiTitulo}"</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0E284E',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sim, refazer',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      const token =
        localStorage.getItem('jhe_org_token') || sessionStorage.getItem('jhe_org_token') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/organograma/nos/${next.noId}/mover`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ parent_id: next.destinoPaiId })
      });

      if (typeof fetchTopicsData === 'function') {
        await fetchTopicsData();
      } else if (typeof onMoveNode === 'function') {
        const nodeObj = findNodeInTree(treeData, next.noId);
        if (nodeObj) await onMoveNode(nodeObj, next.destinoPaiId);
      }

      setRedoStack((prev) => prev.slice(0, -1));
      setHistoryStack((prev) => [...prev, next]);
    } catch (err) {
      console.error('Erro ao refazer movimentação:', err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* A. Cabeçalho Superior (header.topic-editor-navbar) */}
      <header className="topic-editor-navbar flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 sm:p-4 md:px-6 md:py-3">
        {/* Linha 1 (Mobile): Botão de voltar, Título e Usuário */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg border hover:opacity-80 transition cursor-pointer shrink-0"
              style={{
                borderColor: 'var(--jhe-border-subtle)',
                color: 'var(--jhe-text-main)'
              }}
              title="Voltar ao mapa visual do organograma"
              aria-label="Voltar ao mapa"
            >
              <ArrowLeft size={17} />
            </button>

            <div
              className="p-2 rounded-lg hidden sm:flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'rgba(25, 71, 117, 0.12)',
                color: 'var(--jhe-primary-lighter)'
              }}
            >
              <GripVertical size={18} />
            </div>

            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate" style={{ color: 'var(--jhe-text-muted)' }}>
                {usuario?.nome || 'Gestor JHE'} • {roleGlobal}
              </div>
              <h2 className="text-sm sm:text-base font-bold leading-tight truncate" style={{ color: 'var(--jhe-text-main)' }}>
                Editor em tópicos
              </h2>
            </div>
          </div>
        </div>

        {/* Linha 2 (Mobile): Campo de Pesquisa ocupando 100% da largura */}
        <div className="relative w-full md:w-60 lg:w-72 order-2 md:order-none">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--jhe-primary-lighter)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Localizar um tópico..."
            className="w-full pl-8 pr-7 py-2 md:py-1.5 rounded-lg text-xs border bg-transparent focus:outline-none transition-colors"
            style={{
              borderColor: searchQuery ? 'var(--jhe-primary-lighter)' : 'var(--jhe-border-subtle)',
              color: 'var(--jhe-text-main)'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
              aria-label="Limpar pesquisa"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Linha 3 (Mobile): Barra de botões de atalho com scroll horizontal suave ou botões compactos */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto max-w-full custom-scrollbar-subtle order-3 md:order-none">
          {/* Botões Desfazer / Refazer */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={historyStack.length === 0}
              onClick={handleUndo}
              className="p-2 rounded-lg border disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              style={{ borderColor: 'var(--jhe-border-subtle)', color: 'var(--jhe-text-main)' }}
              title="Desfazer última movimentação"
              aria-label="Desfazer"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              disabled={redoStack.length === 0}
              onClick={handleRedo}
              className="p-2 rounded-lg border disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              style={{ borderColor: 'var(--jhe-border-subtle)', color: 'var(--jhe-text-main)' }}
              title="Refazer movimentação"
              aria-label="Refazer"
            >
              <Redo2 size={15} />
            </button>
          </div>

          {/* Grupo de Expansão */}
          <div className="jhe-tree-toggle-group shrink-0">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer hover:opacity-85 whitespace-nowrap"
              title="Abre todos os níveis da árvore simultaneamente"
            >
              <ChevronsUpDown size={13} />
              <span className="hidden sm:inline">Expandir tudo</span>
              <span className="sm:hidden">Expandir</span>
            </button>
            <div className="w-px h-4" style={{ backgroundColor: 'var(--jhe-border-subtle)' }} />
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer hover:opacity-85 whitespace-nowrap"
              title="Fecha todas as subárvores mantendo apenas Co-CEOs aberto"
            >
              <ChevronsDownUp size={13} />
              <span className="hidden sm:inline">Recolher tudo</span>
              <span className="sm:hidden">Recolher</span>
            </button>
          </div>

          {/* Botão Guia Rápido */}
          {onOpenQuickGuide && (
            <button
              type="button"
              onClick={onOpenQuickGuide}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 whitespace-nowrap"
              style={{
                borderColor: 'var(--jhe-border-subtle)',
                color: 'var(--jhe-text-main)'
              }}
              title="Guia Rápido e Instruções"
            >
              <HelpCircle size={14} className="text-amber-500" />
              <span>Guia</span>
            </button>
          )}

          {/* Botão + Novo tópico */}
          <button
            type="button"
            onClick={handleCreateNewRoot}
            className="px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer hover:opacity-95 shadow-xs shrink-0 whitespace-nowrap ml-auto md:ml-0"
            style={{ backgroundColor: 'var(--jhe-primary)' }}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Novo tópico</span>
            <span className="sm:hidden">+ Tópico</span>
          </button>
        </div>
      </header>

      {/* B. Faixa de Orientação Executiva (div.topic-editor-info-bar) */}
      <div className="topic-editor-info-bar">
        <div className="flex items-center gap-2 text-xs">
          <AlertTriangle size={15} style={{ color: 'var(--jhe-secondary)', flexShrink: 0 }} />
          <span>
            <strong>{usuario?.nome || 'Administrador Governança JHE'}</strong> ({roleGlobal}) — Arraste um
            tópico sobre outro para alterar sua área superior.
          </span>
        </div>
        <div className="text-xs font-medium opacity-80">
          Use as setas para expandir ou recolher os níveis
        </div>
      </div>

      {/* C. Área Principal: Tabela Hierárquica com Scroll Interno (main.topic-editor-main-area) */}
      <main className="topic-editor-main-area">
        <div className="topic-editor-card">
          {/* Cabeçalho Fixo de 3 Colunas (div.topic-table-header - Oculto em telas móveis) */}
          <div className="topic-table-header hidden md:flex">
            <div className="flex-1 pl-14">Estrutura e Hierarquia</div>
            <div className="w-[180px]">Subordinados</div>
            <div className="w-[120px] text-right">Ações</div>
          </div>

          {/* Corpo Scrollável (div.topic-table-body) */}
          <div className="topic-table-body">
            {treeData.map((rootNode) => (
              <TopicItem
                key={rootNode.id}
                node={rootNode}
                level={0}
                expandedNodeIds={expandedNodeIds}
                onToggleExpand={handleToggleExpand}
                searchQuery={searchQuery}
                canEditNode={canEditNode}
                onOpenCreateDrawer={(parentNode) => onCreateChild && onCreateChild(parentNode.id)}
                onEditNode={(targetNode) => onSelectNode && onSelectNode(targetNode)}
                onDeleteNode={(targetId) => onDeleteNode && onDeleteNode(targetId)}
                onMoveRequest={handleMoveRequest}
                draggedNodeId={draggedNodeId}
                setDraggedNodeId={setDraggedNodeId}
              />
            ))}
          </div>
        </div>
      </main>

      <ConfirmMoveModal
        isOpen={Boolean(confirmMoveData)}
        moveData={confirmMoveData}
        draggedNode={confirmMoveData?.draggedNode}
        targetNode={confirmMoveData?.targetParentNode}
        isLoading={isMoving}
        onConfirm={handleConfirmMove}
        onClose={() => setConfirmMoveData(null)}
        onCancel={() => setConfirmMoveData(null)}
      />
    </div>
  );
}
