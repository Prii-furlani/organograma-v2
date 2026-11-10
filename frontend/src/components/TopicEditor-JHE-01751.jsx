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
  X
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
    return (
      n.titulo?.toLowerCase().includes(q) ||
      n.descricao?.toLowerCase().includes(q) ||
      n.responsavel?.toLowerCase().includes(q) ||
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
    setDraggedNodeId(String(node.id));
    e.dataTransfer.setData('text/plain', String(node.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!canEdit || String(draggedNodeId) === String(node.id)) return;
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const sourceId = e.dataTransfer.getData('text/plain') || draggedNodeId;
    setDraggedNodeId(null);
    if (sourceId && String(sourceId) !== String(node.id)) {
      onMoveRequest(String(sourceId), String(node.id));
    }
  };

  return (
    <>
      <div
        draggable={canEdit && node.parent_id !== null}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`topic-row-bar ${!canEdit ? 'is-scope-locked' : ''} ${
          isDragOver ? 'is-drag-over' : ''
        } ${query && matchSearch ? 'is-search-match' : ''}`}
      >
        {/* Coluna 1 — Informações e Indentação (topic-col-info) */}
        <div className="topic-col-info">
          {/* Guias de Indentação (topic-indent-group) */}
          <div className="topic-indent-group">
            {Array.from({ length: level }).map((_, idx) => (
              <span key={idx} className="topic-indent-guide" />
            ))}
          </div>

          {/* Alça de Arraste */}
          <span
            className={`mr-1.5 ${
              canEdit && node.parent_id !== null
                ? 'cursor-grab active:cursor-grabbing opacity-60 hover:opacity-100'
                : 'opacity-20 cursor-not-allowed'
            }`}
            title={
              canEdit && node.parent_id !== null
                ? 'Arraste para mover este setor'
                : 'Movimentação bloqueada'
            }
          >
            <GripVertical size={15} />
          </span>

          {/* Seta de Expansão (topic-chevron-box) */}
          <button
            type="button"
            onClick={() => hasChildren && onToggleExpand(String(node.id))}
            className="topic-chevron-box"
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
            title={isExpanded ? 'Recolher subárvore' : 'Expandir subárvore'}
          >
            {shouldRenderChildren ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>

          {/* Avatar (topic-avatar-squircle) */}
          <div
            className="topic-avatar-squircle"
            style={{ backgroundColor: node.cor_hex || 'var(--jhe-primary)' }}
          >
            <User size={15} color="#FFFFFF" />
          </div>

          {/* Textos e Selo de Permissão (topic-text-group) */}
          <div className="topic-text-group">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm" style={{ color: 'var(--jhe-text-main)' }}>
                {node.titulo}
              </span>

              {!canEdit && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  <ShieldAlert size={11} />
                  Somente leitura
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className={`slug-badge slug-badge-${node.nivel_slug || 'diretoria'}`}>
                {node.nivel_nome || node.tipo || node.sigla}
              </span>
              <span className="text-xs truncate max-w-xl" style={{ color: 'var(--jhe-text-muted)' }}>
                {node.responsavel ? `${node.responsavel} — ` : ''}
                {node.descricao || 'Sem descrição cadastrada'}
              </span>
            </div>
          </div>
        </div>

        {/* Coluna 2 — Contador de Subordinados (topic-col-subordinates) */}
        <div className="topic-col-subordinates">
          <span className="text-xs font-bold" style={{ color: 'var(--jhe-text-main)' }}>
            {diretos} diretos
          </span>
          <span className="text-[11px]" style={{ color: 'var(--jhe-text-muted)' }}>
            {abaixo} abaixo
          </span>
        </div>

        {/* Coluna 3 — Botões de Ação (topic-col-actions) */}
        <div className="topic-col-actions">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onOpenCreateDrawer(node)}
            className="topic-action-btn"
            title="Adicionar Subordinado direto neste setor"
          >
            <Plus size={15} />
          </button>

          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onEditNode(node)}
            className="topic-action-btn"
            title="Editar dados deste setor"
          >
            <Edit3 size={14} />
          </button>

          <button
            type="button"
            disabled={!canEdit || node.parent_id === null}
            onClick={handleDelete}
            className="topic-action-btn topic-action-btn-danger"
            title={
              node.parent_id === null
                ? 'O nó raiz institucional não pode ser excluído'
                : 'Excluir setor'
            }
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
  onOpenAuditModal
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
      if (!usuario) return false;
      if (usuario.role_global === 'admin') return true;
      if (usuario.role_global === 'visualizador') return false;

      // Se houver escopos explícitos em usuario.escopos, valida se targetNode pertence à subárvore liberada
      if (Array.isArray(usuario.escopos) && usuario.escopos.length > 0) {
        return usuario.escopos.some((esc) => {
          if (String(esc.no_id) === String(targetNode.id)) return true;
          if (esc.incluir_subordinados) {
            const scopeRoot = findNodeInTree(treeData, esc.no_id);
            return isDescendant(scopeRoot, targetNode.id);
          }
          return false;
        });
      }

      // Diretores e Coordenadores podem editar níveis abaixo de Co-CEOs
      return targetNode.parent_id !== null;
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
      setHistoryStack((prev) => [
        ...prev,
        { nodeId: draggedNode.id, fromParentId: oldParentNode?.id ?? null, toParentId: targetParentNode.id }
      ]);
      setRedoStack([]);

      if (onMoveNode) {
        await onMoveNode(draggedNode, targetParentNode.id);
      }
      setConfirmMoveData(null);
    } finally {
      setIsMoving(false);
    }
  };

  const handleUndo = async () => {
    if (historyStack.length === 0 || !onMoveNode) return;
    const last = historyStack[historyStack.length - 1];
    const nodeObj = findNodeInTree(treeData, last.nodeId);
    if (nodeObj) {
      await onMoveNode(nodeObj, last.fromParentId);
      setHistoryStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, last]);
    }
  };

  const handleRedo = async () => {
    if (redoStack.length === 0 || !onMoveNode) return;
    const next = redoStack[redoStack.length - 1];
    const nodeObj = findNodeInTree(treeData, next.nodeId);
    if (nodeObj) {
      await onMoveNode(nodeObj, next.toParentId);
      setRedoStack((prev) => prev.slice(0, -1));
      setHistoryStack((prev) => [...prev, next]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* A. Cabeçalho Superior (header.topic-editor-navbar) */}
      <header className="topic-editor-navbar">
        {/* Bloco Esquerdo (Navegação e Título) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg border hover:opacity-80 transition cursor-pointer"
            style={{
              borderColor: 'var(--jhe-border-subtle)',
              color: 'var(--jhe-text-main)'
            }}
            title="Voltar ao mapa visual do organograma"
          >
            <ArrowLeft size={17} />
          </button>

          <div
            className="p-2 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(25, 71, 117, 0.12)',
              color: 'var(--jhe-primary-lighter)'
            }}
          >
            <GripVertical size={18} />
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--jhe-text-muted)' }}>
              {usuario?.nome || 'Gestor JHE'} • {roleGlobal}
            </div>
            <h2 className="text-base font-bold leading-tight" style={{ color: 'var(--jhe-text-main)' }}>
              Editor em tópicos
            </h2>
          </div>
        </div>

        {/* Bloco Direito (Ferramentas de Árvore, Pesquisa e Criação) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botões Desfazer / Refazer (Undo2 / Redo2) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={historyStack.length === 0}
              onClick={handleUndo}
              className="p-2 rounded-lg border disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--jhe-border-subtle)', color: 'var(--jhe-text-main)' }}
              title="Desfazer última movimentação"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              disabled={redoStack.length === 0}
              onClick={handleRedo}
              className="p-2 rounded-lg border disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--jhe-border-subtle)', color: 'var(--jhe-text-main)' }}
              title="Refazer movimentação"
            >
              <Redo2 size={15} />
            </button>
          </div>

          {/* Grupo de Expansão (jhe-tree-toggle-group) */}
          <div className="jhe-tree-toggle-group">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer hover:opacity-85"
              title="Abre todos os níveis da árvore simultaneamente"
            >
              <ChevronsUpDown size={13} />
              Expandir tudo
            </button>
            <div className="w-px h-4" style={{ backgroundColor: 'var(--jhe-border-subtle)' }} />
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer hover:opacity-85"
              title="Fecha todas as subárvores mantendo apenas Co-CEOs aberto"
            >
              <ChevronsDownUp size={13} />
              Recolher tudo
            </button>
          </div>

          {/* Campo de Pesquisa Interna ("Localizar um tópico...") */}
          <div className="relative w-64">
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
              className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs border bg-transparent focus:outline-none"
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
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Botão + Novo tópico (handleCreateNewRoot) */}
          <button
            type="button"
            onClick={handleCreateNewRoot}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer hover:opacity-95 shadow-xs"
            style={{ backgroundColor: 'var(--jhe-primary)' }}
          >
            <Plus size={15} />
            Novo tópico
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
          {/* Cabeçalho Fixo de 3 Colunas (div.topic-table-header) */}
          <div className="topic-table-header">
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

      {/* D. Botão Flutuante de Logs (jhe-btn-floating-logs) e Modal de Confirmação (ConfirmMoveModal) */}
      <button
        type="button"
        onClick={onOpenAuditModal}
        className="jhe-btn-floating-logs"
        title="Abrir Histórico de Auditoria e Logs"
      >
        <History size={18} />
        <span>Logs de Auditoria</span>
      </button>

      <ConfirmMoveModal
        isOpen={Boolean(confirmMoveData)}
        onClose={() => setConfirmMoveData(null)}
        onConfirm={handleConfirmMove}
        draggedNode={confirmMoveData?.draggedNode}
        targetNode={confirmMoveData?.targetParentNode}
        isLoading={isMoving}
      />
    </div>
  );
}
