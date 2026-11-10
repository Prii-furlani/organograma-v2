import pool from '../database/database.js';
import { listarLogs } from './logsController.js';

export { listarLogs, listarLogs as listarLogsAuditoria };

const FALLBACK_USUARIOS = [
  {
    id: 1,
    nome: 'Administrador Governança JHE',
    email: 'governanca@jhe.com.br',
    cargo: 'Gestor de Governança Corporativa',
    role_global: 'admin'
  },
  {
    id: 2,
    nome: 'Dr. Hélio (Co-CEO)',
    email: 'diretoria@jhe.com.br',
    cargo: 'Co-CEO Institucional',
    role_global: 'diretor'
  },
  {
    id: 3,
    nome: 'Dr. Viol (Co-CEO)',
    email: 'diretoria.viol@jhe.com.br',
    cargo: 'Co-CEO Institucional',
    role_global: 'diretor'
  },
  {
    id: 4,
    nome: 'Gestor OIA',
    email: 'oia@jhe.com.br',
    cargo: 'Responsável Técnico OIA',
    role_global: 'coordenador'
  },
  {
    id: 5,
    nome: 'Coordenação de Engenharia',
    email: 'engenharia@jhe.com.br',
    cargo: 'Coordenador de Engenharia e Obras',
    role_global: 'coordenador'
  }
];

/**
 * Controller: GET /api/usuarios ou /api/auditoria/usuarios
 * Retorna os usuários habilitados para o dropdown de filtros de auditoria
 */
export async function listarUsuariosAuditoria(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, nome, email, cargo, role_global FROM usuarios WHERE ativo = 1 ORDER BY nome ASC'
    );
    return res.json({
      sucesso: true,
      usuarios: rows
    });
  } catch (error) {
    console.error('[AUDIT] Falha ao listar usuários no MySQL. Usando fallback:', error.message);
    return res.json({
      sucesso: true,
      usuarios: FALLBACK_USUARIOS,
      fonte: 'fallback-memory'
    });
  }
}
