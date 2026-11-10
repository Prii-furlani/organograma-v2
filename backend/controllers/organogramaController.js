/**
 * ============================================================================
 * JHE ORGANOGRAMA CORPORATIVO - CONTROLADOR DO ORGANOGRAMA E GRAFOS
 * ----------------------------------------------------------------------------
 * Arquivo: organogramaController.js
 * Módulo: Backend / Regras de Negócio do Organograma / Operações de Banco SQL
 * Função Principal: Gerencia consultas da árvore, criação, edição, exclusão e
 * movimentação de nós com transações atômicas, reordenação de irmãos, contagem
 * de colaboradores diretos/acumulados e geração de logs de auditoria.
 *
 * ----------------------------------------------------------------------------
 * GUIA RÁPIDO DE MANUTENÇÃO (ONDE EDITAR SE...):
 * • Consulta principal da árvore (nós e pessoas): Linha ~140 (obterOrganograma)
 * • Mover nó ou alterar nó pai (com transação): Linha ~750 (moverNo)
 * • Criar novo setor/nó na estrutura: Linha ~380 (criarNo)
 * • Atualizar dados do setor (título, gestor, etc.): Linha ~520 (atualizarNo)
 * • Excluir setor e reatribuir subordinados: Linha ~880 (excluirNo)
 * • Dados de fallback em caso de banco offline: Linhas ~25-100 (FALLBACK_COLABORADORES)
 * ============================================================================
 */

import pool, { withTransaction } from '../database/database.js';
import { registrarLogAuditoria } from '../utils/auditLogger.js';
import { getFallbackUsuarios } from './userController.js';

// Dados institucionais de fallback para visualização imediata caso o MySQL ainda não esteja iniciado
const FALLBACK_COLABORADORES = {
  1: [
    { id: 1, nome: 'Dr. Hélio', email: 'diretoria@jhe.com.br', cargo: 'Co-CEO (DH)', role_global: 'diretor' },
    { id: 2, nome: 'Dr. Viol', email: 'diretoria.viol@jhe.com.br', cargo: 'Co-CEO (DV)', role_global: 'diretor' },
    { id: 10, nome: 'Administrador Governança JHE', email: 'governanca@jhe.com.br', cargo: 'Gestor de Governança', role_global: 'admin' }
  ],
  2: [
    { id: 3, nome: 'Gestor OIA', email: 'oia@jhe.com.br', cargo: 'Responsável Técnico OIA', role_global: 'coordenador' },
    { id: 11, nome: 'Inspetor Sênior', email: 'inspetor@jhe.com.br', cargo: 'Auditor ISO 17020', role_global: 'colaborador' }
  ],
  3: [
    { id: 4, nome: 'Coordenação Staff', email: 'staff@jhe.com.br', cargo: 'Assessoria Estratégica', role_global: 'coordenador' },
    { id: 12, nome: 'Analista de Governança', email: 'compliance@jhe.com.br', cargo: 'Especialista em Compliance', role_global: 'colaborador' }
  ],
  4: [
    { id: 5, nome: 'Leandro Neves', email: 'leandro.neves@jhe.com.br', cargo: 'Diretor de Engenharia', role_global: 'diretor' },
    { id: 13, nome: 'Assistente Executivo', email: 'operacoes@jhe.com.br', cargo: 'Suporte à Diretoria', role_global: 'colaborador' }
  ],
  5: [
    { id: 22, nome: 'Diretor Comercial', email: 'comercial@jhe.com.br', cargo: 'Diretor Comercial', role_global: 'diretor' }
  ],
  6: [
    { id: 23, nome: 'Diretor Administrativo', email: 'administrativo@jhe.com.br', cargo: 'Diretor Financeiro & Administrativo', role_global: 'diretor' }
  ],
  7: [
    { id: 6, nome: 'Coordenador Geral', email: 'projetos@jhe.com.br', cargo: 'Coordenador de Engenharia', role_global: 'coordenador' },
    { id: 14, nome: 'Engenheiro de Projetos Pleno', email: 'projetos2@jhe.com.br', cargo: 'Engenheiro Projetista', role_global: 'colaborador' },
    { id: 15, nome: 'Analista de PMO', email: 'pmo@jhe.com.br', cargo: 'Controle de Prazos', role_global: 'colaborador' }
  ],
  8: [
    { id: 7, nome: 'Líder de Planejamento', email: 'planejamento@jhe.com.br', cargo: 'Especialista de Apoio', role_global: 'coordenador' },
    { id: 16, nome: 'Técnico de Planejamento', email: 'controle@jhe.com.br', cargo: 'Técnico em Planejamento', role_global: 'colaborador' }
  ],
  9: [
    { id: 8, nome: 'Eng. Líder Civil', email: 'civil@jhe.com.br', cargo: 'Líder Técnico', role_global: 'coordenador' },
    { id: 17, nome: 'Calculista Estrutural', email: 'estruturas@jhe.com.br', cargo: 'Engenheiro Calculista', role_global: 'colaborador' },
    { id: 18, nome: 'Carlos Almeida', email: 'carlos.almeida@jhe.com.br', cargo: 'Especialista BIM', role_global: 'colaborador' }
  ],
  10: [
    { id: 9, nome: 'Eng. Residente', email: 'ct042@jhe.com.br', cargo: 'Gestor de Contrato', role_global: 'coordenador' },
    { id: 20, nome: 'Engenheiro Fiscal de Obra', email: 'fiscal042@jhe.com.br', cargo: 'Fiscal de Campo', role_global: 'colaborador' },
    { id: 21, nome: 'Carlos Almeida', email: 'carlos.almeida@jhe.com.br', cargo: 'Técnico Residente', role_global: 'colaborador' }
  ]
};

