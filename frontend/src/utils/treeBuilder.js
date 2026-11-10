/**
 * ============================================================================
 * JHE ORGANOGRAMA CORPORATIVO - CONSTRUTOR E NORMALIZADOR DA ÁRVORE
 * ----------------------------------------------------------------------------
 * Arquivo: treeBuilder.js
 * Módulo: Algoritmos de Grafos / Normalização e Precedência Hierárquica
 * Função Principal: Processa a lista plana de nós vinda do backend, valida
 * nós órfãos, calcula totais acumulados de colaboradores e aplica ordenação
 * rígida e determinística (Staff/OIA -> Diretorias -> Gerências -> Equipes).
 *
 * ----------------------------------------------------------------------------
 * GUIA RÁPIDO DE MANUTENÇÃO (ONDE EDITAR SE...):
 * • Alterar ordem de precedência por nível (slugs): Linha ~35 (SLUG_PRECEDENCE)
 * • Definir slugs classificados como Staff/Apoio: Linha ~28 (STAFF_SLUGS)
 * • Função de contagem acumulada de subordinados: Linha ~120 (calcularTotaisAcumulados)
 * • Algoritmo central de ordenação e montagem: Linha ~160 (buildAndSortOrgTree)
 * ============================================================================
 */

const STAFF_SLUGS = new Set(['staff', 'oia', 'apoio']);

/**
 * Peso secundário de desempate por nível hierárquico caso dois nós irmãos tenham a mesma `ordem`.
 * Mantém OIA e Staff agrupados antes da abertura horizontal das Diretorias Executivas.
 */
const SLUG_PRECEDENCE = {
  ceo: 1,
  oia: 2,
  staff: 3,
  diretoria: 4,
  gerencia: 5,
  unidade: 6,
  coordenacao: 7,
  apoio: 8,
  equipe: 9,
  contrato: 10
};

function isPlaceholder(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return (
    !s ||
    s.includes('a definir') ||
    s.includes('titular a definir') ||
    s.includes('vazio') ||
    s.includes('pendente') ||
    s.includes('nenhum') ||
    s === 'n/a' ||
    s === '-' ||
    s === 'null' ||
    s === 'undefined'
  );
}

function contarResponsaveisValidos(resp) {
  if (!resp) return 0;
  if (Array.isArray(resp)) {
    return resp.filter((r) => {
      const nome = typeof r === 'string' ? r : r?.nome;
      return !isPlaceholder(nome);
    }).length;
  }
  if (typeof resp === 'string') {
    if (isPlaceholder(resp)) return 0;
    if (resp.trim().startsWith('[') && resp.trim().endsWith(']')) {
      try {
        const arr = JSON.parse(resp);
        if (Array.isArray(arr)) {
          return arr.filter((r) => {
            const nome = typeof r === 'string' ? r : r?.nome;
            return !isPlaceholder(nome);
          }).length;
        }
      } catch (e) {}
    }
    const partes = resp.split(/ & |,|\be\b/i).map((s) => s.trim()).filter(Boolean);
    return partes.filter((p) => !isPlaceholder(p)).length;
  }
  return 0;
}

/**
 * Constrói a árvore hierárquica em memória, ordena estritamente os filhos de cada nó
 * pelo campo numérico `ordem` e retorna tanto a árvore aninhada quanto a lista plana
 * na sequência exata exigida pelo `d3-org-chart`.
 *
 * @param {Array<Object>} rawNodes Lista de nós vinda do backend
 * @returns {{ flatNodes: Array<Object>, rootNode: Object | null }}
 */
