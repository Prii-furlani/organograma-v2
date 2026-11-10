-- =============================================================================
-- JHE ENGENHARIA - SISTEMA CORPORATIVO DE ORGANOGRAMA E GOVERNANÇA (v2.0)
-- Script SQL Unificado, Idempotente e Pronto para Execução Direta no phpMyAdmin
-- Motor: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `jhe_organograma`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `jhe_organograma`;

SET NAMES utf8mb4;
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS = 0;
SET @OLD_SQL_MODE = @@SQL_MODE, SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- -----------------------------------------------------------------------------
-- 1. TABELA: niveis_hierarquicos
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `niveis_hierarquicos`;
CREATE TABLE `niveis_hierarquicos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(100) NOT NULL COMMENT 'Nome de exibição do nível hierárquico',
  `slug` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Identificador semântico único',
  `nivel_ordem` INT NOT NULL DEFAULT 0 COMMENT 'Peso hierárquico: 0 = Topo, 1 = Imediato, 2 = Diretoria, etc.',
  `cor_identificador` VARCHAR(20) NOT NULL DEFAULT '#0E284E' COMMENT 'Cor do pontinho e bordas institucionais',
  `cor_hex` VARCHAR(20) NOT NULL DEFAULT '#0E284E' COMMENT 'Alias para compatibilidade de temas e renderização D3',
  `classe_css` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Classes utilitárias de estilo visual',
  `subtitulo` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Descrição resumida da camada institucional',
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_niveis_ordem` (`nivel_ordem`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Níveis hierárquicos institucionais e metadados de apresentação visual';

-- -----------------------------------------------------------------------------
-- 2. TABELA: organograma_nos
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `organograma_nos`;
CREATE TABLE `organograma_nos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `parent_id` INT NULL DEFAULT NULL COMMENT 'Auto-relacionamento apontando para organograma_nos.id',
  `nivel_id` INT NOT NULL COMMENT 'FK para niveis_hierarquicos.id',
  `titulo` VARCHAR(255) NOT NULL COMMENT 'Nome da área, diretoria, setor ou contrato',
  `sigla` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Sigla institucional (ex: DIR-ENG, STAFF, OIA, COORD-PROJ)',
  `responsavel` TEXT NULL DEFAULT NULL COMMENT 'JSON ou string com cotitulares: ["Dr. Hélio", "Dr. Viol"]',
  `cargo_responsavel` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Cargo funcional do responsável',
  `email` VARCHAR(255) NULL DEFAULT NULL COMMENT 'E-mail corporativo do setor',
  `telefone` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Telefone institucional ou ramal',
  `descricao` TEXT NULL DEFAULT NULL COMMENT 'Atribuições e competências institucionais do setor',
  `ordem` INT DEFAULT 0 COMMENT 'Ordenação determinística entre nós irmãos',
  `lideres_secundarios` JSON NULL DEFAULT NULL COMMENT 'Co-líderes e adjuntos com avatar em JSON',
  `ativo` TINYINT(1) DEFAULT 1 COMMENT '1 = Ativo, 0 = Inativo',
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_nos_parent` (`parent_id`),
  INDEX `idx_nos_nivel` (`nivel_id`),
  INDEX `idx_nos_ordem` (`parent_id`, `ordem`),
  CONSTRAINT `fk_nos_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `organograma_nos` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_nos_nivel`
    FOREIGN KEY (`nivel_id`) REFERENCES `niveis_hierarquicos` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nós e unidades da árvore do organograma corporativo JHE';

-- -----------------------------------------------------------------------------
-- 3. TABELA: usuarios
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `senha` VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt da senha de acesso',
  `cargo` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Cargo / Função corporativa',
  `cargo_especialidade` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Especialidade funcional e técnica',
  `role_global` ENUM('admin', 'diretor', 'coordenador', 'colaborador') NOT NULL DEFAULT 'colaborador',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Ativo, 0 = Bloqueado',
  `primeiro_acesso` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Obriga troca de senha provisória',
  `ultimo_login` TIMESTAMP NULL DEFAULT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_usuarios_role_ativo` (`role_global`, `ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Usuários do sistema e credenciais de acesso corporativo';

-- -----------------------------------------------------------------------------
-- 4. TABELA: usuario_cargos_nos (Múltiplos vínculos estruturais)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `usuario_cargos_nos`;
CREATE TABLE `usuario_cargos_nos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL COMMENT 'FK para usuarios.id',
  `no_id` INT NOT NULL COMMENT 'FK para organograma_nos.id',
  `tipo_vinculo` ENUM('titular', 'acumulacao') NOT NULL DEFAULT 'titular',
  `permissao` ENUM('leitura', 'edicao', 'gestao_completa') NOT NULL DEFAULT 'edicao',
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_usuario_no` (`usuario_id`, `no_id`),
  INDEX `idx_vinculo_usuario` (`usuario_id`),
  INDEX `idx_vinculo_no` (`no_id`),
  CONSTRAINT `fk_ucn_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ucn_no`
    FOREIGN KEY (`no_id`) REFERENCES `organograma_nos` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tabela associativa de múltiplos vínculos de colaboradores aos nós estruturais';

-- -----------------------------------------------------------------------------
-- 5. TABELA: organograma_logs (Auditoria de governança)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `organograma_logs`;
CREATE TABLE `organograma_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NULL DEFAULT NULL COMMENT 'FK para usuarios.id (responsável pela ação)',
  `no_id` INT NULL DEFAULT NULL COMMENT 'FK para organograma_nos.id (nó afetado)',
  `acao` ENUM('CRIACAO', 'EDICAO', 'MOVIMENTACAO', 'EXCLUSAO', 'AUTENTICACAO') NOT NULL,
  `detalhes` JSON NOT NULL COMMENT 'Payload com DE -> PARA, setor afetado e contexto',
  `data_hora` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_logs_usuario` (`usuario_id`),
  INDEX `idx_logs_no` (`no_id`),
  INDEX `idx_logs_acao` (`acao`),
  INDEX `idx_logs_data_hora` (`data_hora` DESC),
  CONSTRAINT `fk_logs_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_logs_no`
    FOREIGN KEY (`no_id`) REFERENCES `organograma_nos` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Trilha imutável de logs e auditoria corporativa';

-- 6. Tabela de Configurações Globais do Sistema (Identidade Visual, Títulos e Tags)
CREATE TABLE IF NOT EXISTS `configuracoes_sistema` (
  `id` INT NOT NULL DEFAULT 1,
  `titulo_sistema` VARCHAR(255) NOT NULL DEFAULT 'Organograma Corporativo',
  `subtitulo_sistema` VARCHAR(255) NOT NULL DEFAULT 'JHE Consultores Associados',
  `tag_texto` VARCHAR(100) NOT NULL DEFAULT 'Governança',
  `tag_ativa` TINYINT(1) NOT NULL DEFAULT 1,
  `logo_clara_url` LONGTEXT NULL,
  `logo_escura_url` LONGTEXT NULL,
  `cor_primaria` VARCHAR(30) NOT NULL DEFAULT '#0E284E',
  `cor_secundaria` VARCHAR(30) NOT NULL DEFAULT '#0284C7',
  `cor_fundo_canvas` VARCHAR(30) NOT NULL DEFAULT '#F8FAFC',
  `timeout_ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `timeout_inatividade_minutos` INT NOT NULL DEFAULT 60,
  `prevencao_ciclos_ativa` TINYINT(1) NOT NULL DEFAULT 1,
  `exigir_troca_senha_primeiro_acesso` TINYINT(1) NOT NULL DEFAULT 1,
  `senha_temporaria_padrao` VARCHAR(100) NOT NULL DEFAULT 'JHE@2026',
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Configurações de identidade visual, logotipos e títulos do sistema';

-- =============================================================================
-- CARGA INICIAL DE DADOS (SEEDS REAIS E COMPLETOS)
-- =============================================================================

-- 1. Catálogo Oficial dos 10 Níveis Hierárquicos da JHE Engenharia
INSERT INTO `niveis_hierarquicos` (
  `id`, `nome`, `slug`, `nivel_ordem`, `cor_identificador`, `cor_hex`, `classe_css`, `subtitulo`
) VALUES
  (1,  'Co-CEOs / Presidência',   'ceo',         0, '#0E284E', '#0E284E', 'jhe-level-ceo',         'Direção Executiva e Conselho de Administração'),
  (2,  'OIA / Auditoria',         'oia',         1, '#0E284E', '#0E284E', 'jhe-level-oia',         'Organismo de Inspeção Acreditado'),
  (3,  'Staff / Assessoria',      'staff',       1, '#0E284E', '#0E284E', 'jhe-level-staff',       'Assessoria Estratégica & Governança'),
  (4,  'Diretoria Executiva',     'diretoria',   2, '#0E284E', '#0E284E', 'jhe-level-diretoria',   'Diretorias Corporativas e Operacionais'),
  (5,  'Gerência',                'gerencia',    3, '#B4783C', '#B4783C', 'jhe-level-gerencia',    'Gerências Setoriais e Regionais'),
  (6,  'Unidade de Negócios',     'unidade',     3, '#B4783C', '#B4783C', 'jhe-level-unidade',     'Unidades de Negócio Estruturadas'),
  (7,  'Coordenação',             'coordenacao', 4, '#B4783C', '#B4783C', 'jhe-level-coordenacao', 'Coordenação de Projetos e Contratos'),
  (8,  'Apoio Operacional',       'apoio',       5, '#0284C7', '#0284C7', 'jhe-level-apoio',       'Apoio Técnico e Suporte Operacional'),
  (9,  'Equipe Técnica',          'equipe',      6, '#5B6B7C', '#5B6B7C', 'jhe-level-equipe',      'Corpo Técnico Multidisciplinar'),
  (10, 'Contrato / Obra',         'contrato',    7, '#5B6B7C', '#5B6B7C', 'jhe-level-contrato',    'Contratos e Obras em Fiscalização')
ON DUPLICATE KEY UPDATE
  `nome` = VALUES(`nome`),
  `slug` = VALUES(`slug`),
  `nivel_ordem` = VALUES(`nivel_ordem`),
  `cor_identificador` = VALUES(`cor_identificador`),
  `cor_hex` = VALUES(`cor_hex`),
  `classe_css` = VALUES(`classe_css`),
  `subtitulo` = VALUES(`subtitulo`);

-- 2. Estrutura Completa de Nós da JHE Engenharia
INSERT INTO `organograma_nos` (
  `id`, `parent_id`, `nivel_id`, `titulo`, `sigla`, `responsavel`, `cargo_responsavel`,
  `email`, `telefone`, `descricao`, `ordem`, `lideres_secundarios`, `ativo`
) VALUES
  (
    1, NULL, 1, 'Conselho & Co-CEOs', 'CEO', '["Dr. Hélio", "Dr. Viol"]', 'Co-CEOs (DH / DV)',
    'diretoria@jhe.com.br', '(31) 3200-1000', 'Direção Estratégica Institucional JHE Consultores Associados', 1,
    JSON_ARRAY(
      JSON_OBJECT('nome', 'Dr. Viol', 'iniciais', 'DV', 'cargo', 'Co-CEO', 'cor_avatar', '#B4783C')
    ), 1
  ),
  (
    2, 1, 2, 'Organismo de Inspeção Acreditado', 'OIA', '["Responsável Técnico OIA"]', 'Gestor OIA',
    'oia@jhe.com.br', '(31) 3200-1010', 'Inspeção acreditada com independência técnica e governança', 1, NULL, 1
  ),
  (
    3, 1, 3, 'Assessoria Executiva & Governança', 'STAFF', '["Coordenação Staff"]', 'Assessoria Estratégica',
    'staff@jhe.com.br', '(31) 3200-1020', 'Suporte estratégico e conformidade institucional', 2, NULL, 1
  ),
  (
    4, 1, 4, 'Diretoria de Engenharia e Operações', 'DIR-ENG', '["Leandro Neves"]', 'Diretor de Engenharia',
    'engenharia@jhe.com.br', '(31) 3200-1030', 'Gestão global de contratos, projetos e unidades de negócios', 3, NULL, 1
  ),
  (
    5, 1, 4, 'Diretoria Comercial', 'DIR-COM', '["Diretor Comercial"]', 'Diretor Comercial',
    'comercial@jhe.com.br', '(31) 3200-1035', 'Desenvolvimento de novos negócios, propostas e relações corporativas', 4, NULL, 1
  ),
  (
    6, 1, 4, 'Diretoria Administrativa', 'DIR-ADM', '["Diretor Administrativo"]', 'Diretor Financeiro & Administrativo',
    'administrativo@jhe.com.br', '(31) 3200-1038', 'Controladoria, finanças, recursos humanos e suprimentos', 5, NULL, 1
  ),
  (
    7, 4, 7, 'Coordenação de Projetos e Contratos', 'COORD-PROJ', '["Coordenador Geral"]', 'Coordenador de Engenharia',
    'projetos@jhe.com.br', '(31) 3200-1040', 'Gestão tática das equipes multidisciplinares e contratos ativos', 1, NULL, 1
  ),
  (
    8, 4, 8, 'Apoio Técnico e Planejamento', 'APOIO-TEC', '["Líder de Planejamento"]', 'Especialista de Apoio',
    'planejamento@jhe.com.br', '(31) 3200-1050', 'Suporte operacional, controle físico-financeiro e qualidade', 2, NULL, 1
  ),
  (
    9, 7, 9, 'Equipe de Engenharia Civil e Estruturas', 'EQ-CIV', '["Eng. Líder Civil"]', 'Líder Técnico',
    'civil@jhe.com.br', '(31) 3200-1060', 'Execução técnica de projetos estruturais e consultoria', 1, NULL, 1
  ),
  (
    10, 7, 10, 'Contrato 042/2026 - Fiscalização e Gerenciamento', 'CT-042', '["Eng. Residente"]', 'Gestor de Contrato',
    'ct042@jhe.com.br', '(31) 3200-1070', 'Contrato de gerenciamento e fiscalização de obras de infraestrutura', 2, NULL, 1
  )
ON DUPLICATE KEY UPDATE
  `parent_id` = VALUES(`parent_id`),
  `nivel_id` = VALUES(`nivel_id`),
  `titulo` = VALUES(`titulo`),
  `sigla` = VALUES(`sigla`),
  `responsavel` = VALUES(`responsavel`),
  `cargo_responsavel` = VALUES(`cargo_responsavel`),
  `email` = VALUES(`email`),
  `telefone` = VALUES(`telefone`),
  `descricao` = VALUES(`descricao`),
  `ordem` = VALUES(`ordem`),
  `lideres_secundarios` = VALUES(`lideres_secundarios`),
  `ativo` = VALUES(`ativo`);

-- 3. Catálogo de Usuários Corporativos
-- Hash Bcrypt oficial de 10 rounds para a senha provisória "JHE@2026":
-- $2b$10$FVgz1Nb9wt1Qhm/Sg3IY.OJhHHdc1gvNP5VeDy/Vx0rMyhUh61W3e
INSERT INTO `usuarios` (
  `id`, `nome`, `email`, `senha`, `cargo`, `cargo_especialidade`, `role_global`, `ativo`, `primeiro_acesso`
) VALUES
  (
    1, 'Administrador Governança JHE', 'governanca@jhe.com.br',
    '$2b$10$FVgz1Nb9wt1Qhm/Sg3IY.OJhHHdc1gvNP5VeDy/Vx0rMyhUh61W3e',
    'Gestor de Governança e Compliance', 'Governança & Riscos Corporativos',
    'admin', 1, 1
  ),
  (
    2, 'Dr. Hélio', 'diretoria@jhe.com.br',
    '$2b$10$FVgz1Nb9wt1Qhm/Sg3IY.OJhHHdc1gvNP5VeDy/Vx0rMyhUh61W3e',
    'Co-CEO Institucional', 'Engenharia Consultiva & Diretoria',
    'diretor', 1, 0
  ),
  (
    3, 'Dr. Viol', 'diretoria.viol@jhe.com.br',
    '$2b$10$FVgz1Nb9wt1Qhm/Sg3IY.OJhHHdc1gvNP5VeDy/Vx0rMyhUh61W3e',
    'Co-CEO Institucional', 'Operações & Governança',
    'diretor', 1, 0
  ),
  (
    4, 'Leandro Neves', 'leandro.neves@jhe.com.br',
    '$2b$10$FVgz1Nb9wt1Qhm/Sg3IY.OJhHHdc1gvNP5VeDy/Vx0rMyhUh61W3e',
    'Diretor de Engenharia e Operações', 'Engenharia Civil e Infraestrutura',
    'diretor', 1, 0
  ),
  (
    5, 'Gestor OIA', 'oia@jhe.com.br',
    '$2b$10$FVgz1Nb9wt1Qhm/Sg3IY.OJhHHdc1gvNP5VeDy/Vx0rMyhUh61W3e',
    'Responsável Técnico OIA', 'Auditoria Acreditada ISO/IEC 17020',
    'coordenador', 1, 0
  ),
  (
    6, 'Coordenação Staff', 'staff@jhe.com.br',
    '$2b$10$FVgz1Nb9wt1Qhm/Sg3IY.OJhHHdc1gvNP5VeDy/Vx0rMyhUh61W3e',
    'Assessoria Estratégica', 'Governança & Conformidade',
    'coordenador', 1, 0
  ),
  (
    7, 'Coordenador Geral', 'projetos@jhe.com.br',
    '$2b$10$FVgz1Nb9wt1Qhm/Sg3IY.OJhHHdc1gvNP5VeDy/Vx0rMyhUh61W3e',
    'Coordenador de Engenharia', 'Gestão de Contratos e Projetos',
    'coordenador', 1, 0
  ),
  (
    8, 'Carlos Almeida', 'carlos.almeida@jhe.com.br',
    '$2b$10$FVgz1Nb9wt1Qhm/Sg3IY.OJhHHdc1gvNP5VeDy/Vx0rMyhUh61W3e',
    'Colaborador Técnico / Especialista BIM', 'Modelagem Estrutural BIM',
    'colaborador', 1, 1
  )
ON DUPLICATE KEY UPDATE
  `nome` = VALUES(`nome`),
  `cargo` = VALUES(`cargo`),
  `cargo_especialidade` = VALUES(`cargo_especialidade`),
  `role_global` = VALUES(`role_global`),
  `ativo` = VALUES(`ativo`),
  `primeiro_acesso` = VALUES(`primeiro_acesso`);

-- 4. Vínculos Estruturais Iniciais (usuario_cargos_nos)
INSERT INTO `usuario_cargos_nos` (`usuario_id`, `no_id`, `tipo_vinculo`, `permissao`) VALUES
  (1, 1, 'titular', 'gestao_completa'),
  (2, 1, 'titular', 'gestao_completa'),
  (3, 1, 'titular', 'gestao_completa'),
  (4, 4, 'titular', 'gestao_completa'),
  (5, 2, 'titular', 'edicao'),
  (6, 3, 'titular', 'edicao'),
  (7, 7, 'titular', 'edicao'),
  (8, 9, 'titular', 'leitura'),
  (8, 10, 'acumulacao', 'leitura')
ON DUPLICATE KEY UPDATE
  `tipo_vinculo` = VALUES(`tipo_vinculo`),
  `permissao` = VALUES(`permissao`);

-- 5. Registro Inicial de Auditoria na Trilha de Governança
INSERT INTO `organograma_logs` (`usuario_id`, `no_id`, `acao`, `detalhes`) VALUES
  (
    1,
    1,
    'AUTENTICACAO',
    JSON_OBJECT(
      'modulo', 'SETUP_BANCO',
      'evento', 'SCHEMA_EXECUTION',
      'mensagem', 'Banco relacional JHE Organograma inicializado com sucesso via script schema_jhe_organograma.sql.'
    )
  );

-- 6. Configurações Globais Iniciais de Aparência e Identidade
INSERT INTO `configuracoes_sistema` (`id`, `titulo_sistema`, `subtitulo_sistema`, `tag_texto`, `tag_ativa`)
VALUES (1, 'Organograma Corporativo', 'JHE Consultores Associados', 'Governança', 1)
ON DUPLICATE KEY UPDATE `id` = `id`;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
SET SQL_MODE = @OLD_SQL_MODE;
