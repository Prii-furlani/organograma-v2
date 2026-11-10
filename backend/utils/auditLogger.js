import pool from '../database/database.js';

/**
 * Registra evento de auditoria na tabela `organograma_logs`
 * Ações válidas: 'CRIACAO' | 'EDICAO' | 'MOVIMENTACAO' | 'EXCLUSAO'
 */
export async function registrarLogAuditoria({
  connection = null,
  usuarioId = null,
  acao,
  noId = null,
  detalhes = {}
}) {
  const executor = connection || pool;
  const query = `
    INSERT INTO organograma_logs (usuario_id, acao, no_id, detalhes)
    VALUES (?, ?, ?, ?)
  `;
  await executor.execute(query, [
    usuarioId,
    acao,
    noId,
    JSON.stringify(detalhes)
  ]);
}
