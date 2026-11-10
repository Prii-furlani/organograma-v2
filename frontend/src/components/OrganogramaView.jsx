import React, { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { OrgChart } from 'd3-org-chart';
import * as d3 from 'd3';
import Swal from 'sweetalert2';
import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useTheme } from '../context/ThemeContext';
import { buildAndSortOrgTree } from '../utils/treeBuilder';
import CanvasControls from './CanvasControls';
import { parseResponsaveis, formatResponsaveisText, getInitials, isPlaceholderResponsavel } from './MultiResponsavelInput';
import { X, Briefcase, Mail } from 'lucide-react';

/**
 * Mapa de cores indicadoras discretas por nível hierárquico JHE
 */
function getLevelAccentColor(slug = '') {
  const s = slug.toLowerCase();
  if (['ceo', 'diretoria', 'oia', 'staff'].includes(s)) return '#0E284E';
  if (['coordenacao', 'gerencia', 'unidade'].includes(s)) return '#B4783C';
  if (s === 'apoio') return '#0284C7';
  return '#64748B';
}

const CARD_WIDTH = 260;
const CARD_HEIGHT = 140;
const VERTICAL_GAP = 95; // Espaçamento vertical entre a base do pai e o topo do filho (80px - 100px)
const HORIZONTAL_GAP = 45; // Espaçamento horizontal mínimo entre nós irmãos contíguos (>= 40px)
const NEIGHBOUR_GAP = 60; // Espaçamento entre blocos de subárvores vizinhas
const MARGEM_PADRAO = VERTICAL_GAP; // Respiro visual entre as camadas no estado recolhido

/**
 * Helper: Identifica se um nó é filho imediato de Co-CEOs (ID 1 ou depth 0)
 */
function ehFilhoDeCeo(node) {
  if (!node || !node.parent) return false;
  const parentId = node.parent.data?.id ?? node.parent.id;
  return Number(parentId) === 1 || node.parent.depth === 0;
}

/**
 * Identifica se um nó é Diretoria Executiva
 */
const ehDiretoriaExecutiva = (nodeData = {}) => {
  const slug = String(nodeData.nivel_slug || nodeData.slug_nivel || '').toLowerCase();
  const nomeNivel = String(nodeData.nivel_nome || '').toLowerCase();
  const titulo = String(nodeData.titulo || '').toLowerCase();
  const nivelOrdem = Number(nodeData.nivel_ordem ?? nodeData.ordem_hierarquica);
  const nivelId = Number(nodeData.nivel_id);

  return (
    slug === 'diretoria' ||
    nivelId === 4 ||
    nivelOrdem === 2 ||
    nomeNivel.includes('diretoria') ||
    titulo.startsWith('diretoria') ||
    titulo.includes('diretoria')
  );
};

/**
 * Identifica se um nó (ou qualquer um de seus ancestrais imediatos sob o CEO) pertence à linha de Diretorias
 */
const pertenceAoRamoDiretoria = (node) => {
  if (!node || typeof node.ancestors !== 'function') return false;
  return node.ancestors().some((anc) => {
    const ehFilhoDiretoCeo = anc.parent && (Number(anc.parent.data?.id) === 1 || anc.parent.depth === 0);
    return ehFilhoDiretoCeo && ehDiretoriaExecutiva(anc.data);
  });
};

/**
 * Calcula a descida dinâmica baseada nos nós da Linha 1 atualmente expandidos
 */
const calcularDeslocamentoVerticalDinamico = (rootNode) => {
  if (!rootNode || !rootNode.children) {
    return CARD_HEIGHT + MARGEM_PADRAO;
  }

  // Nós ligados diretamente ao CEO que NÃO são Diretorias (Coordenações, OIA, Staff, etc.)
  const nosLinhaSuperior = rootNode.children.filter(
    (n) => (Number(n.data?.parent_id) === 1 || n.parent === rootNode) && !ehDiretoriaExecutiva(n.data)
  );

  let maiorProfundidadeAberta = 0;
  let maxBottomCoordenacoes = 0;

  nosLinhaSuperior.forEach((noCoord) => {
    // Se o nó de coordenação tiver filhos abertos na árvore
    if (noCoord.children && noCoord.children.length > 0) {
      noCoord.each((desc) => {
        const profundidadeRelativa = desc.depth - noCoord.depth;
        if (profundidadeRelativa > maiorProfundidadeAberta) {
          maiorProfundidadeAberta = profundidadeRelativa;
        }
      });
    }

    // Coordenada geométrica real de todos os descendentes abertos
    noCoord.descendants().forEach((desc) => {
      const bottom = desc.y + (desc.height || CARD_HEIGHT);
      if (bottom > maxBottomCoordenacoes) {
        maxBottomCoordenacoes = bottom;
      }
    });
  });

  // Espaço base + altura proporcional para cada nível de subárvore aberto no andar superior
  const offsetPorProfundidade =
    CARD_HEIGHT +
    MARGEM_PADRAO +
    maiorProfundidadeAberta * (CARD_HEIGHT + MARGEM_PADRAO);

  let offsetPorGeometria = 0;
  if (nosLinhaSuperior.length > 0 && maxBottomCoordenacoes > 0) {
    const yLinha1 = nosLinhaSuperior[0].y;
    offsetPorGeometria = (maxBottomCoordenacoes - yLinha1) + MARGEM_PADRAO;
  }

  return Math.max(offsetPorProfundidade, offsetPorGeometria);
};

/**
 * Helper: Calcula os limites horizontais reais de uma subárvore (considerando todos os nós descendentes abertos)
 */
function getSubtreeBounds(node) {
  const nodeW = node.width || CARD_WIDTH;
  let minX = node.x - nodeW / 2;
  let maxX = node.x + nodeW / 2;

  if (node.children && node.children.length > 0) {
    node.descendants().forEach((desc) => {
      const w = desc.width || CARD_WIDTH;
      const left = desc.x - w / 2;
      const right = desc.x + w / 2;
      if (left < minX) minX = left;
      if (right > maxX) maxX = right;
    });
  }
  return { minX, maxX, width: maxX - minX };
}

/**
 * Layout Handler: Reorganiza os filhos imediatos do nó raiz ("Co-CEOs") em dois andares horizontais distintos:
 * - Andar Superior (Linha 1): Qualquer nível hierárquico sob o CEO que NÃO seja Diretoria Executiva
 * - Andar Inferior (Linha 2): Estritamente Diretorias Executivas e suas subárvores subordinadas
 * - Prevenção Estrita de Colisão: Assegura que nenhum nó filho contíguo colida ou se sobreponha (ex: Apoio ao Compliance e Consultoria).
 */