const FALLBACK_NIVEIS = [
  { id: 1, slug: 'ceo', nome: 'Co-CEOs / Presidência', nivel_ordem: 0, cor_identificador: '#0E284E', cor_hex: '#0E284E', classe_css: 'jhe-level-ceo', subtitulo: 'Direção Executiva e Conselho de Administração' },
  { id: 2, slug: 'oia', nome: 'OIA / Auditoria', nivel_ordem: 1, cor_identificador: '#0E284E', cor_hex: '#0E284E', classe_css: 'jhe-level-oia', subtitulo: 'Organismo de Inspeção Acreditado' },
  { id: 3, slug: 'staff', nome: 'Staff / Assessoria', nivel_ordem: 1, cor_identificador: '#0E284E', cor_hex: '#0E284E', classe_css: 'jhe-level-staff', subtitulo: 'Assessoria Estratégica & Governança' },
  { id: 4, slug: 'diretoria', nome: 'Diretoria Executiva', nivel_ordem: 2, cor_identificador: '#0E284E', cor_hex: '#0E284E', classe_css: 'jhe-level-diretoria', subtitulo: 'Diretorias Corporativas e Operacionais' },
  { id: 5, slug: 'gerencia', nome: 'Gerência', nivel_ordem: 3, cor_identificador: '#B4783C', cor_hex: '#B4783C', classe_css: 'jhe-level-gerencia', subtitulo: 'Gerências Setoriais e Regionais' },
  { id: 6, slug: 'unidade', nome: 'Unidade de Negócios', nivel_ordem: 3, cor_identificador: '#B4783C', cor_hex: '#B4783C', classe_css: 'jhe-level-unidade', subtitulo: 'Unidades de Negócio Estruturadas' },
  { id: 7, slug: 'coordenacao', nome: 'Coordenação', nivel_ordem: 4, cor_identificador: '#B4783C', cor_hex: '#B4783C', classe_css: 'jhe-level-coordenacao', subtitulo: 'Coordenação de Projetos e Contratos' },
  { id: 8, slug: 'apoio', nome: 'Apoio Operacional', nivel_ordem: 5, cor_identificador: '#0284C7', cor_hex: '#0284C7', classe_css: 'jhe-level-apoio', subtitulo: 'Apoio Técnico e Suporte Operacional' },
  { id: 9, slug: 'equipe', nome: 'Equipe Técnica', nivel_ordem: 6, cor_identificador: '#5B6B7C', cor_hex: '#5B6B7C', classe_css: 'jhe-level-equipe', subtitulo: 'Corpo Técnico Multidisciplinar' },
  { id: 10, slug: 'contrato', nome: 'Contrato / Obra', nivel_ordem: 7, cor_identificador: '#5B6B7C', cor_hex: '#5B6B7C', classe_css: 'jhe-level-contrato', subtitulo: 'Contratos e Obras em Fiscalização' }
];

const FALLBACK_NOS = [
  {
    id: 1,
    parentId: null,
    parent_id: null,
    nivel_id: 1,
    nivel_slug: 'ceo',
    nivel_nome: 'Co-CEOs / Presidência',
    classe_css: 'jhe-level-ceo',
    cor_hex: '#0E284E',
    titulo: 'Co-CEOs',
    sigla: 'CEO',
    responsavel: ['Dr. Hélio', 'Dr. Viol'],
    cargo_responsavel: 'Co-CEOs (DH / DV)',
    email: 'diretoria@jhe.com.br',
    telefone: '(31) 3200-1000',
    descricao: 'Direção Estratégica Institucional JHE Consultores Associados',
    ordem: 1,
    lideres_secundarios: [{ nome: 'Dr. Viol', iniciais: 'DV', cargo: 'Co-CEO', cor_avatar: '#B4783C' }]
  },
  {
    id: 2,
    parentId: 1,
    parent_id: 1,
    nivel_id: 2,
    nivel_slug: 'oia',
    nivel_nome: 'OIA / Auditoria',
    classe_css: 'jhe-level-oia',
    cor_hex: '#0E284E',
    titulo: 'Organismo de Inspeção Acreditado',
    sigla: 'OIA',
    responsavel: ['Responsável Técnico OIA'],
    cargo_responsavel: 'Gestor OIA',
    email: 'oia@jhe.com.br',
    telefone: '(31) 3200-1010',
    descricao: 'Inspeção acreditada com independência técnica e governança',
    ordem: 1,
    lideres_secundarios: []
  },
  {
    id: 3,
    parentId: 1,
    parent_id: 1,
    nivel_id: 3,
    nivel_slug: 'staff',
    nivel_nome: 'Staff / Assessoria',
    classe_css: 'jhe-level-staff',
    cor_hex: '#0E284E',
    titulo: 'Assessoria Executiva & Governança',
    sigla: 'STAFF',
    responsavel: ['Coordenação Staff'],
    cargo_responsavel: 'Assessoria Estratégica',
    email: 'staff@jhe.com.br',
    telefone: '(31) 3200-1020',
    descricao: 'Suporte estratégico e conformidade institucional',
    ordem: 2,
    lideres_secundarios: []
  },
  {
    id: 4,
    parentId: 1,
    parent_id: 1,
    nivel_id: 4,
    nivel_slug: 'diretoria',
    nivel_nome: 'Diretoria Executiva',
    classe_css: 'jhe-level-diretoria',
    cor_hex: '#0E284E',
    titulo: 'Diretoria de Engenharia e Operações',
    sigla: 'DIR-ENG',
    responsavel: ['Leandro Neves'],
    cargo_responsavel: 'Diretor de Engenharia',
    email: 'engenharia@jhe.com.br',
    telefone: '(31) 3200-1030',
    descricao: 'Gestão global de contratos, projetos e unidades de negócios',
    ordem: 3,
    lideres_secundarios: []
  },
  {
    id: 5,
    parentId: 1,
    parent_id: 1,
    nivel_id: 4,
    nivel_slug: 'diretoria',
    nivel_nome: 'Diretoria Executiva',
    classe_css: 'jhe-level-diretoria',
    cor_hex: '#0E284E',
    titulo: 'Diretoria Comercial',
    sigla: 'DIR-COM',
    responsavel: ['Diretor Comercial'],
    cargo_responsavel: 'Diretor Comercial',
    email: 'comercial@jhe.com.br',
    telefone: '(31) 3200-1035',
    descricao: 'Desenvolvimento de novos negócios, propostas e relações corporativas',
    ordem: 4,
    lideres_secundarios: []
  },
  {
    id: 6,
    parentId: 1,
    parent_id: 1,
    nivel_id: 4,
    nivel_slug: 'diretoria',
    nivel_nome: 'Diretoria Executiva',
    classe_css: 'jhe-level-diretoria',
    cor_hex: '#0E284E',
    titulo: 'Diretoria Administrativa',
    sigla: 'DIR-ADM',
    responsavel: ['Diretor Administrativo'],
    cargo_responsavel: 'Diretor Financeiro & Administrativo',
    email: 'administrativo@jhe.com.br',
    telefone: '(31) 3200-1038',
    descricao: 'Controladoria, finanças, recursos humanos e suprimentos',
    ordem: 5,
    lideres_secundarios: []
  },
  {
    id: 7,
    parentId: 4,
    parent_id: 4,
    nivel_id: 7,
    nivel_slug: 'coordenacao',
    nivel_nome: 'Coordenação',
    classe_css: 'jhe-level-coordenacao',
    cor_hex: '#B4783C',
    titulo: 'Coordenação de Projetos e Contratos',
    sigla: 'COORD-PROJ',
    responsavel: ['Coordenador Geral'],
    cargo_responsavel: 'Coordenador de Engenharia',
    email: 'projetos@jhe.com.br',
    telefone: '(31) 3200-1040',
    descricao: 'Gestão tática das equipes multidisciplinares e contratos ativos',
    ordem: 1,
    lideres_secundarios: []
  },
  {
    id: 8,
    parentId: 4,
    parent_id: 4,
    nivel_id: 8,
    nivel_slug: 'apoio',
    nivel_nome: 'Apoio Operacional',
    classe_css: 'jhe-level-apoio',
    cor_hex: '#0284C7',
    titulo: 'Apoio Técnico e Planejamento',
    sigla: 'APOIO-TEC',
    responsavel: ['Líder de Planejamento'],
    cargo_responsavel: 'Especialista de Apoio',
    email: 'planejamento@jhe.com.br',
    telefone: '(31) 3200-1050',
    descricao: 'Suporte operacional, controle físico-financeiro e qualidade',
    ordem: 2,
    lideres_secundarios: []
  },
  {
    id: 9,
    parentId: 7,
    parent_id: 7,
    nivel_id: 9,
    nivel_slug: 'equipe',
    nivel_nome: 'Equipe Técnica',
    classe_css: 'jhe-level-equipe',
    cor_hex: '#5B6B7C',
    titulo: 'Equipe de Engenharia Civil e Estruturas',
    sigla: 'EQ-CIV',
    responsavel: ['Eng. Líder Civil'],
    cargo_responsavel: 'Líder Técnico',
    email: 'civil@jhe.com.br',
    telefone: '(31) 3200-1060',
    descricao: 'Execução técnica de projetos estruturais e consultoria',
    ordem: 1,
    lideres_secundarios: []
  },
  {
    id: 10,
    parentId: 7,
    parent_id: 7,
    nivel_id: 10,
    nivel_slug: 'contrato',
    nivel_nome: 'Contrato / Obra',
    classe_css: 'jhe-level-contrato',
    cor_hex: '#5B6B7C',
    titulo: 'Contrato 042/2026 - Fiscalização e Gerenciamento',
    sigla: 'CT-042',
    responsavel: ['Eng. Residente'],
    cargo_responsavel: 'Gestor de Contrato',
    email: 'ct042@jhe.com.br',
    telefone: '(31) 3200-1070',
    descricao: 'Contrato de gerenciamento e fiscalização de obras de infraestrutura',
    ordem: 2,
    lideres_secundarios: []
  }
];

