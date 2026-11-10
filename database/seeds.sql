-- =============================================================================
-- JHE ENGENHARIA - SEEDS INICIAIS (Níveis Hierárquicos, Admin e Estrutura Base)
-- =============================================================================

USE `jhe_organograma`;

-- 1. Níveis Hierárquicos oficiais com classes semânticas e cores JHE Engenharia
INSERT INTO `niveis_hierarquicos` (`id`, `slug`, `nome`, `ordem_hierarquica`, `classe_css`, `cor_hex`) VALUES
  (1,  'ceo',         'Co-CEOs / Presidência',   1,  'jhe-level-ceo',         '#0E284E'),
  (2,  'oia',         'OIA / Auditoria',         2,  'jhe-level-oia',         '#0E284E'),
  (3,  'staff',       'Staff / Assessoria',      2,  'jhe-level-staff',       '#0E284E'),
  (4,  'diretoria',   'Diretoria Executiva',     3,  'jhe-level-diretoria',   '#0E284E'),
  (5,  'gerencia',    'Gerência',                4,  'jhe-level-gerencia',    '#B4783C'),
  (6,  'unidade',     'Unidade de Negócios',     4,  'jhe-level-unidade',     '#B4783C'),
  (7,  'coordenacao', 'Coordenação',             5,  'jhe-level-coordenacao', '#B4783C'),
  (8,  'apoio',       'Apoio Operacional',       6,  'jhe-level-apoio',       '#0284C7'),
  (9,  'equipe',      'Equipe Técnica',          7,  'jhe-level-equipe',      '#5B6B7C'),
  (10, 'contrato',    'Contrato / Obra',         8,  'jhe-level-contrato',    '#5B6B7C')
ON DUPLICATE KEY UPDATE
  `nome` = VALUES(`nome`),
  `ordem_hierarquica` = VALUES(`ordem_hierarquica`),
  `classe_css` = VALUES(`classe_css`),
  `cor_hex` = VALUES(`cor_hex`);

-- 2. Usuário Administrador Padrão (Senha padrão: Jhe@2026 - hash bcrypt)
INSERT INTO `usuarios` (`id`, `nome`, `email`, `senha`, `role_global`, `ativo`) VALUES
  (1, 'Administrador Governança JHE', 'governanca@jhe.com.br', '$2b$10$Q7i6H9K8p4Z1x2V3m5N7uO9yR0tW2eE4rT6yU8iO0pA2sD4fG6hJ8', 'admin', 1)
ON DUPLICATE KEY UPDATE
  `nome` = VALUES(`nome`);

-- 3. Nós Iniciais do Organograma JHE Engenharia
INSERT INTO `organograma_nos` (
  `id`, `parent_id`, `nivel_id`, `titulo`, `sigla`, `responsavel`, `cargo_responsavel`,
  `email`, `descricao`, `ordem`, `lideres_secundarios`
) VALUES
  (
    1, NULL, 1, 'Conselho & Co-CEOs', 'CEO', 'Dr. Hélio', 'Co-CEO (DH)',
    'diretoria@jhe.com.br', 'Direção Estratégica Institucional JHE Consultores Associados', 1,
    JSON_ARRAY(
      JSON_OBJECT('nome', 'Dr. Viol', 'iniciais', 'DV', 'cargo', 'Co-CEO', 'cor_avatar', '#B4783C')
    )
  ),
  (
    2, 1, 2, 'Organismo de Inspeção Acreditado', 'OIA', 'Responsável Técnico OIA', 'Gestor OIA',
    'oia@jhe.com.br', 'Inspeção acreditada com independência técnica e governança', 1, NULL
  ),
  (
    3, 1, 3, 'Assessoria Executiva & Governança', 'STAFF', 'Coordenação Staff', 'Assessoria Estratégica',
    'staff@jhe.com.br', 'Suporte estratégico e conformidade institucional', 2, NULL
  ),
  (
    4, 1, 4, 'Diretoria de Engenharia e Operações', 'DIR-ENG', 'Diretor de Engenharia', 'Diretor Executivo',
    'engenharia@jhe.com.br', 'Gestão global de contratos, projetos e unidades de negócios', 3, NULL
  ),
  (
    5, 4, 7, 'Coordenação de Projetos e Contratos', 'COORD-PROJ', 'Coordenador Geral', 'Coordenador de Engenharia',
    'projetos@jhe.com.br', 'Gestão tática das equipes multidisciplinares e contratos ativos', 1, NULL
  ),
  (
    6, 4, 8, 'Apoio Técnico e Planejamento', 'APOIO-TEC', 'Líder de Planejamento', 'Especialista de Apoio',
    'planejamento@jhe.com.br', 'Suporte operacional, controle físico-financeiro e qualidade', 2, NULL
  ),
  (
    7, 5, 9, 'Equipe de Engenharia Civil e Estruturas', 'EQ-CIV', 'Eng. Líder Civil', 'Líder Técnico',
    'civil@jhe.com.br', 'Execução técnica de projetos estruturais e consultoria', 1, NULL
  ),
  (
    8, 5, 10, 'Contrato 042/2026 - Fiscalização e Gerenciamento', 'CT-042', 'Eng. Residente', 'Gestor de Contrato',
    'ct042@jhe.com.br', 'Contrato de gerenciamento e fiscalização de obras de infraestrutura', 2, NULL
  )
ON DUPLICATE KEY UPDATE
  `titulo` = VALUES(`titulo`),
  `lideres_secundarios` = VALUES(`lideres_secundarios`);