export function buildAndSortOrgTree(rawNodes = []) {
  if (!Array.isArray(rawNodes) || rawNodes.length === 0) {
    return { flatNodes: [], rootNode: null };
  }

  // Filtra nós operacionais transitórios (ex: ID 999, sigla PENDENTE ou Aguardando Alocação / Triagem)
  const validNodes = rawNodes.filter((raw) => {
    const id = Number(raw.id);
    const sigla = (raw.sigla || '').trim().toUpperCase();
    const titulo = (raw.titulo || '').toLowerCase();
    return (
      id !== 999 &&
      sigla !== 'PENDENTE' &&
      !titulo.includes('aguardando alocação') &&
      !titulo.includes('triagem')
    );
  });

  if (validNodes.length === 0) {
    return { flatNodes: [], rootNode: null };
  }

  const nodeMap = new Map();

  // 1. Clona e normaliza todos os nós garantindo IDs em String e inicializando `children`
  validNodes.forEach((raw) => {
    const idStr = String(raw.id);
    const hasParent =
      raw.parent_id !== null &&
      raw.parent_id !== undefined &&
      raw.parent_id !== '' &&
      String(raw.parent_id) !== '0';

    const parentIdStr = hasParent ? String(raw.parent_id) : null;
    const slug = (raw.nivel_slug || 'diretoria').toLowerCase();

    const colabs = Array.isArray(raw.colaboradores_diretos)
      ? raw.colaboradores_diretos
      : [];

    nodeMap.set(idStr, {
      ...raw,
      id: idStr,
      parentId: parentIdStr,
      parent_id: hasParent ? Number(raw.parent_id) : null,
      ordem: Number(raw.ordem) || 0,
      isStaffBranch: STAFF_SLUGS.has(slug) || Boolean(raw.isStaffBranch) || Boolean(raw._isAssistant),
      _isAssistant: Boolean(raw._isAssistant),
      _precedence: raw._isAssistant ? 1.5 : (SLUG_PRECEDENCE[slug] || 99),
      colaboradores_diretos: colabs,
      _expanded: false,
      children: []
    });
  });

  // 2. Associa cada nó ao array `children` do seu respectivo pai
  const roots = [];
  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId).children.push(node);
    } else {
      // Caso o parentId não exista no conjunto ativo, trata como raiz para evitar falha no d3.stratify
      node.parentId = null;
      roots.push(node);
    }
  });

  // 3. Ordena recursivamente o array `children` de cada nó estritamente por `ordem` ASC
  const sortChildrenRecursively = (children) => {
    children.sort((a, b) => {
      // Prioriza nós assistentes / coordenações centrais no eixo inicial/central
      if (a._isAssistant && !b._isAssistant) return -1;
      if (!a._isAssistant && b._isAssistant) return 1;

      const ordemDiff = (a.ordem || 0) - (b.ordem || 0);
      if (ordemDiff !== 0) return ordemDiff;

      const precDiff = (a._precedence || 99) - (b._precedence || 99);
      if (precDiff !== 0) return precDiff;

      return Number(a.id) - Number(b.id);
    });

    children.forEach((child) => {
      if (child.children && child.children.length > 0) {
        sortChildrenRecursively(child.children);
      }
    });
  };

  sortChildrenRecursively(roots);

  // 4. Percurso em pós-ordem: calcula dimensionamento recursivo (membros_diretos, total_equipe_acumulada e todas_pessoas)
  const calculateHeadcountsPostOrder = (node) => {
    const directColabs = Array.isArray(node.colaboradores_diretos) && node.colaboradores_diretos.length > 0
      ? node.colaboradores_diretos
      : (Array.isArray(node.membros_equipe) ? node.membros_equipe : []);

    let membrosDiretos = directColabs.length;
    if (membrosDiretos === 0) {
      membrosDiretos = contarResponsaveisValidos(node.responsavel);
    }

    node.membros_diretos = membrosDiretos;
    node.count_direto = membrosDiretos;

    // Mapa para evitar contagem duplicada do mesmo usuário em subárvores
    const personMap = new Map();
    directColabs.forEach((p) => {
      personMap.set(String(p.id), { ...p, setorOrigem: node.titulo });
    });

    let somaFilhos = 0;
    if (Array.isArray(node.children) && node.children.length > 0) {
      node.children.forEach((child) => {
        calculateHeadcountsPostOrder(child);
        somaFilhos += (child.total_equipe_acumulada || 0);

        if (Array.isArray(child.todas_pessoas)) {
          child.todas_pessoas.forEach((p) => {
            if (!personMap.has(String(p.id))) {
              personMap.set(String(p.id), p);
            }
          });
        }
      });
    }

    node.total_equipe_acumulada = membrosDiretos + somaFilhos;
    node.todas_pessoas = Array.from(personMap.values());
    node.count_total = node.total_equipe_acumulada;
  };

  roots.forEach(calculateHeadcountsPostOrder);

  // 5. Achata a árvore em pré-ordem/nível determinístico para o d3-org-chart
  const flatNodes = [];
  const traverse = (nodes, depth = 0) => {
    nodes.forEach((node, indexAmongSiblings) => {
      const { children, ...cleanNode } = node;
      flatNodes.push({
        ...cleanNode,
        _expanded: false,
        _depth: depth,
        _siblingIndex: indexAmongSiblings,
        _directChildrenCount: children.length
      });
      if (children.length > 0) {
        traverse(children, depth + 1);
      }
    });
  };

  traverse(roots, 0);

  return {
    flatNodes,
    rootNode: roots[0] || null
  };
}

export default buildAndSortOrgTree;