/**
 * Detecta se uma string representa um placeholder de titular a definir ou vazio
 */
function isPlaceholderResponsavel(val) {
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

/**
 * Contabiliza titulares e responsáveis textuais válidos desconsiderando placeholders
 */
function contarResponsaveisValidos(resp) {
  if (!resp) return 0;
  if (Array.isArray(resp)) {
    return resp.filter((r) => {
      const nome = typeof r === 'string' ? r : r?.nome;
      return !isPlaceholderResponsavel(nome);
    }).length;
  }
  if (typeof resp === 'string') {
    if (isPlaceholderResponsavel(resp)) return 0;
    if (resp.trim().startsWith('[') && resp.trim().endsWith(']')) {
      try {
        const arr = JSON.parse(resp);
        if (Array.isArray(arr)) {
          return arr.filter((r) => {
            const nome = typeof r === 'string' ? r : r?.nome;
            return !isPlaceholderResponsavel(nome);
          }).length;
        }
      } catch (e) {}
    }
    const partes = resp.split(/ & |,|\be\b/i).map((s) => s.trim()).filter(Boolean);
    return partes.filter((p) => !isPlaceholderResponsavel(p)).length;
  }
  return 0;
}

/**
 * Utilitário para calcular a soma recursiva em cascata de pessoas na subárvore
 */
function calcularTotaisEquipeNos(nos) {
  const mapNos = new Map(nos.map((n) => [String(n.id), { ...n, children: [] }]));
  mapNos.forEach((n) => {
    if (n.parent_id && mapNos.has(String(n.parent_id))) {
      mapNos.get(String(n.parent_id)).children.push(n);
    }
  });

  function postOrder(node) {
    let somaFilhos = 0;
    for (const child of node.children) {
      postOrder(child);
      somaFilhos += (child.total_equipe_acumulada || 0);
    }
    node.total_equipe_acumulada = (node.membros_diretos ?? 0) + somaFilhos;
  }

  mapNos.forEach((n) => {
    if (!n.parent_id || !mapNos.has(String(n.parent_id))) {
      postOrder(n);
    }
  });

  return nos.map((no) => {
    const calc = mapNos.get(String(no.id));
    return {
      ...no,
      total_equipe_acumulada: calc ? calc.total_equipe_acumulada : (no.membros_diretos ?? 0)
    };
  });
}

/**
 * GET /api/organograma/arvore (ou /api/nos)
 * Consulta direta ao MySQL retornando os nós com níveis hierárquicos e equipe agregada
 */
export async function getArvoreOrganograma(req, res) {
  try {
    // 1. Busca todos os nós ativos com os dados do nível hierárquico
    const [nos] = await pool.query(`
      SELECT 
        n.id,
        n.parent_id,
        n.nivel_id,
        n.titulo,
        n.sigla,
        n.responsavel,
        n.cargo_responsavel,
        n.email,
        n.telefone,
        n.descricao,
        n.ordem,
        nh.nome AS nivel_nome,
        nh.slug AS slug_nivel,
        nh.cor_identificador,
        nh.nivel_ordem
      FROM organograma_nos n
      INNER JOIN niveis_hierarquicos nh ON n.nivel_id = nh.id
      WHERE n.ativo = 1
      ORDER BY nh.nivel_ordem ASC, n.ordem ASC
    `);

    // 2. Busca contagem de equipe vinculada (usuario_cargos_nos)
    const [vinculos] = await pool.query(`
      SELECT 
        v.no_id,
        u.id AS usuario_id,
        u.nome,
        u.email,
        u.cargo_especialidade
      FROM usuario_cargos_nos v
      INNER JOIN usuarios u ON v.usuario_id = u.id
      WHERE u.ativo = 1
    `);

    // 3. Mapeia equipe para cada nó e formata o campo responsavel (JSON parse seguro)
    const nosFormatados = nos.map((no) => {
      let resp = no.responsavel;
      try {
        if (typeof resp === 'string' && (resp.startsWith('[') || resp.startsWith('{'))) {
          resp = JSON.parse(resp);
        }
      } catch (e) {
        // mantém como string caso não seja JSON
      }

      const membrosEquipe = vinculos
        .filter((v) => v.no_id === no.id)
        .map((v) => ({
          id: v.usuario_id,
          nome: v.nome,
          email: v.email,
          cargo: v.cargo_especialidade
        }));

      let membrosDiretos = membrosEquipe.length;
      if (membrosDiretos === 0) {
        membrosDiretos = contarResponsaveisValidos(resp);
      }

      return {
        ...no,
        id: String(no.id),
        parent_id: no.parent_id ? String(no.parent_id) : null,
        parentId: no.parent_id ? String(no.parent_id) : null,
        nivel_slug: no.slug_nivel,
        cor_hex: no.cor_identificador || '#0E284E',
        classe_css: `jhe-level-${no.slug_nivel || 'diretoria'}`,
        responsavel: resp,
        membros_equipe: membrosEquipe,
        colaboradores_diretos: membrosEquipe,
        membros_diretos: membrosDiretos,
        total_equipe: membrosDiretos,
        count_direto: membrosDiretos
      };
    });

    const nosComTotaisAcumulados = calcularTotaisEquipeNos(nosFormatados);
    return res.json(nosComTotaisAcumulados);
  } catch (error) {
    console.error('Erro ao consultar árvore do banco:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao carregar dados do organograma.' });
  }
}