function organizarFilhosEmDoisAndares(rootNode) {
  if (!rootNode || !Array.isArray(rootNode.children) || rootNode.children.length === 0) {
    return;
  }

  const linha1Nodes = [];
  const linha2Nodes = [];

  rootNode.children.forEach((child) => {
    if (ehDiretoriaExecutiva(child.data)) {
      linha2Nodes.push(child);
    } else {
      linha1Nodes.push(child);
    }
  });

  // Se não houver Diretorias simultaneamente, o layout nativo atende
  if (linha2Nodes.length === 0) {
    return;
  }

  // Deslocamento vertical dinâmico baseado no estado de nós abertos na Linha 1
  const Y_OFFSET_LINHA_2 = calcularDeslocamentoVerticalDinamico(rootNode);

  // 1. Andar Superior (Linha 1): Garante espaçamento livre entre subárvores contíguas
  if (linha1Nodes.length > 0) {
    linha1Nodes.sort((a, b) => a.x - b.x);

    let currentRightLimit = -Infinity;
    linha1Nodes.forEach((node, idx) => {
      const bounds = getSubtreeBounds(node);
      if (idx > 0 && bounds.minX < currentRightLimit + HORIZONTAL_GAP) {
        const shiftX = (currentRightLimit + HORIZONTAL_GAP) - bounds.minX;
        node.descendants().forEach((desc) => {
          desc.x += shiftX;
        });
      }
      const updatedBounds = getSubtreeBounds(node);
      currentRightLimit = updatedBounds.maxX;
    });

    // Centraliza o bloco inteiro da Linha 1 simetricamente sob o nó raiz (CEOs)
    let minXL1 = Infinity;
    let maxXL1 = -Infinity;
    linha1Nodes.forEach((node) => {
      const b = getSubtreeBounds(node);
      if (b.minX < minXL1) minXL1 = b.minX;
      if (b.maxX > maxXL1) maxXL1 = b.maxX;
    });

    const centerL1 = (minXL1 + maxXL1) / 2;
    const deltaXCenterL1 = isFinite(centerL1) ? (rootNode.x - centerL1) : 0;
    linha1Nodes.forEach((node) => {
      node.descendants().forEach((desc) => {
        desc.x += deltaXCenterL1;
      });
    });
  }

  // 2. Andar Inferior (Linha 2): Diretorias Executivas e toda a cascata subordinada
  linha2Nodes.sort((a, b) => a.x - b.x);
  let currentRightLimitL2 = -Infinity;
  linha2Nodes.forEach((dirNode, idx) => {
    const bounds = getSubtreeBounds(dirNode);
    if (idx > 0 && bounds.minX < currentRightLimitL2 + HORIZONTAL_GAP) {
      const shiftX = (currentRightLimitL2 + HORIZONTAL_GAP) - bounds.minX;
      dirNode.descendants().forEach((desc) => {
        desc.x += shiftX;
      });
    }
    const updatedBounds = getSubtreeBounds(dirNode);
    currentRightLimitL2 = updatedBounds.maxX;
  });

  let minXLinha2 = Infinity;
  let maxXLinha2 = -Infinity;
  linha2Nodes.forEach((dirNode) => {
    const b = getSubtreeBounds(dirNode);
    if (b.minX < minXLinha2) minXLinha2 = b.minX;
    if (b.maxX > maxXLinha2) maxXLinha2 = b.maxX;
  });

  const centerLinha2 = (minXLinha2 + maxXLinha2) / 2;
  const deltaXLinha2 = isFinite(centerLinha2) ? (rootNode.x - centerLinha2) : 0;

  // Aplica o deslocamento horizontal e o deslocamento vertical DINÂMICO
  linha2Nodes.forEach((dirNode) => {
    dirNode.descendants().forEach((desc) => {
      desc.x += deltaXLinha2;
      desc.y += Y_OFFSET_LINHA_2;
    });
  });
}

