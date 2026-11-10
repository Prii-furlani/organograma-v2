import pool from '../database/database.js';

/**
 * Controller robusto para consulta e auditoria de logs da governança.
 * Trata junções externas (LEFT JOIN) para preservar eventos globais (no_id = NULL),
 * limites de data fim no padrão 23:59:59 e inferência de módulos e entidades.
 */
export async function listarLogs(req, res) {
  const {
    usuario_id,
    data_inicio,
    data_fim,
    acao,
    modulo,
    termo_busca,
    busca,
    limite = 100
  } = req.query;

  try {
    let sql = `
      SELECT 
        l.id,
        l.usuario_id,
        l.no_id,
        l.acao,
        l.detalhes,
        l.data_hora,
        u.nome AS usuario_nome,
        u.email AS usuario_email,
        u.cargo AS usuario_cargo,
        u.role_global,
        n.titulo AS no_titulo
      FROM organograma_logs l
      LEFT JOIN usuarios u ON l.usuario_id = u.id
      LEFT JOIN organograma_nos n ON l.no_id = n.id
      WHERE 1=1
    `;
    const params = [];

    // 1. Filtro de Usuário
    if (usuario_id) {
      sql += ' AND l.usuario_id = ?';
      params.push(Number(usuario_id));
    }

    // 2. Filtro de Ação
    if (acao && acao !== 'TODAS') {
      sql += ' AND l.acao = ?';
      params.push(acao);
    }

    // 3. Filtros de Datas (incluindo o fim do dia até 23:59:59)
    if (data_inicio) {
      sql += ' AND l.data_hora >= ?';
      params.push(`${data_inicio} 00:00:00`);
    }
    if (data_fim) {
      sql += ' AND l.data_hora <= ?';
      params.push(`${data_fim} 23:59:59`);
    }

    // 4. Busca Textual Ampla
    const queryBusca = termo_busca || busca;
    if (queryBusca && queryBusca.trim()) {
      const termo = `%${queryBusca.trim()}%`;
      sql += ` AND (
        l.detalhes LIKE ? OR
        u.nome LIKE ? OR
        u.email LIKE ? OR
        n.titulo LIKE ? OR
        l.acao LIKE ?
      )`;
      params.push(termo, termo, termo, termo, termo);
    }

    const safeLimit = Math.min(Math.max(Number(limite) || 100, 1), 1000);
    sql += ' ORDER BY l.data_hora DESC LIMIT ?';
    params.push(safeLimit);

    const [rows] = await pool.query(sql, params);

    // Mapeamento e fallback para logs com no_id = NULL (como configuracoes_sistema ou usuarios)
    const logsFormatados = rows.map((log) => {
      let detalhesObj = log.detalhes;
      if (typeof detalhesObj === 'string') {
        try {
          detalhesObj = JSON.parse(detalhesObj);
        } catch {
          detalhesObj = { resumo: log.detalhes };
        }
      }

      // Inferir Entidade Afetada
      let entidade = log.no_titulo;
      if (!entidade) {
        if (detalhesObj?.entidade === 'configuracoes_sistema') {
          entidade = 'Configurações do Sistema';
        } else if (detalhesObj?.modulo === 'Aparência & Identidade') {
          entidade = 'Identidade Visual & Cores';
        } else if (detalhesObj?.entidade) {
          entidade = detalhesObj.entidade;
        } else if (detalhesObj?.titulo) {
          entidade = detalhesObj.titulo;
        } else if (detalhesObj?.after?.titulo) {
          entidade = detalhesObj.after.titulo;
        } else if (detalhesObj?.before?.titulo) {
          entidade = detalhesObj.before.titulo;
        } else if (detalhesObj?.resumo) {
          const match = detalhesObj.resumo.match(/"([^"]+)"/);
          if (match) {
            entidade = match[1];
          } else {
            entidade = detalhesObj.resumo.slice(0, 50);
          }
        } else if (log.no_id) {
          entidade = `Nó #${log.no_id}`;
        } else {
          entidade = 'Sistema / Governança';
        }
      }

      // Inferir Módulo
      let moduloInferido = detalhesObj?.modulo;
      if (!moduloInferido) {
        if (detalhesObj?.entidade === 'configuracoes_sistema') {
          moduloInferido = 'Aparência & Regras';
        } else if (log.acao === 'AUTENTICACAO') {
          moduloInferido = 'Autenticação';
        } else if (detalhesObj?.entidade === 'usuarios' || detalhesObj?.tipo === 'usuario') {
          moduloInferido = 'Gestão de Usuários';
        } else if (log.no_id || detalhesObj?.before?.parent_id || detalhesObj?.after?.parent_id) {
          moduloInferido = 'Canvas Organograma';
        } else {
          moduloInferido = 'Governança';
        }
      }

      // Assegurar diff legível se detalhes conter alteracoes de configuracoes_sistema
      if (detalhesObj?.alteracoes && !detalhesObj?.diff) {
        detalhesObj.diff = {};
        for (const [k, v] of Object.entries(detalhesObj.alteracoes)) {
          detalhesObj.diff[k] = { de: 'Anterior', para: String(v) };
        }
      }

      // Assegurar resumo descritivo caso ausente
      if (!detalhesObj?.resumo) {
        if (detalhesObj?.entidade === 'configuracoes_sistema') {
          detalhesObj.resumo = 'Atualização de políticas de governança e identidade visual';
        } else if (log.acao === 'EDICAO') {
          detalhesObj.resumo = `Edição em ${entidade}`;
        } else if (log.acao === 'CRIACAO') {
          detalhesObj.resumo = `Criação de ${entidade}`;
        } else if (log.acao === 'MOVIMENTACAO') {
          detalhesObj.resumo = `Movimentação estrutural de ${entidade}`;
        } else if (log.acao === 'EXCLUSAO') {
          detalhesObj.resumo = `Exclusão de ${entidade}`;
        }
      }

      return {
        ...log,
        created_at: log.data_hora,
        entidade_afetada: entidade,
        entidade_titulo: entidade,
        modulo: moduloInferido,
        detalhes: detalhesObj || {}
      };
    });

    // Se houver filtro por módulo, aplicamos pós-inferência
    const logsFiltradosPorModulo =
      modulo && modulo !== 'TODOS'
        ? logsFormatados.filter(
            (l) => l.modulo?.toLowerCase() === modulo.toLowerCase()
          )
        : logsFormatados;

    return res.json({
      sucesso: true,
      total: logsFiltradosPorModulo.length,
      dados: logsFiltradosPorModulo,
      logs: logsFiltradosPorModulo
    });
  } catch (error) {
    console.error('[AUDIT] Erro crítico ao listar logs no MySQL:', error);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao consultar logs de auditoria'
    });
  }
}

export const listarLogsAuditoria = listarLogs;