/**
 * GET /api/organograma
 * Consulta relacional agregando os nós, níveis hierárquicos e colaboradores vinculados
 */
export async function listarEstruturaCompleta(req, res) {
  try {
    const [niveis] = await pool.query(`
      SELECT id, slug, nome, nivel_ordem, nivel_ordem AS ordem_hierarquica,
             cor_identificador, cor_hex, classe_css, subtitulo
      FROM niveis_hierarquicos
      ORDER BY nivel_ordem ASC, id ASC
    `);

    const [nos] = await pool.query(`
      SELECT 
        n.id,
        n.parent_id,
        n.nivel_id,
        n.titulo,
        n.sigla,
        n.responsavel,
        n.cargo_responsavel,
        n.email,
        n.telefone,
        n.descricao,
        n.ordem,
        nh.nome AS nivel_nome,
        nh.slug AS slug_nivel,
        nh.cor_identificador,
        nh.nivel_ordem
      FROM organograma_nos n
      INNER JOIN niveis_hierarquicos nh ON n.nivel_id = nh.id
      WHERE n.ativo = 1
      ORDER BY nh.nivel_ordem ASC, n.ordem ASC
    `);

    const [vinculos] = await pool.query(`
      SELECT 
        v.no_id,
        u.id AS usuario_id,
        u.nome,
        u.email,
        u.cargo_especialidade
      FROM usuario_cargos_nos v
      INNER JOIN usuarios u ON v.usuario_id = u.id
      WHERE u.ativo = 1
    `);

    const nosFormatados = nos.map((no) => {
      let resp = no.responsavel;
      try {
        if (typeof resp === 'string' && (resp.startsWith('[') || resp.startsWith('{'))) {
          resp = JSON.parse(resp);
        }
      } catch (e) {
        // mantém como string caso não seja JSON
      }

      const membrosEquipe = vinculos
        .filter((v) => v.no_id === no.id)
        .map((v) => ({
          id: v.usuario_id,
          nome: v.nome,
          email: v.email,
          cargo: v.cargo_especialidade
        }));

      let membrosDiretos = membrosEquipe.length;
      if (membrosDiretos === 0) {
        membrosDiretos = contarResponsaveisValidos(resp);
      }

      return {
        ...no,
        id: String(no.id),
        parent_id: no.parent_id ? String(no.parent_id) : null,
        parentId: no.parent_id ? String(no.parent_id) : null,
        nivel_slug: no.slug_nivel,
        cor_hex: no.cor_identificador || '#0E284E',
        classe_css: `jhe-level-${no.slug_nivel || 'diretoria'}`,
        responsavel: resp,
        membros_equipe: membrosEquipe,
        colaboradores_diretos: membrosEquipe,
        membros_diretos: membrosDiretos,
        total_equipe: membrosDiretos,
        count_direto: membrosDiretos
      };
    });

    const nosComTotaisAcumulados = calcularTotaisEquipeNos(nosFormatados);

    return res.json({
      sucesso: true,
      niveis,
      nos: nosComTotaisAcumulados,
      fonte: 'mysql'
    });
  } catch (error) {
    console.error('Erro ao consultar estrutura completa do MySQL:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao carregar dados do organograma.' });
  }
}

/**
 * GET /api/organograma/niveis
 * Retorna o catálogo ordenado de níveis hierárquicos diretamente do MySQL
 */
