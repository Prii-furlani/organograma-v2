import React, { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { OrgChart } from 'd3-org-chart';
import * as d3 from 'd3';
import Swal from 'sweetalert2';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useTheme } from '../context/ThemeContext';
import { buildAndSortOrgTree } from '../utils/treeBuilder';
import CanvasControls from './CanvasControls';
import { parseResponsaveis, formatResponsaveisText, getInitials, isPlaceholderResponsavel } from './MultiResponsavelInput';

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

const CARD_HEIGHT = 140;
const MARGEM_PADRAO = 90; // Respiro visual entre as camadas no estado recolhido

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
 * Layout Handler: Reorganiza os filhos imediatos do nó raiz ("Co-CEOs") em dois andares horizontais distintos:
 * - Andar Superior (Linha 1): Qualquer nível hierárquico sob o CEO que NÃO seja Diretoria Executiva
 * - Andar Inferior (Linha 2): Estritamente Diretorias Executivas e suas subárvores subordinadas
 * - Comportamento Dinâmico: A distância entre os andares se adapta dinamicamente à expansão da Linha 1
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

  const CARD_WIDTH = 260;
  const SIBLING_MARGIN = 35;
  // Deslocamento vertical dinâmico baseado no estado de nós abertos na Linha 1
  const Y_OFFSET_LINHA_2 = calcularDeslocamentoVerticalDinamico(rootNode);

  // 1. Andar Superior (Linha 1): Nós não-Diretoria centralizados sob o eixo de Co-CEOs
  if (linha1Nodes.length > 0) {
    const totalWidthL1 = linha1Nodes.length * CARD_WIDTH + (linha1Nodes.length - 1) * SIBLING_MARGIN;
    const startX1 = rootNode.x - totalWidthL1 / 2 + CARD_WIDTH / 2;

    linha1Nodes.forEach((node, idx) => {
      const targetX = startX1 + idx * (CARD_WIDTH + SIBLING_MARGIN);
      const deltaXCoord = targetX - node.x;

      // Translada a coordenação e todos os seus eventuais filhos/descendentes abertos em bloco
      if (deltaXCoord !== 0) {
        node.descendants().forEach((desc) => {
          desc.x += deltaXCoord;
        });
      }
    });
  }

  // 2. Andar Inferior (Linha 2): Diretorias Executivas e toda a cascata subordinada
  let minXLinha2 = Infinity;
  let maxXLinha2 = -Infinity;

  linha2Nodes.forEach((dirNode) => {
    dirNode.descendants().forEach((desc) => {
      const w = desc.width || CARD_WIDTH;
      const left = desc.x - w / 2;
      const right = desc.x + w / 2;
      if (left < minXLinha2) minXLinha2 = left;
      if (right > maxXLinha2) maxXLinha2 = right;
    });
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
  const [modoVisao, setModoVisao] = useState('completo'); // 'completo' | 'executivo'

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

  // Exportação Direta e Resiliente do Canvas em Imagem (PNG 2x / PDF / SVG)
  const handleExportCanvas = useCallback(
    async (format = 'png') => {
      if (!chartRef.current || !d3ContainerRef.current) return;
      const container = d3ContainerRef.current;

      try {
        const isDark = theme === 'dark';
        const bg = isDark ? '#020931' : '#FFFFFF';
        const dataStr = new Date().toISOString().slice(0, 10);
        const prefixo = modoVisao === 'executivo' ? 'organograma_executivo_jhe_' : 'organograma_completo_jhe_';
        const nomeArquivo = `${prefixo}${dataStr}`;

        chartRef.current.imageName(nomeArquivo);

        if (format === 'svg') {
          chartRef.current.exportSvg();
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Vetor SVG Exportado',
            text: 'Arquivo baixado com sucesso em alta definição.',
            showConfirmButton: false,
            timer: 2500
          });
          return;
        }

        Swal.fire({
          title: 'Gerando exportação do organograma...',
          text: 'Normalizando escala da árvore e renderizando alta definição (HD 2x).',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // 1. Aplica classe de isolamento para omitir popovers suspensos e controles
        container.classList.add('is-exporting');

        // 2. Normaliza a escala da visualização executando fitView
        chartRef.current.clearHighlighting();
        chartRef.current.fit();

        // Aguarda estabilização da animação do D3 (350ms)
        await new Promise((resolve) => setTimeout(resolve, 350));

        // 3. Opções estritas de captura com html-to-image
        const options = {
          backgroundColor: bg,
          pixelRatio: 2,
          quality: 0.98,
          filter: (node) => {
            if (!node || !node.classList) return true;
            if (node.classList.contains('no-export')) return false;
            if (node.classList.contains('team-popover')) return false;
            if (node.classList.contains('team-tooltip-popover')) return false;
            return true;
          },
          style: {
            transform: 'none',
            transformOrigin: 'top left'
          }
        };

        const dataUrl = await toPng(container, options);

        if (format === 'pdf') {
          const pdf = new jsPDF('landscape', 'pt', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();

          const imgProps = pdf.getImageProperties(dataUrl);
          const margin = 20;
          const maxWidth = pdfWidth - margin * 2;
          const maxHeight = pdfHeight - margin * 2;

          const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
          const finalWidth = imgProps.width * ratio;
          const finalHeight = imgProps.height * ratio;
          const posX = (pdfWidth - finalWidth) / 2;
          const posY = (pdfHeight - finalHeight) / 2;

          // Preenchimento de fundo consistente
          pdf.setFillColor(isDark ? 2 : 255, isDark ? 9 : 255, isDark ? 49 : 255);
          pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

          pdf.addImage(dataUrl, 'PNG', posX, posY, finalWidth, finalHeight);
          pdf.save(`${nomeArquivo}.pdf`);

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Documento PDF Exportado',
            text: 'PDF gerado com sucesso em alta definição.',
            showConfirmButton: false,
            timer: 2500
          });
        } else {
          // Download da imagem PNG
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
            text: 'Arquivo baixado em alta resolução nítida (2x).',
            showConfirmButton: false,
            timer: 2500
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
      }
    }),
    [focusAndHighlightNode, clearHighlight, handleExportCanvas, handleToggleModoVisao]
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
        .layout('top')
        .compact(false)
        .nodeId((d) => d.id)
        .parentNodeId((d) => d.parentId)
        .nodeWidth((d) => 260)
        .nodeHeight((d) => (d.depth === 0 ? 140 : 135))
        // Distanciamento vertical entre pais e filhos aumentado (linhas conectoras respiram)
        .childrenMargin(() => 70)
        // Respiros horizontais entre nós irmãos e blocos vizinhos
        .neighbourMargin(() => 45)
        .siblingsMargin(() => 35)
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
            nodeBottomY: (node) => node.height
          }
        })
        // Sobrescreve o gerador de links com traçado ortogonal clássico e limpo (ângulo reto)
        .diagonal(function (s, t) {
          const sx = s.x;
          const sy = s.y;
          const tx = t.x;
          const ty = t.y;

          // Se for o link conectando Co-CEOs à Linha 2 de Diretorias (distância vertical > 200px)
          // posiciona o barramento horizontal no vão respiratório logo acima da Linha 2 (sy - 35)
          // evitando sobreposição visual com os cards da Linha 1 e seus eventuais filhos abertos
          const isLinha2Link = Math.abs(sy - ty) > 200;
          const midY = isLinha2Link ? (sy - 35) : ((sy + ty) / 2);

          return `
            M ${sx} ${sy}
            L ${sx} ${midY}
            L ${tx} ${midY}
            L ${tx} ${ty}
          `;
        })
        // Clicar em um Card: centraliza, destaca automaticamente e abre detalhes
        .onNodeClick((nodeParam) => {
          const targetId = nodeParam?.data?.id ?? nodeParam?.id ?? nodeParam;
          focusAndHighlightNode(targetId);
          const found = (dadosTratados || []).find((n) => String(n.id) === String(targetId));
          if (found && onSelectNodeRef.current) onSelectNodeRef.current(found);
        })
        // Botão de Expansão/Colapso Minimalista (24px, fundo adaptativo, borda sutil e texto nítido)
        .buttonContent(({ node }) => {
          const isExpanded = Boolean(node.children);
          const count = node.data?._directSubordinates ?? node.data?._directChildrenCount ?? 0;
          return `
            <div class="jhe-expand-pill" style="${isDark ? 'background-color:#0F1E36; border-color:rgba(148,163,184,0.28); color:#E2E8F0;' : ''}">
              <span style="font-size:9px; line-height:1;">${isExpanded ? '▾' : '▸'}</span>
              <span>${count}</span>
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
          const isCeo = item.nivel_slug === 'ceo' || item.slug_nivel === 'ceo';
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

          // No modo escuro, se a cor configurada for muito escura (ex: #0E284E), usamos uma versão ligeiramente iluminada (#3B82F6) para o traço e badge
          const corAcento =
            isDark &&
            (corNivel.trim().toUpperCase() === '#0E284E' ||
              corNivel.trim().toUpperCase() === '#020931' ||
              corNivel.trim().toUpperCase() === '#0F172A' ||
              corNivel.trim().toUpperCase() === '#0F3B66')
              ? '#3B82F6'
              : corNivel;

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
            ? 'Equipe Direta'
            : 'Total no Ramo (Subárvore)';

          const membrosParaExibir = listaPessoas.length > 0 ? listaPessoas : membros;
          const temScroll = membrosParaExibir.length >= 5;

          return `
            <div class="org-card jhe-org-card jhe-custom-node-container rounded-2xl transition-all duration-200 overflow-visible ${item.classe_css || 'jhe-level-diretoria'} ${
              isHighlighted ? 'is-highlighted' : ''
            }" 
                 style="
                   background: ${isDark 
                     ? 'linear-gradient(180deg, #132238 0%, #0c1728 100%)' 
                     : '#FFFFFF'} !important;
                   border: 1px solid ${isDark ? `${corAcento}35` : '#E2E8F0'} !important;
                   border-top: 4px solid ${corAcento} !important;
                   box-shadow: ${isDark 
                     ? `0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px -3px ${corAcento}15` 
                     : '0 4px 14px rgba(0, 0, 0, 0.05)'} !important;
                   width: 100%;
                   height: 100%;
                   box-sizing: border-box;
                 ">
              <div class="p-3.5 flex flex-col justify-between h-full" style="box-sizing: border-box; height: 100%;">
                
                <!-- Topo: Ponto Colorido do Nível + Sigla + Nome do Nível -->
                <div>
                  <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    <span 
                      style="background-color: ${corAcento}; box-shadow: 0 0 6px ${corAcento}80;" 
                      class="w-2 h-2 rounded-full inline-block shrink-0"
                    ></span>
                    ${item.sigla && item.sigla.trim() ? `
                      <span class="${isDark ? 'text-slate-200' : 'text-slate-800'} font-bold">${item.sigla.trim()}</span>
                      <span class="text-slate-500">•</span>
                    ` : ''}
                    <span class="${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium">${item.nivel_nome || ''}</span>
                  </div>
                  
                  <!-- Título do Setor -->
                  <h4 class="${isDark ? 'text-white' : 'text-slate-900'} font-bold text-xs leading-snug line-clamp-2">
                    ${item.titulo}
                  </h4>
                </div>

                <!-- Rodapé: Gestor ou Equipe Direta e Contador de Equipe -->
                <div class="pt-2.5 mt-2 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-100'} flex items-center justify-between min-h-[32px]">
                  ${
                    temGestorReal
                      ? `
                        <!-- Caso Tenha Gestor Formal -->
                        <div class="flex items-center gap-2 min-w-0 pr-2">
                          ${renderAvataresHtml(titularesReais, isDark, corAcento)}
                          <span class="text-[11px] font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}" title="${formattedLeadersText}">
                            ${formattedLeadersText}
                          </span>
                        </div>
                      `
                      : `
                        <!-- Caso NÃO Tenha Gestor: Foco na Equipe Direta/Operacional -->
                        <div class="flex items-center gap-1.5 min-w-0 pr-2">
                          <span class="text-[10px] font-medium tracking-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}">
                            ${membros.length > 0 ? `${membros.length} colaborador(es)` : 'Sem gestor titular'}
                          </span>
                        </div>
                      `
                  }

                  <!-- Badge da Equipe com Popover Tooltip -->
                  <div class="team-counter-wrapper" style="position: relative; flex-shrink: 0;">
                    <div class="team-counter-badge shrink-0 px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px] font-bold ${
                      isDark 
                        ? (valorBadge === 0 
                            ? 'bg-slate-800/40 text-slate-400 border border-slate-700/50' 
                            : 'bg-slate-800/90 text-slate-200 border border-slate-700/80')
                        : (valorBadge === 0 
                            ? 'bg-slate-100/90 text-slate-400 border border-slate-200/70' 
                            : 'bg-amber-50 text-amber-900 border border-amber-200/60')
                    }" style="min-height: 22px; height: 22px; display: inline-flex; align-items: center; box-sizing: border-box;" title="${textoTooltip}">
                      <svg 
                        width="13" 
                        height="13" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        stroke-width="2" 
                        class="w-3 h-3 ${valorBadge === 0 ? 'opacity-40' : 'opacity-70'}"
                        style="width: 13px; height: 13px; min-width: 13px; min-height: 13px; max-width: 13px; max-height: 13px; display: inline-block; flex-shrink: 0; vertical-align: middle;"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                      </svg>
                      <span style="font-size: 11px; font-weight: 700; line-height: 1; display: inline-block; flex-shrink: 0; white-space: nowrap;">${valorBadge}</span>
                    </div>

                    <!-- Wrapper do Popover de Membros Diretos -->
                    <div class="team-popover no-export absolute bottom-full right-0 mb-2 w-72 ${temScroll ? 'max-h-72' : 'h-auto'} flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-[999] pointer-events-auto overflow-hidden" style="${isDark ? 'background-color:#0F1E36; border-color:rgba(148,163,184,0.22);' : ''}">
                      
                      <!-- 1. Cabeçalho Fixo (Nunca é sobreposto e não rola) -->
                      <div class="shrink-0 flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-slate-100 select-none" style="${isDark ? 'background-color:#0F1E36; border-color:rgba(148,163,184,0.18);' : ''}">
                        <div class="flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full bg-sky-500"></span>
                          <span class="text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider">
                            ${tooltipTitulo}
                          </span>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100" style="${isDark ? 'background-color:rgba(97,203,232,0.18); color:#61CBE8; border-color:rgba(97,203,232,0.3);' : ''}">
                          ${valorBadge}
                        </span>
                      </div>

                      <!-- 2. Lista com Rolagem Exclusiva quando >= 5 pessoas; Fluida sem scrollbar quando < 5 -->
                      <div class="${temScroll ? 'max-h-[210px] overflow-y-auto custom-scrollbar-subtle' : 'h-auto overflow-hidden'} flex-1 p-2 space-y-1 min-h-0">
                        ${membrosParaExibir.length > 0 ? membrosParaExibir.map((m) => {
                          const mNome = typeof m === 'string' ? m : m.nome || 'Colaborador';
                          const mInitials = m.iniciais || (mNome || 'CO')
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((x) => x[0])
                            .join('')
                            .toUpperCase();
                          const mCargo = m.cargo || m.cargo_especialidade || m.role_global || 'Colaborador';
                          return `
                            <div class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors" style="${isDark ? 'hover:background-color:rgba(255,255,255,0.06);' : ''}">
                              <div class="w-7 h-7 shrink-0 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center border border-slate-200" style="${isDark ? 'background-color:#1A2E4C; color:#CBD5E1; border-color:rgba(148,163,184,0.2);' : ''}">
                                ${mInitials}
                              </div>
                              <div class="min-w-0 flex-1">
                                <p class="text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'} truncate leading-tight" title="${mNome}">
                                  ${mNome}
                                </p>
                                <p class="text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-400'} truncate" title="${mCargo}">
                                  ${mCargo}
                                </p>
                              </div>
                            </div>
                          `;
                        }).join('') : `
                          <div class="py-2.5 text-center text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-400'} italic">
                            Nenhum colaborador registrado.
                          </div>
                        `}
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            </div>
          `;
        })
        .render();

      if (isFirstMount) {
        chartRef.current.expandAll().fit();
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
      const tooltipBody = e.target.closest('.team-tooltip-body, .team-tooltip-popover, .team-popover');
      if (tooltipBody) {
        e.stopPropagation();
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
      // Se o clique não foi em um card do nó (.jhe-org-card, .node, .jhe-expand-pill, .team-popover), trata como clique de fundo
      if (!e.target.closest('.node') && !e.target.closest('.jhe-org-card') && !e.target.closest('.jhe-expand-pill') && !e.target.closest('.team-popover')) {
        clearHighlight();
        if (onCanvasBackgroundClick) onCanvasBackgroundClick();
      }
    };
    container.addEventListener('click', handleSvgClick);
    return () => container.removeEventListener('click', handleSvgClick);
  }, [clearHighlight, onCanvasBackgroundClick]);

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
        onFit={() => {
          if (isCanvasLocked) return;
          chartRef.current?.clearHighlighting();
          chartRef.current?.fit();
        }}
        onExpandAll={() => {
          if (isCanvasLocked) return;
          chartRef.current?.expandAll().fit();
          setModoVisao('completo');
        }}
        onCollapseAll={() => {
          if (isCanvasLocked) return;
          chartRef.current?.collapseAll().fit();
        }}
        modoVisao={modoVisao}
        onToggleModoVisao={handleToggleModoVisao}
        onExportImage={handleExportCanvas}
        isCanvasLocked={isCanvasLocked}
        onToggleLock={() => setIsCanvasLocked((prev) => !prev)}
        onNewNode={onCreateNode}
        onOpenQuickGuide={onOpenQuickGuide}
      />
    </div>
  );
});

export default OrganogramaView;
