import React, { useMemo, useState } from 'react';
import { Search, AlertTriangle } from 'lucide-react';

/**
 * OrganogramaMultiSelect Component
 * 
 * Componente de seleção múltipla hierárquica de setores/vínculos no organograma
 * com campo de busca em tempo real, indentação proporcional por profundidade,
 * tags de sigla institucional e banner informativo de Governança.
 *
 * @param {Array<Object>} props.nodes - Lista plana hierárquica com id, parent_id, titulo, nivel_nome, sigla, profundidade
 * @param {Array<number|string>} props.selectedIds - Array de IDs selecionados
 * @param {Function} props.onChange - Callback acionado com a nova lista de IDs [id1, id2, ...]
 * @param {boolean} [props.showGovernanceNote=true] - Exibir ou não a Nota de Governança abaixo
 * @param {string} [props.maxHeightClass='max-h-64 sm:max-h-72'] - Classe customizável de scroll
 */
export default function OrganogramaMultiSelect({
  nodes = [],
  selectedIds = [],
  onChange,
  showGovernanceNote = true,
  maxHeightClass = 'max-h-64 sm:max-h-72'
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Normalização de nós para garantir árvore ordenada e profundidade calculada caso não venha pronta
  const normalizedTreeNodes = useMemo(() => {
    if (!Array.isArray(nodes) || nodes.length === 0) return [];

    // Checagem se os nós já possuem profundidade calculada
    const hasDepthInfo = nodes.some(
      (n) => n.profundidade !== undefined || n._depth !== undefined
    );

    // Se já possuem parent_title ou estrutura de pais, criamos mapa para mapeamento de superior
    const nodeMap = new Map();
    nodes.forEach((n) => {
      nodeMap.set(String(n.id), n);
    });

    if (hasDepthInfo) {
      return nodes.map((n) => {
        const pId =
          n.parent_id !== null &&
          n.parent_id !== undefined &&
          n.parent_id !== '' &&
          String(n.parent_id) !== '0'
            ? String(n.parent_id)
            : null;
        const parentNode = pId ? nodeMap.get(pId) : null;
        const depth = Number(n.profundidade ?? n._depth ?? 0);

        return {
          ...n,
          depth,
          parent_title: n.parent_title || parentNode?.titulo || null,
          caminho_hierarquico:
            n.caminho_hierarquico ||
            (parentNode ? `${parentNode.titulo} > ${n.titulo}` : n.titulo)
        };
      });
    }

    // Caso a lista seja plana sem ordenação hierárquica pré-calculada, estruturamos como árvore
    const treeMap = new Map();
    nodes.forEach((n) => {
      treeMap.set(String(n.id), { ...n, children: [] });
    });

    const roots = [];
    treeMap.forEach((node) => {
      const pId =
        node.parent_id !== null &&
        node.parent_id !== undefined &&
        node.parent_id !== '' &&
        String(node.parent_id) !== '0'
          ? String(node.parent_id)
          : null;

      if (pId && treeMap.has(pId)) {
        treeMap.get(pId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Ordenação determinística de irmãos
    const sortList = (list) => {
      list.sort(
        (a, b) =>
          (Number(a.ordem) || 0) - (Number(b.ordem) || 0) ||
          Number(a.id) - Number(b.id)
      );
      list.forEach((child) => sortList(child.children));
    };
    sortList(roots);

    // Percurso para nivelamento ordenado com cálculo exato de profundidade
    const flatResult = [];
    const walk = (items, currentDepth = 0, parentNode = null) => {
      items.forEach((item) => {
        const { children, ...pureNode } = item;
        flatResult.push({
          ...pureNode,
          depth: currentDepth,
          profundidade: currentDepth,
          parent_title: parentNode?.titulo || null,
          caminho_hierarquico: parentNode
            ? `${parentNode.titulo} > ${item.titulo}`
            : item.titulo
        });
        if (children && children.length > 0) {
          walk(children, currentDepth + 1, item);
        }
      });
    };

    walk(roots, 0, null);

    // Garante que o nó de triagem (ID 999) sempre esteja disponível para alocação temporária
    const hasTriagemNode = flatResult.some(
      (n) => String(n.id) === '999' || n.sigla === 'PENDENTE'
    );
    if (!hasTriagemNode) {
      flatResult.push({
        id: 999,
        titulo: 'Aguardando Alocação / Triagem',
        sigla: 'PENDENTE',
        parent_id: 1,
        depth: 0,
        profundidade: 0,
        parent_title: 'Governança',
        nivel_nome: 'Apoio Operacional / Triagem',
        caminho_hierarquico: 'Aguardando Alocação / Triagem'
      });
    }

    return flatResult;
  }, [nodes]);

  // 2. Filtragem instantânea por título, sigla ou trilha hierárquica/nível
  const filteredNodes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return normalizedTreeNodes;

    return normalizedTreeNodes.filter((node) => {
      const matchTitulo = node.titulo?.toLowerCase().includes(term);
      const matchSigla = node.sigla?.toLowerCase().includes(term);
      const matchNivel = (node.nivel_nome || node.nivel_slug || '')
        .toLowerCase()
        .includes(term);
      const matchCaminho = (node.caminho_hierarquico || '')
        .toLowerCase()
        .includes(term);
      const matchParent = (node.parent_title || '')
        .toLowerCase()
        .includes(term);

      return (
        matchTitulo ||
        matchSigla ||
        matchNivel ||
        matchCaminho ||
        matchParent
      );
    });
  }, [normalizedTreeNodes, searchTerm]);

  // 3. Verificação e alternância de seleção
  const selectedSet = useMemo(() => {
    return new Set((selectedIds || []).map((id) => String(id)));
  }, [selectedIds]);

  const handleToggle = (nodeId) => {
    if (!onChange) return;
    const ID_PENDENTE = 999;
    const numId = Number(nodeId);
    let novasAreas = [...(selectedIds || [])];

    const jaSelecionado = novasAreas.some((id) => Number(id) === numId);

    if (jaSelecionado) {
      // Remove a área selecionada
      novasAreas = novasAreas.filter((id) => Number(id) !== numId);
    } else {
      if (numId === ID_PENDENTE) {
        // Se escolheu explicitamente "Pendente de Vínculo", limpa as outras áreas
        novasAreas = [ID_PENDENTE];
      } else {
        // Se escolheu uma área real definitiva, adiciona ela e PURGA o nó transitório pendente
        novasAreas = novasAreas.filter((id) => Number(id) !== ID_PENDENTE);
        novasAreas.push(numId);
      }
    }

    onChange(novasAreas);
  };

  return (
    <div className="w-full flex flex-col">
      {/* 1. Campo de Busca Superior */}
      <div className="relative mb-2">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar área, diretoria ou cargo..."
          aria-label="Pesquisar área, diretoria ou cargo no organograma"
          className="w-full rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-850 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 focus:border-sky-300 dark:focus:border-sky-700 transition"
        />
      </div>

      {/* 2. Área Rolável com Nós Estruturados */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div
          className={`${maxHeightClass} overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70`}
          role="group"
          aria-label="Lista de nós do organograma"
        >
          {filteredNodes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma área localizada para "{searchTerm}".
            </div>
          ) : (
            filteredNodes.map((node) => {
              const isChecked = selectedSet.has(String(node.id));
              const depth = node.depth ?? 0;

              // Identação proporcional baseada na profundidade (profundidade 0: sem recuo)
              const depthPaddingClass =
                depth === 0
                  ? 'pl-3 sm:pl-3.5'
                  : depth === 1
                  ? 'pl-6 sm:pl-7'
                  : depth === 2
                  ? 'pl-10 sm:pl-11'
                  : depth === 3
                  ? 'pl-14 sm:pl-16'
                  : 'pl-16 sm:pl-20';

              const isTriagem =
                String(node.id) === '999' ||
                node.sigla === 'PENDENTE' ||
                (node.titulo && node.titulo.toLowerCase().includes('triagem'));

              // Subtítulo hierárquico: "Área Superior • Nível Hierárquico"
              const superiorTitle = isTriagem
                ? 'Governança & RH'
                : node.parent_title || (depth === 0 ? 'Governança' : 'Diretoria Superior');
              const nivelLabel = isTriagem
                ? 'Alocação Transitória'
                : node.nivel_nome || (depth === 0 ? 'Diretoria Executiva' : 'Nível Setorial');
              const subtitleText = `${superiorTitle} • ${nivelLabel}`;

              return (
                <label
                  key={node.id}
                  className={`flex items-center gap-3 pr-3.5 py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${depthPaddingClass} ${
                    isChecked
                      ? isTriagem
                        ? 'bg-amber-50/60 dark:bg-amber-950/30'
                        : 'bg-sky-50/30 dark:bg-sky-950/20'
                      : ''
                  }`}
                >
                  {/* Indicador de profundidade (traço suave para subordinados) */}
                  {depth > 0 && (
                    <span
                      className="text-slate-300 dark:text-slate-600 font-normal select-none -mr-1"
                      aria-hidden="true"
                    >
                      —
                    </span>
                  )}

                  {/* Checkbox Customizado */}
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(node.id)}
                    aria-label={`Vincular à área ${node.titulo}`}
                    className="rounded-md border-slate-300 dark:border-slate-600 text-[#0E284E] focus:ring-sky-200 focus:ring-offset-0 w-4 h-4 cursor-pointer shrink-0 transition"
                  />

                  {/* Informações do Setor */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        {node.titulo}
                      </span>

                      {/* Badge opcional de sigla institucional ou destaque de triagem */}
                      {isTriagem ? (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/80">
                          <AlertTriangle size={10} className="text-amber-600 dark:text-amber-400" />
                          Triagem
                        </span>
                      ) : node.sigla ? (
                        <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                          {node.sigla}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 truncate">
                      {isTriagem
                        ? 'Setor transitório para colaboradores sem área definida no momento do cadastro'
                        : subtitleText}
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Banner "Nota de Governança" */}
      {showGovernanceNote && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 rounded-xl p-3.5 mt-3 text-amber-900 dark:text-amber-200 text-xs leading-relaxed shadow-2xs">
          <strong className="font-semibold text-amber-950 dark:text-amber-100">
            Nota de Governança:{' '}
          </strong>
          <span className="italic">
            Novos usuários recebem a senha provisória padrão JHE@2026 e deverão
            obrigatoriamente alterá-la no primeiro acesso.
          </span>
        </div>
      )}
    </div>
  );
}