export async function listarNiveis(req, res) {
  try {
    const [niveis] = await pool.query(`
      SELECT id, slug, nome, nivel_ordem, nivel_ordem AS ordem_hierarquica,
             cor_identificador, cor_hex, classe_css, subtitulo
      FROM niveis_hierarquicos
      ORDER BY nivel_ordem ASC, id ASC
    `);
    return res.json({ sucesso: true, niveis });
  } catch (error) {
    console.error('Erro ao consultar níveis do banco:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao carregar níveis.' });
  }
}

/**
 * POST /api/organograma/nos
 * Criação de novo nó + registro de auditoria
 */
export async function criarNo(req, res) {
  const {
    parent_id = null,
    parentId = null,
    nivel_id,
    titulo,
    sigla = null,
    responsavel = null,
    cargo_responsavel = null,
    email = null,
    email_contato = null,
    telefone = null,
    descricao = null,
    ordem = 0,
    lideres_secundarios = [],
    gestores_ids = []
  } = req.body;

  const emailFinal = email_contato ?? email ?? null;

  if (!nivel_id || !titulo) {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'Os campos nivel_id e titulo são obrigatórios.'
    });
  }

  const rawPId = parent_id !== undefined && parent_id !== null ? parent_id : parentId;
  const pId = rawPId !== null && rawPId !== '' && String(rawPId) !== '0' ? Number(rawPId) : null;

  if (pId === null) {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'A Área Superior Imediata (parent_id) é obrigatória para criação de novas áreas.'
    });
  }

  let responsavelDb = Array.isArray(responsavel)
    ? JSON.stringify(responsavel)
    : (typeof responsavel === 'string' ? responsavel.trim() : null);
  let cargoFinal = cargo_responsavel ? cargo_responsavel.trim() : null;

  const gestoresIdsLimpos = Array.isArray(gestores_ids)
    ? gestores_ids.map(Number).filter((id) => !isNaN(id) && id > 0)
    : [];

  try {
    const novoId = await withTransaction(async (conn) => {
      // 1. Se gestores_ids foi fornecido, consolida nomes e cargos oficiais dos usuários
      if (gestoresIdsLimpos.length > 0) {
        const [dadosGestores] = await conn.query(
          'SELECT id, nome, cargo, cargo_especialidade FROM usuarios WHERE id IN (?)',
          [gestoresIdsLimpos]
        );
        if (dadosGestores && dadosGestores.length > 0) {
          responsavelDb = JSON.stringify(dadosGestores.map((g) => g.nome));
          const cargos = dadosGestores
            .map((g) => g.cargo || g.cargo_especialidade)
            .filter(Boolean);
          if (cargos.length > 0) {
            cargoFinal = cargos.join(' / ');
          }
        }
      }

      const [result] = await conn.execute(
        `INSERT INTO organograma_nos
         (parent_id, nivel_id, titulo, sigla, responsavel, cargo_responsavel, email, telefone, descricao, ordem, lideres_secundarios, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          pId,
          nivel_id,
          titulo.trim(),
          sigla ? sigla.trim() : null,
          responsavelDb,
          cargoFinal,
          emailFinal ? emailFinal.trim().toLowerCase() : null,
          telefone ? telefone.trim() : null,
          descricao ? descricao.trim() : null,
          Number(ordem) || 0,
          JSON.stringify(lideres_secundarios || [])
        ]
      );

      const insertedId = result.insertId;

      // 2. Sincroniza vínculos de gestores/titulares na tabela relacional usuario_cargos_nos
      if (gestoresIdsLimpos.length > 0) {
        for (const uId of gestoresIdsLimpos) {
          await conn.execute(
            `INSERT INTO usuario_cargos_nos (usuario_id, no_id, tipo_vinculo, permissao)
             VALUES (?, ?, 'titular', 'gestao_completa')
             ON DUPLICATE KEY UPDATE tipo_vinculo = 'titular', permissao = 'gestao_completa'`,
            [uId, insertedId]
          );

          // Remove automaticamente qualquer registro transitório de pendência (#999) para este usuário
          await conn.execute(
            'DELETE FROM usuario_cargos_nos WHERE usuario_id = ? AND no_id = 999',
            [uId]
          );
        }
      }

      await registrarLogAuditoria({
        connection: conn,
        usuarioId: req.user?.id || null,
        acao: 'CRIACAO',
        noId: result.insertId,
        detalhes: {
          resumo: `Criação do nó "${titulo}"`,
          after: {
            id: result.insertId,
            parent_id: pId,
            nivel_id,
            titulo,
            sigla,
            responsavel: responsavelDb
          }
        }
      });

      return result.insertId;
    });

    return res.status(201).json({
      sucesso: true,
      id: novoId,
      mensagem: 'Nó cadastrado com sucesso.'
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ sucesso: false, mensagem: error.message });
    }
    const novoId = Math.max(0, ...FALLBACK_NOS.map((n) => Number(n.id))) + 1;
    const novoNo = {
      id: novoId,
      parent_id: pId,
      parentId: pId,
      nivel_id: Number(nivel_id),
      titulo: titulo.trim(),
      sigla: sigla ? sigla.trim() : null,
      responsavel,
      cargo_responsavel: cargo_responsavel ? cargo_responsavel.trim() : null,
      email: emailFinal ? emailFinal.trim().toLowerCase() : null,
      telefone: telefone ? telefone.trim() : null,
      descricao: descricao ? descricao.trim() : null,
      ordem: Number(ordem) || 0,
      lideres_secundarios: lideres_secundarios || []
    };
    FALLBACK_NOS.push(novoNo);
    return res.status(201).json({
      sucesso: true,
      id: novoId,
      mensagem: 'Nó cadastrado com sucesso (modo fallback).',
      fonte: 'fallback-memory'
    });
  }
}

/**
 * PUT /api/organograma/nos/:id
 * Atualização cadastral do setor + registro de auditoria
 */
export async function atualizarNo(req, res) {
  const noId = Number(req.params.id);
  const {
    parent_id,
    parentId,
    nivel_id,
    titulo,
    sigla,
    responsavel,
    cargo_responsavel,
    gestores_ids,
    email,
    email_contato,
    telefone,
    descricao,
    ordem,
    lideres_secundarios
  } = req.body;

  const emailFinal = email_contato !== undefined ? email_contato : email;

  const rawTargetParent = parent_id !== undefined ? parent_id : parentId;
  const novoParentId =
    rawTargetParent !== undefined
      ? (rawTargetParent !== null && rawTargetParent !== '' && String(rawTargetParent) !== '0' ? Number(rawTargetParent) : null)
      : undefined;

  const responsavelDb = responsavel !== undefined
    ? (Array.isArray(responsavel) ? JSON.stringify(responsavel) : (typeof responsavel === 'string' ? responsavel.trim() : null))
    : undefined;

  try {
    await withTransaction(async (conn) => {
      const [atuais] = await conn.execute('SELECT * FROM organograma_nos WHERE id = ? FOR UPDATE', [noId]);
      if (!atuais.length) {
        const err = new Error('Nó não localizado.');
        err.statusCode = 404;
        throw err;
      }

      const anterior = atuais[0];
      const targetParent = novoParentId !== undefined ? novoParentId : anterior.parent_id;

      // Se não for o nó raiz institucional, parent_id é obrigatório
      const isRootNode = noId === 1 || anterior.parent_id === null;
      if (!isRootNode && (targetParent === null || targetParent === 0)) {
        const err = new Error('A Área Superior Imediata (parent_id) é obrigatória para nós subordinados.');
        err.statusCode = 400;
        throw err;
      }

      // Se houve alteração de parent_id, executa verificação contra ciclos
      if (targetParent !== null && Number(targetParent) !== Number(anterior.parent_id)) {
        if (Number(targetParent) === noId) {
          const err = new Error('Um nó não pode ser subordinado a si mesmo.');
          err.statusCode = 400;
          throw err;
        }
        const isDescendente = await verificarSeEDescendente(conn, noId, targetParent);
        if (isDescendente) {
          const err = new Error('Operação inválida: não é permitido subordinar um nó a um de seus descendentes.');
          err.statusCode = 400;
          throw err;
        }
      }

      const mudouParent = targetParent !== anterior.parent_id;
      let respFinal = responsavelDb !== undefined ? responsavelDb : anterior.responsavel;
      let cargoFinal = cargo_responsavel !== undefined
        ? (cargo_responsavel ? cargo_responsavel.trim() : null)
        : anterior.cargo_responsavel;

      const temGestoresArray = Array.isArray(gestores_ids);
      const gestoresIdsLimpos = temGestoresArray
        ? gestores_ids.map(Number).filter((id) => !isNaN(id) && id > 0)
        : [];

      // 1. Atualização Cadastral do Nó (organograma_nos):
      // O campo responsavel é atualizado com a lista de nomes oficiais dos gestores selecionados
      // O campo cargo_responsavel recebe os cargos correspondentes
      if (temGestoresArray) {
        if (gestoresIdsLimpos.length > 0) {
          const [dadosGestores] = await conn.query(
            'SELECT id, nome, cargo, cargo_especialidade FROM usuarios WHERE id IN (?)',
            [gestoresIdsLimpos]
          );
          if (dadosGestores && dadosGestores.length > 0) {
            respFinal = JSON.stringify(dadosGestores.map((g) => g.nome));
            const cargos = dadosGestores
              .map((g) => g.cargo || g.cargo_especialidade)
              .filter(Boolean);
            cargoFinal = cargos.length > 0 ? cargos.join(' / ') : null;
          } else {
            respFinal = null;
            cargoFinal = null;
          }
        } else {
          // Desmarcou todos os gestores
          respFinal = null;
          cargoFinal = null;
        }
      }

      await conn.execute(
        `UPDATE organograma_nos
         SET parent_id = ?,
             nivel_id = ?,
             titulo = ?,
             sigla = ?,
             responsavel = ?,
             cargo_responsavel = ?,
             email = ?,
             telefone = ?,
             descricao = ?,
             ordem = ?,
             lideres_secundarios = ?
         WHERE id = ?`,
        [
          targetParent,
          nivel_id ?? anterior.nivel_id,
          titulo !== undefined ? titulo.trim() : anterior.titulo,
          sigla !== undefined ? (sigla ? sigla.trim() : null) : anterior.sigla,
          respFinal,
          cargoFinal,
          emailFinal !== undefined ? (emailFinal ? emailFinal.trim().toLowerCase() : null) : anterior.email,
          telefone !== undefined ? (telefone ? telefone.trim() : null) : anterior.telefone,
          descricao !== undefined ? (descricao ? descricao.trim() : null) : anterior.descricao,
          ordem !== undefined ? Number(ordem) : anterior.ordem,
          lideres_secundarios !== undefined
            ? JSON.stringify(lideres_secundarios)
            : anterior.lideres_secundarios,
          noId
        ]
      );

      // 2. Sincronização bidirecional na tabela relacional usuario_cargos_nos
      if (temGestoresArray) {
        // A) Buscar gestores titulares atuais deste nó
        const [vinculosAtuais] = await conn.query(
          "SELECT usuario_id FROM usuario_cargos_nos WHERE no_id = ? AND tipo_vinculo = 'titular'",
          [noId]
        );
        const idsAtuais = vinculosAtuais.map((v) => Number(v.usuario_id));

        // B) Identificar gestores a remover
        const idsParaRemover = idsAtuais.filter((uid) => !gestoresIdsLimpos.includes(uid));
        if (idsParaRemover.length > 0) {
          await conn.query(
            "DELETE FROM usuario_cargos_nos WHERE no_id = ? AND tipo_vinculo = 'titular' AND usuario_id IN (?)",
            [noId, idsParaRemover]
          );

          // Se após essa remoção o usuário não tiver mais nenhuma área vinculada em usuario_cargos_nos,
          // vincular novamente ao nó transitório #999 para voltar ao status de 'Pendente de Vínculo'
          for (const uid of idsParaRemover) {
            const [restantes] = await conn.query(
              'SELECT COUNT(*) as total FROM usuario_cargos_nos WHERE usuario_id = ?',
              [uid]
            );
            if (restantes[0]?.total === 0) {
              await conn.query(
                "INSERT INTO usuario_cargos_nos (usuario_id, no_id, tipo_vinculo, permissao) VALUES (?, 999, 'titular', 'leitura') ON DUPLICATE KEY UPDATE no_id = 999",
                [uid]
              );
            }
          }
        }

        // C) Inserir / Atualizar novos gestores
        for (const uid of gestoresIdsLimpos) {
          await conn.query(
            `INSERT INTO usuario_cargos_nos (usuario_id, no_id, tipo_vinculo, permissao)
             VALUES (?, ?, 'titular', 'gestao_completa')
             ON DUPLICATE KEY UPDATE tipo_vinculo = 'titular', permissao = 'gestao_completa'`,
            [uid, noId]
          );

          // Remover vínculo transitório #999 se existia para este usuário
          await conn.query(
            'DELETE FROM usuario_cargos_nos WHERE usuario_id = ? AND no_id = 999',
            [uid]
          );
        }
      }

      await registrarLogAuditoria({
        connection: conn,
        usuarioId: req.user?.id || null,
        acao: mudouParent ? 'MOVIMENTACAO' : 'EDICAO',
        noId,
        detalhes: {
          resumo: mudouParent
            ? `Movimentação hierárquica de "${titulo || anterior.titulo}"`
            : `Edição cadastral de "${titulo || anterior.titulo}"`,
          before: {
            parent_id: anterior.parent_id,
            nivel_id: anterior.nivel_id,
            titulo: anterior.titulo,
            responsavel: anterior.responsavel
          },
          after: {
            parent_id: targetParent,
            nivel_id: nivel_id ?? anterior.nivel_id,
            titulo: titulo ?? anterior.titulo,
            responsavel: respFinal
          }
        }
      });
    });

    return res.json({
      sucesso: true,
      mensagem: 'Nó atualizado com sucesso.'
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ sucesso: false, mensagem: error.message });
    }
    const idx = FALLBACK_NOS.findIndex((n) => Number(n.id) === noId);
    if (idx !== -1) {
      FALLBACK_NOS[idx] = {
        ...FALLBACK_NOS[idx],
        ...(titulo !== undefined && { titulo: titulo.trim() }),
        ...(sigla !== undefined && { sigla: sigla ? sigla.trim() : null }),
        ...(responsavel !== undefined && { responsavel }),
        ...(cargo_responsavel !== undefined && { cargo_responsavel: cargo_responsavel ? cargo_responsavel.trim() : null }),
        ...(emailFinal !== undefined && { email: emailFinal ? emailFinal.trim().toLowerCase() : null }),
        ...(telefone !== undefined && { telefone: telefone ? telefone.trim() : null }),
        ...(descricao !== undefined && { descricao: descricao ? descricao.trim() : null }),
        ...(nivel_id !== undefined && { nivel_id: Number(nivel_id) }),
        ...(ordem !== undefined && { ordem: Number(ordem) }),
        ...(targetParent !== undefined && { parent_id: targetParent, parentId: targetParent }),
        ...(lideres_secundarios !== undefined && { lideres_secundarios })
      };
    }
    return res.json({
      sucesso: true,
      mensagem: 'Nó atualizado com sucesso (modo fallback).',
      fonte: 'fallback-memory'
    });
  }
}

/**
 * PATCH /api/organograma/nos/:id/mover
 * Alteração de subordinação hierárquica direta com validação anti-ciclos rigorosa
 */
export async function moverNo(req, res) {
  const noId = Number(req.params.id);
  const { parent_id, parentId, ordem } = req.body;

  const rawParent = parent_id !== undefined ? parent_id : parentId;
  const novoParentId =
    rawParent !== null && rawParent !== undefined && rawParent !== '' && String(rawParent) !== '0'
      ? Number(rawParent)
      : null;

  if (novoParentId !== null && novoParentId === noId) {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'Um nó não pode ser filho de si mesmo.'
    });
  }

  try {
    await withTransaction(async (conn) => {
      const [rows] = await conn.execute('SELECT * FROM organograma_nos WHERE id = ? FOR UPDATE', [noId]);
      if (!rows.length) {
        const err = new Error('Nó não encontrado.');
        err.statusCode = 404;
        throw err;
      }

      const noAtual = rows[0];

      // Impedir mover a raiz sem parent_id se não for admin
      if (noAtual.parent_id === null && novoParentId !== null) {
        const err = new Error('O nó raiz (Co-CEOs) não pode ser subordinado a outra área.');
        err.statusCode = 400;
        throw err;
      }

      // Validação contra ciclo hierárquico
      if (novoParentId !== null) {
        const isDescendente = await verificarSeEDescendente(conn, noId, novoParentId);
        if (isDescendente) {
          const err = new Error('Ciclo hierárquico detectado: o destino não pode ser descendente do nó selecionado.');
          err.statusCode = 400;
          throw err;
        }
      }

      const novaOrdem = ordem !== undefined ? Number(ordem) : noAtual.ordem;

      await conn.execute(
        'UPDATE organograma_nos SET parent_id = ?, ordem = ?, atualizado_em = NOW() WHERE id = ?',
        [novoParentId, novaOrdem, noId]
      );

      await registrarLogAuditoria({
        connection: conn,
        usuarioId: req.user?.id || null,
        acao: 'MOVIMENTACAO',
        noId,
        detalhes: {
          resumo: `Movimentação de nó "${noAtual.titulo}" para novo superior (#${novoParentId ?? 'RAIZ'})`,
          before: { parent_id: noAtual.parent_id, ordem: noAtual.ordem },
          after: { parent_id: novoParentId, ordem: novaOrdem }
        }
      });
    });

    return res.json({
      sucesso: true,
      mensagem: 'Nó movido com sucesso.'
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ sucesso: false, mensagem: error.message });
    }
    const no = FALLBACK_NOS.find((n) => Number(n.id) === noId);
    if (!no) {
      return res.status(404).json({ sucesso: false, mensagem: 'Nó não encontrado.' });
    }
    no.parent_id = novoParentId;
    no.parentId = novoParentId;
    if (ordem !== undefined) no.ordem = Number(ordem);

    return res.json({
      sucesso: true,
      mensagem: 'Nó movido com sucesso (modo fallback).',
      fonte: 'fallback-memory'
    });
  }
}