const OrganogramaView = forwardRef(function OrganogramaView(
  { nos, niveis = [], onSelectNode, onCreateNode, onCanvasBackgroundClick, onOpenQuickGuide },
  ref
) {
  const d3ContainerRef = useRef(null);
  const chartRef = useRef(null);
  const { theme } = useTheme();
  const [renderError, setRenderError] = useState(null);
  const [isCanvasLocked, setIsCanvasLocked] = useState(false);
  const [modoVisao, setModoVisao] = useState('executivo'); // 'completo' | 'executivo'
  const hasInitializedTreeRef = useRef(false);

  // Estado e Mapa do Popover Flutuante Desacoplado de Colaboradores
  const [teamPopover, setTeamPopover] = useState(null);
  const teamPopoverRef = useRef(teamPopover);
  teamPopoverRef.current = teamPopover;
  const hoverTimeoutRef = useRef(null);
  const nodePopoverDataMapRef = useRef(new Map());

  // Abertura / Posicionamento Dinâmico do Popover
  const openPopoverForBadge = useCallback((badgeEl, isClick = false) => {
    if (!badgeEl) return;
    const nodeId = badgeEl.getAttribute('data-node-id');
    if (!nodeId) return;

    if (isClick && teamPopoverRef.current && teamPopoverRef.current.nodeId === nodeId && teamPopoverRef.current.isPinned) {
      setTeamPopover(null);
      return;
    }

    const data = nodePopoverDataMapRef.current.get(String(nodeId));
    if (!data) return;

    const rect = badgeEl.getBoundingClientRect();
    const popoverWidth = 320;
    const popoverMaxHeight = 300;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left < 16) left = 16;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - 16 - popoverWidth;
    }

    let placement = 'top';
    let top = rect.top - 8;
    if (top - popoverMaxHeight < 16) {
      placement = 'bottom';
      top = rect.bottom + 8;
    }

    setTeamPopover({
      nodeId,
      pos: { x: left, y: top, placement },
      data,
      isPinned: isClick
    });
  }, []);

  const handleBadgeMouseLeave = useCallback(() => {
    if (teamPopoverRef.current?.isPinned) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setTeamPopover((prev) => (prev?.isPinned ? prev : null));
    }, 250);
  }, []);

  const handlePopoverMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handlePopoverMouseLeave = useCallback(() => {
    if (teamPopoverRef.current?.isPinned) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setTeamPopover((prev) => (prev?.isPinned ? prev : null));
    }, 250);
  }, []);

  const niveisRef = useRef(niveis);
  niveisRef.current = niveis;

  const onSelectNodeRef = useRef(onSelectNode);
  onSelectNodeRef.current = onSelectNode;

  // 1. Filtragem na Visualização Canvas:
  // Remove unidades operacionais/administrativas transitórias de triagem (ex: ID 999, sigla PENDENTE ou Aguardando Alocação / Triagem)
  // para que NÃO sejam desenhadas na hierarquia visual da empresa no Canvas D3
  const dadosCanvas = useMemo(() => {
    if (!Array.isArray(nos)) return [];
    return nos.filter((no) => {
      const id = Number(no.id);
      const sigla = (no.sigla || '').trim().toUpperCase();
      const titulo = (no.titulo || '').toLowerCase();
      return (
        id !== 999 &&
        sigla !== 'PENDENTE' &&
        !titulo.includes('aguardando alocação') &&
        !titulo.includes('triagem')
      );
    });
  }, [nos]);

  // Identificação e tratamento das Coordenações Centrais ligadas aos Co-CEOs (Linha Superior 1)
  const idsCoordenacoesCentrais = useMemo(
    () => [
      'secretaria executiva',
      'secretária executiva',
      'planejamento estratégico',
      'planejamento estrategico',
      'planejamento estrátegico',
      'compliance',
      'sgi',
      'esg',
      'oia',
      'staff',
      'auditoria',
      'assessoria'
    ],
    []
  );

  const dadosTratados = useMemo(() => {
    return dadosCanvas.map((no) => {
      const tituloLower = (no.titulo || '').toLowerCase();
      const siglaLower = (no.sigla || '').trim().toLowerCase();
      const ehCoordenacaoCentral =
        Number(no.parent_id) === 1 && // Subordinado direto a Co-CEOs
        (idsCoordenacoesCentrais.some((nome) => tituloLower.includes(nome)) ||
          idsCoordenacoesCentrais.includes(siglaLower));

      return {
        ...no,
        // Ativa o layout vertical central/lateral no d3-org-chart para não expandir a tela horizontalmente
        _isAssistant: ehCoordenacaoCentral,
        isStaffBranch: ehCoordenacaoCentral || Boolean(no.isStaffBranch)
      };
    });
  }, [dadosCanvas, idsCoordenacoesCentrais]);

  // Processa e ordena rigidamente os nós irmãos via treeBuilder.js antes de entregar ao D3
  const { flatNodes } = useMemo(() => buildAndSortOrgTree(dadosTratados), [dadosTratados]);

  // Centraliza e destaca um nó específico no Canvas
  const focusAndHighlightNode = useCallback((nodeId) => {
    if (!chartRef.current || !nodeId) return;
    const targetId = String(nodeId);
    try {
      chartRef.current.clearHighlighting();
      // setHighlighted expande automaticamente os ancestrais na árvore e foca
      chartRef.current.setHighlighted(targetId);
      chartRef.current.setCentered(targetId);
      chartRef.current.render();
    } catch (err) {
      console.error('Erro ao focar e centralizar nó no D3:', err);
    }
  }, []);

  // Centralização Automática perfeita no Nó Raiz (CEOs) com zoom 1 (100%)
  const recenterRootNode = useCallback((animate = true) => {
    if (!chartRef.current) return;
    try {
      const chartState = chartRef.current.getChartState?.();
      if (!chartState) return;
      const { root, svg, zoomBehavior, centerG, duration } = chartState;
      if (!root || !svg || !zoomBehavior) return;

      const w = chartState.svgWidth || d3ContainerRef.current?.clientWidth || window.innerWidth;
      const h = chartState.svgHeight || d3ContainerRef.current?.clientHeight || (window.innerHeight - 64);

      const rootX = root.x ?? 0;
      const rootY = root.y ?? 0;
      const cardHeight = root.height || CARD_HEIGHT;
      const centerY = rootY + cardHeight / 2;

      // Centraliza geometricamente o card CEO na viewport com zoom travado em 1 (100%)
      const transform = d3.zoomIdentity
        .translate(w / 2, h / 2)
        .scale(1)
        .translate(-rootX, -centerY);

      chartState.lastTransform = transform;

      if (animate) {
        svg.transition().duration(duration || 350).call(zoomBehavior.transform, transform);
        if (centerG) {
          centerG.transition().duration(duration || 350).attr('transform', 'translate(0,0)');
        }
      } else {
        svg.call(zoomBehavior.transform, transform);
        if (centerG) {
          centerG.attr('transform', 'translate(0,0)');
        }
      }
    } catch (err) {
      console.warn('Erro ao recentralizar nó raiz CEOs:', err);
    }
  }, []);

  // FitView Inteligente: se apenas a raiz estiver visível, recentraliza sem super-zoom; senão, enquadra a árvore
  const handleFitView = useCallback(() => {
    if (!chartRef.current || isCanvasLocked) return;
    chartRef.current.clearHighlighting();
    const chartState = chartRef.current.getChartState?.();
    const root = chartState?.root;
    if (!root || !root.children || root.children.length === 0) {
      recenterRootNode(true);
    } else {
      chartRef.current.fit();
    }
  }, [isCanvasLocked, recenterRootNode]);

  // Limpa destaques visuais e re-renderiza o gráfico
  const clearHighlight = useCallback(() => {
    if (!chartRef.current) return;
    try {
      chartRef.current.clearHighlighting();
      chartRef.current.render();
    } catch (err) {
      console.error('Erro ao limpar destaque do D3:', err);
    }
  }, []);

  // Alternância de Visão Executiva vs. Completa
  const handleToggleModoVisao = useCallback(() => {
    if (!chartRef.current || isCanvasLocked) return;
    chartRef.current.clearHighlighting();

    if (modoVisao === 'completo') {
      // Ativar Modo Executivo:
      // Mantém a raiz expandida e colapsa os nós filhos diretos (Coordenações e Diretorias)
      // Desta forma, Co-CEOs, Coordenações/Staff (Linha 1) e as 4 Diretorias (Linha 2) ficam visíveis,
      // enquanto todas as gerências, contratos e equipes técnicas subordinadas ficam colapsadas.
      const chartState = chartRef.current.getChartState?.();
      if (chartState?.data) {
        chartState.data.forEach((d) => {
          const isRoot = !d.parentId && !d.parent_id || Number(d.id) === 1;
          d._expanded = isRoot;
        });
        chartRef.current.render().fit();
      }
      setModoVisao('executivo');

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Visão Executiva Ativada',
        text: 'Exibindo Co-CEOs, Coordenações Centrais e as 4 Diretorias Executivas.',
        showConfirmButton: false,
        timer: 3000
      });
    } else {
      // Ativar Modo Completo:
      chartRef.current.expandAll().fit();
      setModoVisao('completo');

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Visão Completa Ativada',
        text: 'Todos os níveis, gerências e contratos expandidos.',
        showConfirmButton: false,
        timer: 3000
      });
    }
  }, [modoVisao, isCanvasLocked]);

  // Exportação em Alta Resolução (Full Content Bounding Box sem Escala Reduzida - 1:1)
  const handleExportCanvas = useCallback(
    async (format = 'png') => {
      if (!chartRef.current || !d3ContainerRef.current) return;
      const container = d3ContainerRef.current;

      let origChartTransform = null;
      let origSvgWidth = null;
      let origSvgHeight = null;

      try {
        const isDark = theme === 'dark';
        const bg = isDark ? '#0B132B' : '#FFFFFF';
        const dataStr = new Date().toISOString().slice(0, 10);
        const prefixo = modoVisao === 'executivo' ? 'organograma_executivo_jhe_' : 'organograma_completo_jhe_';
        const nomeArquivo = `${prefixo}${dataStr}`;

        chartRef.current.imageName(nomeArquivo);

        // 1. Cálculo da Caixa Delimitadora Real (Full Content Bounding Box)
        const chartState = chartRef.current.getChartState?.() || {};
        const root = chartState.root;
        const visibleNodes = root ? root.descendants() : [];

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        visibleNodes.forEach((d) => {
          const w = d.width || CARD_WIDTH;
          const h = d.height || CARD_HEIGHT;
          const left = d.x - w / 2;
          const right = d.x + w / 2;
          const top = d.y;
          const bottom = d.y + h;

          if (left < minX) minX = left;
          if (right > maxX) maxX = right;
          if (top < minY) minY = top;
          if (bottom > maxY) maxY = bottom;
        });

        if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
          minX = -CARD_WIDTH / 2;
          maxX = CARD_WIDTH / 2;
          minY = 0;
          maxY = CARD_HEIGHT;
        }

        // Margem de segurança de 80px em cada lado (160px de respiro total)
        const MARGIN = 80;
        const totalTreeWidth = Math.ceil((maxX - minX) + MARGIN * 2);
        const totalTreeHeight = Math.ceil((maxY - minY) + MARGIN * 2);

        // 2. Feedback Visual de Processamento
        const formatTitle =
          format === 'pdf'
            ? 'Gerando prancha PDF sob medida...'
            : format === 'svg'
            ? 'Gerando vetor SVG com estilos...'
            : 'Gerando imagem em alta resolução...';

        Swal.fire({
          title: formatTitle,
          text: 'Renderizando árvore completa em escala 1:1 com nitidez máxima.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // 3. Aplica classe de isolamento para omitir popovers suspensos e controles
        container.classList.add('is-exporting');

        // 4. Salva o estado atual e aplica o enquadramento em escala 1:1 no DOM
        const svgEl = container.querySelector('svg.svg-chart-container') || container.querySelector('svg');
        const chartEl = svgEl?.querySelector('g.chart');
        origChartTransform = chartEl?.getAttribute('transform');
        origSvgWidth = svgEl?.getAttribute('width');
        origSvgHeight = svgEl?.getAttribute('height');

        if (chartEl) {
          chartEl.setAttribute('transform', `translate(${-minX + MARGIN}, ${-minY + MARGIN}) scale(1)`);
        }
        if (svgEl) {
          svgEl.setAttribute('width', `${totalTreeWidth}`);
          svgEl.setAttribute('height', `${totalTreeHeight}`);
        }

        // Remove / oculta explicitamente do DOM todos os popovers antes da captura
        const popovers = container.querySelectorAll('.team-popover, .team-tooltip-popover, .no-export');
        popovers.forEach((el) => {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('opacity', '0', 'important');
        });

        // Aguarda estabilização do repaint do navegador
        await new Promise((resolve) => setTimeout(resolve, 100));

        const treeElement = document.getElementById('organograma-tree-content') || container;

        const options = {
          width: totalTreeWidth,
          height: totalTreeHeight,
          backgroundColor: bg,
          filter: (node) => {
            if (!node) return true;
            if (node.nodeType === 1) {
              const cl = node.classList;
              if (cl) {
                if (cl.contains('no-export')) return false;
                if (cl.contains('team-popover')) return false;
                if (cl.contains('team-tooltip-popover')) return false;
                if (cl.contains('canvas-controls-floating')) return false;
              }
            }
            return true;
          },
          style: {
            transform: 'none',
            transformOrigin: 'top left',
            width: `${totalTreeWidth}px`,
            height: `${totalTreeHeight}px`
          }
        };

        if (format === 'svg') {
          // Geração de SVG via html-to-image para incorporar todos os estilos CSS/Tailwind e fontes
          const svgDataUrl = await toSvg(treeElement, options);
          const link = document.createElement('a');
          link.download = `${nomeArquivo}.svg`;
          link.href = svgDataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Vetor SVG Exportado',
            text: 'Arquivo vetorial com estilos e fontes incorporados em escala 1:1.',
            showConfirmButton: false,
            timer: 3000
          });
          return;
        }

        // Para PNG e PDF: capturar bitmap em alta densidade (pixelRatio: 2)
        const pngOptions = {
          ...options,
          pixelRatio: 2,
          quality: 0.98
        };
        const dataUrl = await toPng(treeElement, pngOptions);

        if (format === 'pdf') {
          // Criação da prancha PDF proporcional sob medida (sem deformação ou esmagamento em folha fixa A4)
          const orientation = totalTreeWidth >= totalTreeHeight ? 'landscape' : 'portrait';
          const pdf = new jsPDF({
            orientation,
            unit: 'px',
            format: [totalTreeWidth, totalTreeHeight]
          });

          // Preenchimento de fundo corporativo consistente (#0B132B em dark mode)
          pdf.setFillColor(isDark ? 11 : 255, isDark ? 19 : 255, isDark ? 43 : 255);
          pdf.rect(0, 0, totalTreeWidth, totalTreeHeight, 'F');

          pdf.addImage(dataUrl, 'PNG', 0, 0, totalTreeWidth, totalTreeHeight);
          pdf.save(`${nomeArquivo}.pdf`);

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Documento PDF Exportado',
            text: 'Prancha proporcional sob medida em alta definição (escala 1:1 perfeita).',
            showConfirmButton: false,
            timer: 2500
          });
        } else {
          // Download da imagem PNG em alta resolução
          const link = document.createElement('a');
          link.download = `${nomeArquivo}.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Imagem PNG Exportada',
            text: 'Árvore completa capturada em escala 1:1 com alta resolução nítida (2x).',
            showConfirmButton: false,
            timer: 3000
          });
        }
      } catch (err) {
        console.error('Erro ao exportar organograma:', err);
        Swal.fire({
          icon: 'error',
          title: 'Erro na exportação',
          text: `Não foi possível gerar a imagem: ${err.message}`,
          confirmButtonColor: '#0E284E'
        });
      } finally {
        // Restaura imediatamente a visualização do usuário ao zoom/pan exato prévio
        try {
          const svgEl = container.querySelector('svg.svg-chart-container') || container.querySelector('svg');
          const chartEl = svgEl?.querySelector('g.chart');
          const chartState = chartRef.current?.getChartState?.();
          const { zoomBehavior, lastTransform } = chartState || {};

          if (chartEl && origChartTransform) chartEl.setAttribute('transform', origChartTransform);
          if (svgEl && origSvgWidth) svgEl.setAttribute('width', origSvgWidth);
          if (svgEl && origSvgHeight) svgEl.setAttribute('height', origSvgHeight);

          if (svgEl && zoomBehavior && lastTransform) {
            d3.select(svgEl).call(zoomBehavior.transform, lastTransform);
          }
          const popovers = container.querySelectorAll('.team-popover, .team-tooltip-popover, .no-export');
          popovers.forEach((el) => {
            el.style.removeProperty('display');
            el.style.removeProperty('visibility');
            el.style.removeProperty('opacity');
          });
        } catch (_) {}
        container.classList.remove('is-exporting');
      }
    },
    [theme, modoVisao]
  );

  // Expõe focusNode(nodeId), clearHighlight(), exportImage() e toggleExecutiveView() para componentes externos
  useImperativeHandle(
    ref,
    () => ({
      focusNode(nodeId) {
        focusAndHighlightNode(nodeId);
      },
      clearHighlight() {
        clearHighlight();
      },
      clearFocus() {
        clearHighlight();
      },
      exportImage(format = 'png') {
        handleExportCanvas(format);
      },
      toggleExecutiveView() {
        handleToggleModoVisao();
      },
      recenterRoot() {
        recenterRootNode(true);
      }
    }),
    [focusAndHighlightNode, clearHighlight, handleExportCanvas, handleToggleModoVisao, recenterRootNode]
  );

  // Bloqueia ou desbloqueia o zoom/pan do D3 quando isCanvasLocked alterna
  useEffect(() => {
    if (!d3ContainerRef.current) return;
    const svgEl = d3ContainerRef.current.querySelector('svg.svg-chart-container');
    if (!svgEl) return;

    if (isCanvasLocked) {
      d3.select(svgEl).on('.zoom', null);
    } else if (chartRef.current) {
      const chartState = chartRef.current.getChartState?.();
      if (chartState?.zoomBehavior) {
        d3.select(svgEl).call(chartState.zoomBehavior);
      } else {
        chartRef.current.render();
      }
    }
  }, [isCanvasLocked]);

  useEffect(() => {
    if (!d3ContainerRef.current || !Array.isArray(flatNodes) || flatNodes.length === 0) return;

    try {
      setRenderError(null);

      const isFirstMount = !chartRef.current;
      if (isFirstMount) {
        chartRef.current = new OrgChart();
      }

      const isDark = theme === 'dark';
      const lineStroke = isDark ? '#334155' : '#CBD5E1';
      const staffLineStroke = isDark ? '#475569' : '#94A3B8';

      // Clona e preserva bindings nativos do d3-org-chart para evitar perda de helpers essenciais (nodeFlexSize, compact, etc.)
      const defaultLayoutBindings = chartRef.current.layoutBindings();
      const defaultTop = defaultLayoutBindings.top || {};

      chartRef.current
        .container(d3ContainerRef.current)
        .data(flatNodes)
        .initialExpandLevel(0)
        .layout('top')
        .compact(false)
        .nodeId((d) => d.id)
        .parentNodeId((d) => d.parentId)
        .nodeWidth((d) => CARD_WIDTH)
        .nodeHeight((d) => CARD_HEIGHT)
        // Espaçamento vertical entre a base do nó pai e o topo do nó filho (mínimo 80px a 100px)
        .childrenMargin(() => VERTICAL_GAP)
        // Espaçamento horizontal entre subárvores e blocos vizinhos
        .neighbourMargin(() => NEIGHBOUR_GAP)
        // Distância mínima entre nós irmãos contíguos (mínimo 40px)
        .siblingsMargin(() => HORIZONTAL_GAP)
        // Intercepta e reorganiza a profundidade vertical e eixos em dois andares horizontais
        .layoutBindings({
          ...defaultLayoutBindings,
          top: {
            ...defaultTop,
            // Reorganiza os nós a partir do nó raiz em duas linhas horizontais sob Co-CEOs
            swap: (node) => {
              if (node.depth === 0) {
                organizarFilhosEmDoisAndares(node);
              }
            },
            nodeLeftX: (node) => -node.width / 2,
            nodeRightX: (node) => node.width / 2,
            nodeTopY: (node) => 0,
            nodeBottomY: (node) => node.height,
            linkX: (node) => node.x,
            linkY: (node) => node.y,
            linkParentX: (node) => node.parent.x,
            linkParentY: (node) => node.parent.y + node.parent.height
          }
        })
        // Sobrescreve o gerador de links com traçado ortogonal em "T" invertido estrito e limpo
        .diagonal(function (n, p) {
          // n: nó filho / destino (target)
          // p: nó pai / origem (source)
          if (!n || !p) return '';

          // 1. Ponto de partida da linha de conexão inferior (sourceAnchor):
          // Calculado estritamente na base do cartão, imediatamente abaixo do botão de expansão inferior ▾ (base + 14px)
          const sourceX = p.x;
          const sourceY = p.y + 14;

          // 2. Ponto de chegada no nó filho (targetAnchor):
          // Fixado exatamente no topo superior central do cartão filho (y: node.y, x: node.x)
          const targetX = n.x;
          const targetY = n.y;

          // Se estiver na mesma vertical exata (diferença < 1px), desce em linha reta
          if (Math.abs(sourceX - targetX) < 1) {
            return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
          }

          // 3. Traçado Ortogonal Limpo em "T" Invertido / Árvore:
          // Desce verticalmente pelo menos 25px antes de dobrar horizontalmente para distribuir os filhos
          const deltaY = targetY - sourceY;
          let midY;
          if (deltaY > 180) {
            // Conexão entre Co-CEOs e o andar inferior de Diretorias Executivas:
            // posiciona a barra horizontal no vão respiratório logo acima do topo das Diretorias
            midY = targetY - 35;
          } else {
            // Conexão normal entre níveis: desce no mínimo 25px a 30px da base do pai antes da dobra horizontal
            midY = sourceY + Math.max(25, Math.min(deltaY - 20, deltaY * 0.45));
          }

          return `
            M ${sourceX} ${sourceY}
            L ${sourceX} ${midY}
            L ${targetX} ${midY}
            L ${targetX} ${targetY}
          `;
        })
        // Clicar em um Card: centraliza, destaca automaticamente e abre detalhes
        .onNodeClick((nodeParam) => {
          setTeamPopover(null);
          const targetId = nodeParam?.data?.id ?? nodeParam?.id ?? nodeParam;
          focusAndHighlightNode(targetId);
          const found = (dadosTratados || []).find((n) => String(n.id) === String(targetId));
          if (found && onSelectNodeRef.current) onSelectNodeRef.current(found);
        })
        // Botão de Expansão/Colapso Minimalista (24px, fundo adaptativo, borda sutil e texto nítido)
        .buttonContent(({ node }) => {
          const isExpanded = Boolean(node.children);
          const isNodeCeo = Number(node.data?.id) === 1 || node.data?.nivel_slug === 'ceo' || node.depth === 0;
          const count = node.data?._directSubordinates ?? node.data?._directChildrenCount ?? (node._children ? node._children.length : 0);
          const pillBorder = isDark ? (isNodeCeo ? '#E28743' : 'rgba(148,163,184,0.28)') : (isNodeCeo ? '#B4783C' : '#E2E8F0');
          const pillColor = isDark ? (isNodeCeo ? '#E28743' : '#E2E8F0') : (isNodeCeo ? '#B4783C' : '#475569');
          return `
            <div class="jhe-expand-pill" style="${isDark ? `background-color:#0F1E36; border-color:${pillBorder}; color:${pillColor};` : `border-color:${pillBorder}; color:${pillColor};`}">
              <span style="font-size:9px; line-height:1;">${isExpanded ? '▼' : '▶'}</span>
              <span style="font-size:10.5px; font-weight:700;">${count}</span>
            </div>
          `;
        })
        // Linhas Conectoras Ortogonais com traço limpo (#CBD5E1/#334155) e tracejado para Staff/Apoio
        .linkUpdate(function (d) {
          const isStaffLink = Boolean(d?.data?.isStaffBranch || d?.data?._isAssistant);
          const isHighlightedLink = Boolean(d?.data?._highlighted || d?.data?._upToTheRootHighlighted);
          d3.select(this)
            .attr('stroke', isHighlightedLink ? '#61CBE8' : isStaffLink ? staffLineStroke : lineStroke)
            .attr('stroke-width', isHighlightedLink ? 2.2 : 1.5)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-dasharray', isStaffLink && !isHighlightedLink ? '4 4' : null);
        })
        // Neutraliza completamente o traço/stroke SVG vermelho/magenta nativo do d3-org-chart (.node-rect)
        .nodeEnter(function () {
          d3.select(this)
            .select('.node-rect')
            .attr('stroke', 'none')
            .attr('stroke-width', 0)
            .attr('fill', 'transparent');
        })
        .nodeUpdate(function () {
          d3.select(this)
            .select('.node-rect')
            .attr('stroke', 'none')
            .attr('stroke-width', 0)
            .attr('fill', 'transparent');
        })
        // Design Executivo dos Cards (.nodeContent)
        .nodeContent((d) => {
          const item = d.data;
          const isCeo = item.nivel_slug === 'ceo' || item.slug_nivel === 'ceo' || Number(item.id) === 1 || Number(item.nivel_id) === 1 || d.depth === 0;
          const isHighlighted = Boolean(item._highlighted);

          // Sincronização dinâmica da Cor de Destaque com o catálogo de níveis hierárquicos
          const currentNiveis = niveisRef.current || niveis || [];
          const nivelObj = currentNiveis.find(
            (n) =>
              Number(n.id) === Number(item.nivel_id) ||
              (n.slug && item.nivel_slug && n.slug.toLowerCase() === item.nivel_slug.toLowerCase()) ||
              (n.slug && item.slug_nivel && n.slug.toLowerCase() === item.slug_nivel.toLowerCase())
          );

          const isDark = theme === 'dark';
          const corNivel =
            item.cor_identificador ||
            nivelObj?.cor_identificador ||
            item.cor_hex ||
            nivelObj?.cor_hex ||
            getLevelAccentColor(item.nivel_slug || item.slug_nivel) ||
            '#0E284E';

          // No modo escuro, o nó CEO ganha destaque laranja/dourado (#E28743) institucional e outros tons ganham contraste
          let corAcento = corNivel;
          if (isDark) {
            if (isCeo) {
              corAcento = '#E28743'; // Destaque Laranja/Dourado Corporativo JHE
            } else if (
              corNivel.trim().toUpperCase() === '#0E284E' ||
              corNivel.trim().toUpperCase() === '#020931' ||
              corNivel.trim().toUpperCase() === '#0F172A' ||
              corNivel.trim().toUpperCase() === '#0F3B66'
            ) {
              corAcento = '#3B82F6';
            }
          }

          // Extrai múltiplos titulares combinando responsavel e lideres_secundarios
          let titularList = parseResponsaveis(item.responsavel);
          if (Array.isArray(item.lideres_secundarios)) {
            item.lideres_secundarios.forEach((sec) => {
              const secNome = typeof sec === 'string' ? sec : sec?.nome;
              if (secNome && !titularList.includes(secNome) && !isPlaceholderResponsavel(secNome)) {
                titularList.push(secNome);
              }
            });
          }

          if (isCeo && titularList.length === 0) {
            titularList = ['Dr. Hélio', 'Dr. Viol'];
          }

          // Valida se há gestores reais cadastrados, ignorando nulos, vazios ou strings placeholder
          const titularesReais = titularList.filter((nome) => !isPlaceholderResponsavel(nome));
          const temGestorReal = titularesReais.length > 0;
          const formattedLeadersText = temGestorReal ? formatResponsaveisText(titularesReais) : '';

          const renderAvataresHtml = (lista, dark, acento) => {
            if (!lista || lista.length === 0) {
              return '';
            }
            return `
              <div style="display:inline-flex; align-items:center; flex-shrink:0; min-width:20px;">
                ${lista.slice(0, 3).map((nome, idx) => {
                  const inits = getInitials(nome);
                  const bg = idx % 2 === 0
                    ? (dark ? '#1A2E4C' : '#E2E8F0')
                    : (dark ? 'rgba(180, 120, 60, 0.25)' : 'rgba(180, 120, 60, 0.16)');
                  const col = idx % 2 === 0
                    ? (dark ? '#93C5FD' : '#1E293B')
                    : (dark ? '#FBBF24' : '#B4783C');
                  const bdr = dark ? `${acento}40` : '#FFFFFF';
                  return `
                    <span style="
                      width: 20px;
                      height: 20px;
                      min-width: 20px;
                      min-height: 20px;
                      max-width: 20px;
                      max-height: 20px;
                      margin-left: ${idx > 0 ? '-6px' : '0'};
                      border-radius: 9999px;
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 8.5px;
                      font-weight: 700;
                      background-color: ${bg};
                      color: ${col};
                      border: 1.5px solid ${bdr};
                      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
                      flex-shrink: 0;
                      box-sizing: border-box;
                      overflow: hidden;
                    " title="${nome}">
                      ${inits}
                    </span>
                  `;
                }).join('')}
              </div>
            `;
          };

          // Renderização completa de membros diretos vinculados (sem filtragem indevida por role)
          const membros = (Array.isArray(d.data.membros_equipe) && d.data.membros_equipe.length > 0)
            ? d.data.membros_equipe
            : (Array.isArray(d.data.colaboradores_diretos) && d.data.colaboradores_diretos.length > 0
                ? d.data.colaboradores_diretos
                : []);

          const estaAberto = Boolean(d.children && d.children.length > 0);
          const temFilhosRecolhidos = Boolean(d._children && d._children.length > 0);

          let listaPessoas = temFilhosRecolhidos && d.data.todas_pessoas && d.data.todas_pessoas.length > 0
            ? d.data.todas_pessoas
            : membros;

          if (listaPessoas.length === 0 && temGestorReal) {
            listaPessoas = titularesReais.map((nome, idx) => ({
              id: `gestor-${idx}`,
              nome,
              cargo: item.cargo_responsavel || 'Titular / Gestor da Área'
            }));
          }

          // Paridade estrita entre a contagem do badge e as linhas renderizadas no popover
          const diretosProprios = membros.length > 0
            ? membros.length
            : (temGestorReal ? titularesReais.length : 0);

          const totalAcumulado = d.data.total_equipe_acumulada ?? diretosProprios;
          const valorBadge = estaAberto ? diretosProprios : totalAcumulado;

          const textoTooltip = estaAberto 
            ? `${diretosProprios} colaborador(es) direto(s) nesta unidade` 
            : (temFilhosRecolhidos
                ? `${totalAcumulado} colaborador(es) no total da área (incluindo subordinados)`
                : `${diretosProprios} colaborador(es) direto(s) nesta unidade`);

          const tooltipTitulo = estaAberto || !temFilhosRecolhidos
            ? 'Equipe Direta / Colaboradores'
            : 'Total no Ramo';

          const membrosParaExibir = listaPessoas.length > 0 ? listaPessoas : membros;

          // Atualiza o mapa de dados do Popover Flutuante desacoplado
          nodePopoverDataMapRef.current.set(String(item.id), {
            nodeId: String(item.id),
            titulo: item.titulo || 'Setor',
            sigla: item.sigla ? item.sigla.trim() : '',
            nivelNome: item.nivel_nome || '',
            corAcento,
            valorBadge,
            tooltipTitulo: estaAberto || !temFilhosRecolhidos ? 'Equipe Direta / Colaboradores' : 'Total no Ramo',
            membros: (membrosParaExibir || []).map((m, idx) => {
              if (typeof m === 'string') {
                return {
                  id: `m-${idx}`,
                  nome: m,
                  cargo: item.cargo_responsavel || 'Colaborador',
                  email: '',
                  iniciais: getInitials(m)
                };
              }
              const mNome = m.nome || m.nome_completo || 'Colaborador';
              return {
                id: m.id || `m-${idx}`,
                nome: mNome,
                cargo: m.cargo || m.cargo_especialidade || m.role_global || item.cargo_responsavel || 'Colaborador',
                email: m.email || m.email_corporativo || m.email_pessoal || '',
                iniciais: m.iniciais || getInitials(mNome)
              };
            })
          });

          return `
            <div class="org-card jhe-org-card jhe-custom-node-container rounded-2xl relative z-10 ${item.classe_css || 'jhe-level-diretoria'} ${
              isHighlighted ? 'is-highlighted' : ''
            }" 
                 style="
                   position: relative !important;
                   width: 100% !important;
                   height: 100% !important;
                   min-height: 140px !important;
                   box-sizing: border-box !important;
                   overflow: hidden !important;
                   border-radius: 16px !important;
                   background-color: ${isDark ? (isCeo ? '#0F172A' : '#0B132B') : '#FFFFFF'} !important;
                   background-image: ${isDark 
                     ? (isCeo ? 'linear-gradient(180deg, #15253E 0%, #0C182C 100%)' : 'linear-gradient(180deg, #132238 0%, #0C1728 100%)') 
                     : 'none'} !important;
                   border: 1px solid ${isDark ? (isCeo ? 'rgba(226, 135, 67, 0.65)' : `${corAcento}40`) : (isCeo ? '#B4783C' : '#E2E8F0')} !important;
                   border-top: 4px solid ${corAcento} !important;
                   color: ${isDark ? '#FFFFFF' : '#0F172A'} !important;
                   box-shadow: ${isDark 
                     ? (isCeo ? '0 12px 32px -4px rgba(0, 0, 0, 0.75), 0 0 20px -2px rgba(226, 135, 67, 0.28)' : `0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px -3px ${corAcento}15`) 
                     : '0 4px 14px rgba(0, 0, 0, 0.05)'} !important;
                 ">
              <div class="p-3.5 flex flex-col justify-between h-full"
                   style="
                     box-sizing: border-box !important;
                     width: 100% !important;
                     height: 100% !important;
                     max-height: 140px !important;
                     padding: 14px !important;
                     display: flex !important;
                     flex-direction: column !important;
                     justify-content: space-between !important;
                     overflow: hidden !important;
                   ">
                
                <!-- Topo: Ponto Colorido do Nível + Sigla + Nome do Nível -->
                <div style="overflow: hidden !important; width: 100% !important;">
                  <div style="display: flex !important; align-items: center !important; gap: 6px !important; font-size: 10px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; margin-bottom: 6px !important; width: 100% !important; overflow: hidden !important;">
                    <span 
                      style="width: 8px !important; height: 8px !important; min-width: 8px !important; min-height: 8px !important; max-width: 8px !important; max-height: 8px !important; border-radius: 9999px !important; background-color: ${corAcento} !important; box-shadow: 0 0 8px ${corAcento}90 !important; display: inline-block !important; flex-shrink: 0 !important;"
                    ></span>
                    ${item.sigla && item.sigla.trim() ? `
                      <span style="color: ${isDark ? '#E2E8F0' : '#1E293B'} !important; font-weight: 700 !important; flex-shrink: 0 !important;">${item.sigla.trim()}</span>
                      <span style="color: #64748B !important; flex-shrink: 0 !important;">•</span>
                    ` : ''}
                    <span style="color: ${isDark ? '#94A3B8' : '#64748B'} !important; font-weight: 500 !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important;">${item.nivel_nome || ''}</span>
                  </div>
                  
                  <!-- Título do Setor -->
                  <h4 style="color: ${isDark ? '#FFFFFF' : '#0F172A'} !important; font-weight: 700 !important; font-size: 12px !important; line-height: 17px !important; margin: 0 !important; padding: 0 !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; overflow: hidden !important; text-overflow: ellipsis !important; max-height: 34px !important; word-break: break-word !important;">
                    ${item.titulo}
                  </h4>
                </div>

                <!-- Rodapé: Gestor ou Equipe Direta e Contador de Equipe -->
                <div style="display: flex !important; align-items: center !important; justify-content: space-between !important; min-height: 32px !important; padding-top: 10px !important; margin-top: 8px !important; border-top: 1px solid ${isDark ? 'rgba(51, 65, 85, 0.6)' : '#F1F5F9'} !important; width: 100% !important; box-sizing: border-box !important;">
                  ${
                    temGestorReal
                      ? `
                        <!-- Caso Tenha Gestor Formal -->
                        <div style="display: flex !important; align-items: center !important; gap: 8px !important; min-width: 0 !important; padding-right: 8px !important; overflow: hidden !important; flex: 1 !important;">
                          ${renderAvataresHtml(titularesReais, isDark, corAcento)}
                          <span style="font-size: 11px !important; font-weight: 500 !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; color: ${isDark ? '#CBD5E1' : '#334155'} !important;" title="${formattedLeadersText}">
                            ${formattedLeadersText}
                          </span>
                        </div>
                      `
                      : `
                        <!-- Caso NÃO Tenha Gestor: Foco na Equipe Direta/Operacional -->
                        <div style="display: flex !important; align-items: center !important; gap: 6px !important; min-width: 0 !important; padding-right: 8px !important; overflow: hidden !important; flex: 1 !important;">
                          <span style="font-size: 10px !important; font-weight: 500 !important; letter-spacing: -0.01em !important; color: ${isDark ? '#64748B' : '#94A3B8'} !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important;">
                            ${membros.length > 0 ? `${membros.length} colaborador(es)` : 'Sem gestor titular'}
                          </span>
                        </div>
                      `
                  }

                  <!-- Badge da Equipe Interativo (Popover desacoplado fora da árvore SVG) -->
                  <div class="team-counter-wrapper" style="position: relative !important; flex-shrink: 0 !important; display: inline-flex !important; align-items: center !important;">
                    <div 
                      class="team-counter-badge shrink-0 cursor-pointer" 
                      data-team-badge="true" 
                      data-node-id="${item.id}"
                      style="
                        min-height: 22px !important;
                        height: 22px !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        gap: 4px !important;
                        padding: 2px 8px !important;
                        border-radius: 9999px !important;
                        font-size: 11px !important;
                        font-weight: 700 !important;
                        box-sizing: border-box !important;
                        flex-shrink: 0 !important;
                        cursor: pointer !important;
                        background-color: ${isDark ? (valorBadge === 0 ? 'rgba(30, 41, 59, 0.4)' : 'rgba(30, 41, 59, 0.9)') : (valorBadge === 0 ? 'rgba(241, 245, 249, 0.9)' : '#FFFBEB')} !important;
                        color: ${isDark ? (valorBadge === 0 ? '#94A3B8' : '#E2E8F0') : (valorBadge === 0 ? '#94A3B8' : '#78350F')} !important;
                        border: 1px solid ${isDark ? (valorBadge === 0 ? 'rgba(51, 65, 85, 0.5)' : 'rgba(51, 65, 85, 0.8)') : (valorBadge === 0 ? 'rgba(226, 232, 240, 0.7)' : 'rgba(253, 230, 138, 0.6)')} !important;
                        transition: transform 0.15s ease, background-color 0.15s ease !important;
                      " 
                      title="${textoTooltip}"
                    >
                      <svg 
                        width="13" 
                        height="13" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        stroke-width="2" 
                        style="width: 13px !important; height: 13px !important; min-width: 13px !important; min-height: 13px !important; max-width: 13px !important; max-height: 13px !important; display: inline-block !important; flex-shrink: 0 !important; vertical-align: middle !important; opacity: ${valorBadge === 0 ? '0.4' : '0.7'} !important; pointer-events: none !important;"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                      </svg>
                      <span style="font-size: 11px !important; font-weight: 700 !important; line-height: 1 !important; display: inline-block !important; flex-shrink: 0 !important; white-space: nowrap !important; pointer-events: none !important;">${valorBadge}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          `;
        })
        .render();

      // Aplica classes de isolamento de camadas estritas (z-index)
      if (d3ContainerRef.current) {
        d3.select(d3ContainerRef.current)
          .selectAll('.links-wrapper, .connections-wrapper')
          .classed('pointer-events-none z-0', true)
          .style('pointer-events', 'none');

        d3.select(d3ContainerRef.current)
          .selectAll('.nodes-wrapper')
          .classed('relative z-10', true);
      }

      // Estado Inicial Padrão: Árvore totalmente colapsada no nó raiz (CEOs) e perfeitamente centralizada
      if (!hasInitializedTreeRef.current) {
        hasInitializedTreeRef.current = true;
        chartRef.current.collapseAll();
        setTimeout(() => {
          recenterRootNode(false);
        }, 70);
      }
    } catch (err) {
      console.error('Erro ao renderizar D3 OrgChart:', err);
      setRenderError(err.message);
    }
  }, [flatNodes, theme]);

  // Re-renderiza dinamicamente os cartões quando a paleta de níveis hierárquicos for atualizada
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.render();
    }
  }, [niveis]);

  // Previne que o scroll dentro de popovers/tooltips propague zoom/pan para o SVG do D3
  useEffect(() => {
    if (!d3ContainerRef.current) return;
    const container = d3ContainerRef.current;

    const handleWheelCapture = (e) => {
      if (e.target.closest('#jhe-floating-team-popover')) {
        e.stopPropagation();
        return;
      }
      if (teamPopoverRef.current) {
        setTeamPopover(null);
      }
    };

    container.addEventListener('wheel', handleWheelCapture, { passive: false, capture: true });
    return () => container.removeEventListener('wheel', handleWheelCapture, { capture: true });
  }, []);

  // Adiciona listener para clique no fundo vazio do SVG / Canvas
  useEffect(() => {
    if (!d3ContainerRef.current) return;
    const container = d3ContainerRef.current;
    const handleSvgClick = (e) => {
      // Se clicou no badge ou no popover flutuante, não limpa
      if (e.target.closest('[data-team-badge="true"]') || e.target.closest('#jhe-floating-team-popover')) {
        return;
      }

      // Se o clique não foi em um card do nó (.jhe-org-card, .node, .jhe-expand-pill), trata como clique de fundo
      if (!e.target.closest('.node') && !e.target.closest('.jhe-org-card') && !e.target.closest('.jhe-expand-pill')) {
        clearHighlight();
        if (onCanvasBackgroundClick) onCanvasBackgroundClick();
      }
    };
    container.addEventListener('click', handleSvgClick);
    return () => container.removeEventListener('click', handleSvgClick);
  }, [clearHighlight, onCanvasBackgroundClick]);

  // Interações com o Badge de Contagem (Hover & Clique) para exibição do Popover Desacoplado
  useEffect(() => {
    if (!d3ContainerRef.current) return;
    const container = d3ContainerRef.current;

    const handleMouseOver = (e) => {
      const badge = e.target.closest('[data-team-badge="true"]');
      if (badge) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        openPopoverForBadge(badge, false);
      }
    };

    const handleMouseOut = (e) => {
      const badge = e.target.closest('[data-team-badge="true"]');
      if (badge) {
        handleBadgeMouseLeave();
      }
    };

    const handleClickCapture = (e) => {
      const badge = e.target.closest('[data-team-badge="true"]');
      if (badge) {
        e.stopPropagation();
        e.preventDefault();
        openPopoverForBadge(badge, true);
        return;
      }

      // Se clicou no botão de expansão do nó ou em outro nó, fecha o popover
      if (e.target.closest('.jhe-expand-pill') || e.target.closest('.node-button-div') || e.target.closest('.node')) {
        setTeamPopover(null);
        return;
      }

      // Se o clique foi fora do popover flutuante, fecha
      if (!e.target.closest('#jhe-floating-team-popover') && teamPopoverRef.current) {
        setTeamPopover(null);
      }
    };

    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);
    container.addEventListener('click', handleClickCapture, true);

    return () => {
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
      container.removeEventListener('click', handleClickCapture, true);
    };
  }, [openPopoverForBadge, handleBadgeMouseLeave]);

  // Listeners globais para fechar com Escape, clique fora ou redimensionamento
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setTeamPopover(null);
      }
    };

    const handleWindowPointerDown = (e) => {
      if (!teamPopoverRef.current) return;
      if (e.target.closest('#jhe-floating-team-popover') || e.target.closest('[data-team-badge="true"]')) {
        return;
      }
      setTeamPopover(null);
    };

    const handleWindowResize = () => {
      if (teamPopoverRef.current) {
        setTeamPopover(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handleWindowPointerDown);
    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handleWindowPointerDown);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  // Fecha o popover em qualquer operação de Pan/Zoom no gráfico
  useEffect(() => {
    if (!chartRef.current) return;
    const chartState = chartRef.current.getChartState?.();
    if (chartState?.zoomBehavior) {
      chartState.zoomBehavior.on('zoom.teamPopover', () => {
        if (teamPopoverRef.current) {
          setTeamPopover(null);
        }
      });
    }
  }, [flatNodes]);

  return (
    <div
      className="relative w-full h-[calc(100vh-4rem)] overflow-hidden transition-colors"
      style={{ backgroundColor: 'var(--jhe-canvas-bg)' }}
    >
      {renderError && (
        <div className="p-4 m-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
          Erro ao renderizar gráfico: {renderError}
        </div>
      )}

      {(!flatNodes || flatNodes.length === 0) ? (
        <div className="flex items-center justify-center h-full text-sm text-slate-400">
          Carregando estrutura organizacional JHE Engenharia...
        </div>
      ) : (
        <div
          id="organograma-tree-content"
          ref={d3ContainerRef}
          className={`w-full h-full ${
            isCanvasLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          }`}
        />
      )}

      {/* Barra Flutuante de Controles Executiva (CanvasControls.jsx) */}
      <CanvasControls
        onZoomIn={() => !isCanvasLocked && chartRef.current?.zoomIn()}
        onZoomOut={() => !isCanvasLocked && chartRef.current?.zoomOut()}
        onFit={handleFitView}
        onExpandAll={() => {
          if (isCanvasLocked) return;
          chartRef.current?.expandAll().fit();
          setModoVisao('completo');
        }}
        onCollapseAll={() => {
          if (isCanvasLocked) return;
          chartRef.current?.collapseAll();
          recenterRootNode(true);
          setModoVisao('executivo');
        }}
        modoVisao={modoVisao}
        onToggleModoVisao={handleToggleModoVisao}
        onExportImage={handleExportCanvas}
        isCanvasLocked={isCanvasLocked}
        onToggleLock={() => setIsCanvasLocked((prev) => !prev)}
        onNewNode={onCreateNode}
        onOpenQuickGuide={onOpenQuickGuide}
      />

      {/* Popover Flutuante Desacoplado de Colaboradores / Equipe */}
      {teamPopover && (
        <div
          id="jhe-floating-team-popover"
          role="dialog"
          aria-label="Listagem de Colaboradores"
          className="fixed z-[9999] w-80 bg-slate-900 border border-slate-700 text-white shadow-2xl rounded-2xl p-3.5 backdrop-blur-md select-none transition-all duration-150 animate-in fade-in"
          style={{
            left: `${teamPopover.pos.x}px`,
            top: `${teamPopover.pos.y}px`,
            transform: teamPopover.pos.placement === 'top' ? 'translateY(-100%)' : 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px -5px rgba(0, 0, 0, 0.6)'
          }}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho do Popover */}
          <div className="flex items-start justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-700/80">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: teamPopover.data.corAcento || '#38BDF8' }}
                />
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">
                  {teamPopover.data.tooltipTitulo} ({teamPopover.data.valorBadge})
                </h5>
              </div>
              <p className="text-xs font-semibold text-slate-100 truncate" title={teamPopover.data.titulo}>
                {teamPopover.data.sigla ? `${teamPopover.data.sigla} • ` : ''}{teamPopover.data.titulo}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTeamPopover(null);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              title="Fechar listagem"
            >
              <X size={15} />
            </button>
          </div>

          {/* Lista com rolagem suave */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
            {teamPopover.data.membros.length > 0 ? (
              teamPopover.data.membros.map((membro) => (
                <div
                  key={membro.id}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-colors"
                >
                  {/* Avatar Circular com Iniciais */}
                  <div
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs bg-slate-800 text-sky-400 border border-slate-700 shadow-sm"
                    style={{
                      backgroundColor: '#1E293B',
                      color: '#38BDF8'
                    }}
                  >
                    {membro.iniciais}
                  </div>

                  {/* Informações: Nome, Cargo, E-mail */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-100 truncate" title={membro.nome}>
                      {membro.nome}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate" title={membro.cargo}>
                      <Briefcase size={10} className="shrink-0 text-slate-400" />
                      <span className="truncate">{membro.cargo}</span>
                    </div>
                    {membro.email ? (
                      <a
                        href={`mailto:${membro.email}`}
                        className="flex items-center gap-1 text-[10.5px] text-sky-400/90 hover:text-sky-300 hover:underline truncate mt-0.5"
                        title={membro.email}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail size={10} className="shrink-0 text-sky-400/70" />
                        <span className="truncate">{membro.email}</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-slate-400 italic">
                Nenhum colaborador registrado nesta unidade.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default OrganogramaView;
