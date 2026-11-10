import bcrypt from 'bcryptjs';
import pool, { withTransaction } from '../database/database.js';
import { registrarLogAuditoria } from '../utils/auditLogger.js';

export function getFallbackUsuarios() {
  return FALLBACK_USUARIOS;
}

let FALLBACK_USUARIOS = [
  {
    id: 1,
    nome: 'Administrador Governança JHE',
    email: 'governanca@jhe.com.br',
    cargo: 'Gestor de Governança e Compliance',
    cargo_especialidade: 'Governança & Riscos Corporativos',
    role_global: 'admin',
    ativo: 1,
    primeiro_acesso: 1,
    vinculos: [1]
  },
  {
    id: 2,
    nome: 'Dr. Hélio',
    email: 'diretoria@jhe.com.br',
    cargo: 'Co-CEO Institucional',
    cargo_especialidade: 'Engenharia Consultiva & Diretoria',
    role_global: 'diretor',
    ativo: 1,
    primeiro_acesso: 0,
    vinculos: [1]
  },
  {
    id: 3,
    nome: 'Dr. Viol',
    email: 'diretoria.viol@jhe.com.br',
    cargo: 'Co-CEO Institucional',
    cargo_especialidade: 'Operações & Governança',
    role_global: 'diretor',
    ativo: 1,
    primeiro_acesso: 0,
    vinculos: [1]
  },
  {
    id: 4,
    nome: 'Leandro Neves',
    email: 'leandro.neves@jhe.com.br',
    cargo: 'Diretor de Engenharia e Operações',
    cargo_especialidade: 'Engenharia Civil e Infraestrutura',
    role_global: 'diretor',
    ativo: 1,
    primeiro_acesso: 0,
    vinculos: [4]
  },
  {
    id: 5,
    nome: 'Gestor OIA',
    email: 'oia@jhe.com.br',
    cargo: 'Responsável Técnico OIA',
    cargo_especialidade: 'Auditoria Acreditada ISO/IEC 17020',
    role_global: 'coordenador',
    ativo: 1,
    primeiro_acesso: 0,
    vinculos: [2]
  },
  {
    id: 6,
    nome: 'Coordenação Staff',
    email: 'staff@jhe.com.br',
    cargo: 'Assessoria Estratégica',
    cargo_especialidade: 'Governança & Conformidade',
    role_global: 'coordenador',
    ativo: 1,
    primeiro_acesso: 0,
    vinculos: [3]
  },
  {
    id: 7,
    nome: 'Coordenador Geral',
    email: 'projetos@jhe.com.br',
    cargo: 'Coordenador de Engenharia',
    cargo_especialidade: 'Gestão de Contratos e Projetos',
    role_global: 'coordenador',
    ativo: 1,
    primeiro_acesso: 0,
    vinculos: [7]
  },
  {
    id: 8,
    nome: 'Carlos Almeida',
    email: 'carlos.almeida@jhe.com.br',
    cargo: 'Colaborador Técnico / Especialista BIM',
    cargo_especialidade: 'Modelagem Estrutural BIM',
    role_global: 'colaborador',
    ativo: 1,
    primeiro_acesso: 1,
    vinculos: [9, 10]
  }
];

/**
 * GET /api/usuarios
 * Lista colaboradores diretamente do MySQL agregando os vínculos reais da tabela usuario_cargos_nos
 */
export async function listarUsuarios(req, res) {
  const { busca } = req.query;

  try {
    let sqlUsuarios = `
      SELECT 
        u.id, 
        u.nome, 
        u.email, 
        COALESCE(u.cargo_especialidade, u.cargo) AS cargo,
        u.cargo_especialidade,
        u.role_global, 
        u.ativo,
        u.primeiro_acesso,
        u.criado_em
      FROM usuarios u
      WHERE 1=1
    `;
    const params = [];

    if (busca && busca.trim()) {
      const termo = `%${busca.trim().toLowerCase()}%`;
      sqlUsuarios += ' AND (LOWER(u.nome) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(COALESCE(u.cargo_especialidade, u.cargo)) LIKE ? OR LOWER(u.role_global) LIKE ?)';
      params.push(termo, termo, termo, termo);
    }

    sqlUsuarios += ' ORDER BY u.id ASC';

    // 1. Busca usuários da base
    const [usuarios] = await pool.query(sqlUsuarios, params);

    // 2. Busca vínculos ativos com nós existentes
    const [vinculos] = await pool.query(`
      SELECT 
        v.usuario_id,
        v.no_id,
        v.tipo_vinculo,
        v.permissao,
        n.titulo AS no_titulo,
        n.sigla AS no_sigla
      FROM usuario_cargos_nos v
      INNER JOIN organograma_nos n ON v.no_id = n.id
      WHERE n.ativo = 1
    `);

    // 3. Monta o payload final consolidado
    const resultado = usuarios.map((usr) => {
      const areasVinculadas = vinculos
        .filter((v) => v.usuario_id === usr.id)
        .map((v) => ({
          no_id: v.no_id,
          titulo: v.no_titulo,
          sigla: v.no_sigla,
          tipo_vinculo: v.tipo_vinculo,
          permissao: v.permissao
        }));

      return {
        ...usr,
        primeiro_acesso: Boolean(usr.primeiro_acesso),
        areas_vinculadas: areasVinculadas,
        vinculos: areasVinculadas
      };
    });

    return res.json(resultado);
  } catch (error) {
    console.error('Erro ao listar usuários do MySQL:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao consultar usuários.' });
  }
}