/**
 * DELETE /api/organograma/nos/:id
 * Exclusão segura com remapeamento ou cascata e log de auditoria
 */
export async function excluirNo(req, res) {
  const noId = Number(req.params.id);

  try {
    await withTransaction(async (conn) => {
      const [atuais] = await conn.execute('SELECT * FROM organograma_nos WHERE id = ? FOR UPDATE', [noId]);
      if (!atuais.length) {
        const err = new Error('Nó não encontrado.');
        err.statusCode = 404;
        throw err;
      }

      const alvo = atuais[0];
      if (alvo.parent_id === null) {
        const err = new Error('Não é permitido excluir o nó raiz institucional (Co-CEOs).');
        err.statusCode = 400;
        throw err;
      }

      // Bloqueio relacional: impede exclusão de nó que possua filhos/subordinados ativos
      const [filhos] = await conn.execute(
        'SELECT id, titulo FROM organograma_nos WHERE parent_id = ? AND (ativo = 1 OR ativo = true)',
        [noId]
      );
      if (filhos.length > 0) {
        const err = new Error(
          `Não é permitido excluir o nó "${alvo.titulo}" pois existem ${filhos.length} subunidade(s) diretamente vinculada(s). Realoque os subordinados antes de prosseguir.`
        );
        err.statusCode = 400;
        throw err;
      }

      // Remove vínculos de equipe associados antes de deletar o nó
      await conn.execute('DELETE FROM usuario_cargos_nos WHERE no_id = ?', [noId]);

      // Registra a auditoria antes da exclusão com detalhes completos
      await registrarLogAuditoria({
        connection: conn,
        usuarioId: req.user?.id || null,
        acao: 'EXCLUSAO',
        noId: null,
        detalhes: {
          no_id_excluido: noId,
          resumo: `Exclusão da unidade "${alvo.titulo}" (ID #${noId})`,
          before: alvo
        }
      });

      await conn.execute('DELETE FROM organograma_nos WHERE id = ?', [noId]);
    });

    return res.json({
      sucesso: true,
      mensagem: 'Nó excluído com sucesso.'
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ sucesso: false, mensagem: error.message });
    }
    const idx = FALLBACK_NOS.findIndex((n) => Number(n.id) === noId);
    if (idx !== -1) {
      FALLBACK_NOS.splice(idx, 1);
    }
    return res.json({
      sucesso: true,
      mensagem: 'Nó excluído com sucesso (modo fallback).'
    });
  }
}