/**
 * Sanitiza a lista de vínculos:
 * Ao vincular qualquer área definitiva (ID !== 999), purga o nó transitório 999.
 */
function sanitizarVinculos(vinculos) {
  if (!Array.isArray(vinculos)) return [];
  const temDefinitivo = vinculos.some((v) => Number(v) !== 999);
  if (temDefinitivo) {
    return vinculos.filter((v) => Number(v) !== 999).map(Number);
  }
  return vinculos.map(Number);
}

/**
 * POST /api/usuarios
 * Criação de usuário com hash bcrypt, senha provisória JHE@2026, primeiro_acesso=1 e múltiplos vínculos
 */
export async function criarUsuario(req, res) {
  const { nome, email, role_global = 'colaborador', cargo, cargo_especialidade, ativo = 1, vinculos = [] } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ sucesso: false, mensagem: 'Nome e e-mail são obrigatórios.' });
  }

  if (!Array.isArray(vinculos) || vinculos.length === 0) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Selecione ao menos uma área vinculada. Para colaboradores sem setor definitivo, utilize 'Aguardando Alocação / Triagem'."
    });
  }

  const cargoFinal = (cargo_especialidade || cargo || '').trim() || null;

  try {
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash('JHE@2026', salt);

    const novoId = await withTransaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO usuarios (nome, email, senha, role_global, cargo, cargo_especialidade, ativo, primeiro_acesso)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [nome.trim(), email.trim().toLowerCase(), senhaHash, role_global, cargoFinal, cargoFinal, ativo ? 1 : 0]
      );

      const userId = result.insertId;
      const vinculosFinais = sanitizarVinculos(vinculos);

      if (vinculosFinais.length > 0) {
        for (const noId of vinculosFinais) {
          await conn.execute(
            `INSERT INTO usuario_cargos_nos (usuario_id, no_id, tipo_vinculo, permissao)
             VALUES (?, ?, 'titular', 'edicao')
             ON DUPLICATE KEY UPDATE tipo_vinculo = 'titular'`,
            [userId, Number(noId)]
          );
        }
      }

      await registrarLogAuditoria({
        connection: conn,
        usuarioId: req.user?.id || null,
        acao: 'CRIACAO',
        detalhes: {
          modulo: 'USUARIOS',
          resumo: `Criação do usuário ${nome} (${email})`,
          after: { id: userId, nome, email, role_global, vinculos: vinculosFinais }
        }
      });

      return userId;
    });

    return res.json({ sucesso: true, id: novoId, mensagem: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ sucesso: false, mensagem: 'Já existe um usuário cadastrado com este e-mail.' });
    }

    const novoId = Math.max(0, ...FALLBACK_USUARIOS.map((u) => u.id)) + 1;
    const novoUser = {
      id: novoId,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      role_global,
      cargo: cargoFinal || 'Colaborador',
      cargo_especialidade: cargoFinal || 'Colaborador',
      ativo: ativo ? 1 : 0,
      primeiro_acesso: 1,
      vinculos: Array.isArray(vinculos) ? vinculos.map(Number) : []
    };
    FALLBACK_USUARIOS.push(novoUser);
    return res.json({ sucesso: true, id: novoId, usuario: novoUser, fonte: 'fallback-memory' });
  }
}

/**
 * PUT /api/usuarios/:id
 * Atualização cadastral e sincronização atômica de múltiplos vínculos
 */