/**
 * Função utilitária interna: verifica se `candidatoFilhoId` descende de `ancestralId`
 */
async function verificarSeEDescendente(conn, ancestralId, candidatoFilhoId) {
  let currentParentId = candidatoFilhoId;
  const visitados = new Set();

  while (currentParentId !== null) {
    if (Number(currentParentId) === Number(ancestralId)) {
      return true;
    }
    if (visitados.has(currentParentId)) {
      break;
    }
    visitados.add(currentParentId);

    const [rows] = await conn.execute(
      'SELECT parent_id FROM organograma_nos WHERE id = ?',
      [currentParentId]
    );

    if (!rows.length || rows[0].parent_id === null) {
      break;
    }
    currentParentId = rows[0].parent_id;
  }

  return false;
}

/**
 * PUT /api/organograma/niveis
 * Atualização em lote do catálogo de níveis hierárquicos e governança de cores
 */
export async function salvarNiveis(req, res) {
  const { niveis } = req.body;
  if (!Array.isArray(niveis)) {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'O corpo da requisição deve conter uma lista "niveis".'
    });
  }

  try {
    await withTransaction(async (conn) => {
      for (const nv of niveis) {
        if (!nv.id) continue;
        const cor = nv.cor_identificador || nv.cor_hex || '#0E284E';
        const ordem = Number(nv.nivel_ordem ?? nv.ordem_hierarquica ?? 0);
        const slug = nv.slug || `nivel_${nv.id}`;

        await conn.execute(
          `INSERT INTO niveis_hierarquicos
             (id, nome, slug, nivel_ordem, cor_identificador, cor_hex, classe_css, subtitulo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             nome = VALUES(nome),
             slug = VALUES(slug),
             nivel_ordem = VALUES(nivel_ordem),
             cor_identificador = VALUES(cor_identificador),
             cor_hex = VALUES(cor_hex),
             classe_css = VALUES(classe_css),
             subtitulo = VALUES(subtitulo)`,
          [
            Number(nv.id),
            nv.nome,
            slug,
            ordem,
            cor,
            cor,
            nv.classe_css || `jhe-level-${slug}`,
            nv.subtitulo || null
          ]
        );
      }

      await registrarLogAuditoria({
        connection: conn,
        usuarioId: req.user?.id || null,
        acao: 'EDICAO',
        detalhes: {
          modulo: 'GOVERNANCA',
          resumo: 'Atualização do catálogo de níveis hierárquicos e cores',
          total: niveis.length
        }
      });
    });

    // Mantém FALLBACK_NIVEIS sincronizado
    niveis.forEach((nv) => {
      const cor = nv.cor_identificador || nv.cor_hex || '#0E284E';
      const idx = FALLBACK_NIVEIS.findIndex((f) => Number(f.id) === Number(nv.id));
      if (idx !== -1) {
        FALLBACK_NIVEIS[idx] = {
          ...FALLBACK_NIVEIS[idx],
          ...nv,
          cor_identificador: cor,
          cor_hex: cor
        };
      }
    });

    return res.json({
      sucesso: true,
      mensagem: 'Níveis hierárquicos sincronizados com sucesso.'
    });
  } catch (error) {
    console.error('Erro ao salvar niveis no MySQL:', error.message);
    niveis.forEach((nv) => {
      const cor = nv.cor_identificador || nv.cor_hex || '#0E284E';
      const idx = FALLBACK_NIVEIS.findIndex((f) => Number(f.id) === Number(nv.id));
      if (idx !== -1) {
        FALLBACK_NIVEIS[idx] = {
          ...FALLBACK_NIVEIS[idx],
          ...nv,
          cor_identificador: cor,
          cor_hex: cor
        };
      }
    });
    return res.json({
      sucesso: true,
      mensagem: 'Níveis atualizados na sessão (modo fallback).'
    });
  }
}

export const salvarNo = atualizarNo;