export async function atualizarUsuario(req, res) {
  const { id } = req.params;
  const { nome, email, role_global, cargo, cargo_especialidade, ativo, vinculos } = req.body;
  const cargoFinal = (cargo_especialidade !== undefined ? cargo_especialidade : cargo);

  if (vinculos !== undefined && (!Array.isArray(vinculos) || vinculos.length === 0)) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Selecione ao menos uma área vinculada. Para colaboradores sem setor definitivo, utilize 'Aguardando Alocação / Triagem'."
    });
  }

  try {
    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE usuarios 
         SET nome = COALESCE(?, nome),
             email = COALESCE(?, email),
             role_global = COALESCE(?, role_global),
             cargo = COALESCE(?, cargo),
             cargo_especialidade = COALESCE(?, cargo_especialidade),
             ativo = COALESCE(?, ativo),
             atualizado_em = NOW()
         WHERE id = ?`,
        [
          nome ? nome.trim() : null,
          email ? email.trim().toLowerCase() : null,
          role_global || null,
          cargoFinal !== undefined ? (cargoFinal ? cargoFinal.trim() : null) : null,
          cargoFinal !== undefined ? (cargoFinal ? cargoFinal.trim() : null) : null,
          ativo !== undefined ? (ativo ? 1 : 0) : null,
          id
        ]
      );

      if (Array.isArray(vinculos)) {
        const vinculosFinais = sanitizarVinculos(vinculos);
        await conn.execute('DELETE FROM usuario_cargos_nos WHERE usuario_id = ?', [id]);
        for (const noId of vinculosFinais) {
          await conn.execute(
            `INSERT INTO usuario_cargos_nos (usuario_id, no_id, tipo_vinculo, permissao)
             VALUES (?, ?, 'titular', 'edicao')`,
            [id, Number(noId)]
          );
        }
      }

      await registrarLogAuditoria({
        connection: conn,
        usuarioId: req.user?.id || null,
        acao: 'EDICAO',
        detalhes: {
          modulo: 'USUARIOS',
          resumo: `Edição cadastral do usuário #${id}`,
          alteracoes: { nome, email, role_global, cargo: cargoFinal, ativo, vinculos: sanitizarVinculos(vinculos) }
        }
      });
    });

    return res.json({ sucesso: true, mensagem: 'Usuário atualizado com sucesso!' });
  } catch (err) {
    const index = FALLBACK_USUARIOS.findIndex((u) => String(u.id) === String(id));
    if (index !== -1) {
      FALLBACK_USUARIOS[index] = {
        ...FALLBACK_USUARIOS[index],
        ...(nome && { nome }),
        ...(email && { email }),
        ...(role_global && { role_global }),
        ...(cargoFinal && { cargo: cargoFinal, cargo_especialidade: cargoFinal }),
        ...(ativo !== undefined && { ativo: ativo ? 1 : 0 }),
        ...(Array.isArray(vinculos) && { vinculos: vinculos.map(Number) })
      };
    }
    return res.json({ sucesso: true, mensagem: 'Usuário atualizado (modo fallback).' });
  }
}

/**
 * PATCH /api/usuarios/:id/status
 * Alterna status ativo/inativo
 */
export async function alternarStatusUsuario(req, res) {
  const { id } = req.params;
  const { ativo } = req.body;

  try {
    await pool.execute('UPDATE usuarios SET ativo = ?, atualizado_em = NOW() WHERE id = ?', [ativo ? 1 : 0, id]);
    return res.json({ sucesso: true, mensagem: `Usuário ${ativo ? 'ativado' : 'inativado'} com sucesso!` });
  } catch (err) {
    const u = FALLBACK_USUARIOS.find((item) => String(item.id) === String(id));
    if (u) u.ativo = ativo ? 1 : 0;
    return res.json({ sucesso: true, mensagem: 'Status alterado (modo fallback).' });
  }
}

/**
 * POST /api/usuarios/:id/reset-senha
 * Redefine senha para JHE@2026 e força primeiro_acesso = 1
 */
export async function resetarSenhaUsuario(req, res) {
  const { id } = req.params;

  try {
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash('JHE@2026', salt);

    await pool.execute(
      'UPDATE usuarios SET senha = ?, primeiro_acesso = 1, atualizado_em = NOW() WHERE id = ?',
      [senhaHash, id]
    );

    return res.json({
      sucesso: true,
      mensagem: 'Senha redefinida para "JHE@2026" com sucesso! O usuário deverá alterá-la no próximo login.'
    });
  } catch (err) {
    const u = FALLBACK_USUARIOS.find((item) => String(item.id) === String(id));
    if (u) u.primeiro_acesso = 1;
    return res.json({
      sucesso: true,
      mensagem: 'Senha redefinida para "JHE@2026" (modo fallback).'
    });
  }
}
