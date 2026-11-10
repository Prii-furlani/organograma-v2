import pool from '../database/database.js';
import { registrarLogAuditoria } from '../utils/auditLogger.js';

const CONFIG_PADRAO = {
  id: 1,
  titulo_sistema: 'Organograma Corporativo',
  subtitulo_sistema: 'JHE Consultores Associados',
  tag_texto: 'Governança',
  tag_ativa: true,
  logo_clara: null,
  logo_escura: null,
  logo_clara_url: null,
  logo_escura_url: null,
  cor_primaria: '#0E284E',
  cor_secundaria: '#0284C7',
  cor_fundo_canvas: '#F8FAFC',
  timeout_ativo: true,
  timeout_inatividade_minutos: 60,
  prevencao_ciclos_ativa: true,
  exigir_troca_senha_primeiro_acesso: true,
  senha_temporaria_padrao: 'JHE@2026'
};

/**
 * Garante que a linha padrão de configurações exista no banco de dados
 */
async function garantirConfiguracoesPadrao() {
  const [rows] = await pool.query('SELECT * FROM configuracoes_sistema WHERE id = 1 LIMIT 1');
  if (rows.length === 0) {
    await pool.query(
      `INSERT INTO configuracoes_sistema 
       (id, titulo_sistema, subtitulo_sistema, tag_texto, tag_ativa, logo_clara_url, logo_escura_url, cor_primaria, cor_secundaria, cor_fundo_canvas, timeout_ativo, timeout_inatividade_minutos, prevencao_ciclos_ativa, exigir_troca_senha_primeiro_acesso, senha_temporaria_padrao)
       VALUES (1, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        CONFIG_PADRAO.titulo_sistema,
        CONFIG_PADRAO.subtitulo_sistema,
        CONFIG_PADRAO.tag_texto,
        CONFIG_PADRAO.tag_ativa ? 1 : 0,
        CONFIG_PADRAO.cor_primaria,
        CONFIG_PADRAO.cor_secundaria,
        CONFIG_PADRAO.cor_fundo_canvas,
        CONFIG_PADRAO.timeout_ativo ? 1 : 0,
        CONFIG_PADRAO.timeout_inatividade_minutos,
        CONFIG_PADRAO.prevencao_ciclos_ativa ? 1 : 0,
        CONFIG_PADRAO.exigir_troca_senha_primeiro_acesso ? 1 : 0,
        CONFIG_PADRAO.senha_temporaria_padrao
      ]
    );
    return { ...CONFIG_PADRAO };
  }

  const row = rows[0];
  return {
    id: row.id,
    titulo_sistema: row.titulo_sistema || CONFIG_PADRAO.titulo_sistema,
    subtitulo_sistema: row.subtitulo_sistema || CONFIG_PADRAO.subtitulo_sistema,
    tag_texto: row.tag_texto !== null && row.tag_texto !== undefined ? row.tag_texto : CONFIG_PADRAO.tag_texto,
    tag_ativa: row.tag_ativa !== null && row.tag_ativa !== undefined ? Boolean(row.tag_ativa) : CONFIG_PADRAO.tag_ativa,
    logo_clara: row.logo_clara_url || null,
    logo_escura: row.logo_escura_url || null,
    logo_clara_url: row.logo_clara_url || null,
    logo_escura_url: row.logo_escura_url || null,
    cor_primaria: row.cor_primaria || CONFIG_PADRAO.cor_primaria,
    cor_secundaria: row.cor_secundaria || CONFIG_PADRAO.cor_secundaria,
    cor_fundo_canvas: row.cor_fundo_canvas || CONFIG_PADRAO.cor_fundo_canvas,
    timeout_ativo: row.timeout_ativo !== null && row.timeout_ativo !== undefined ? Boolean(row.timeout_ativo) : CONFIG_PADRAO.timeout_ativo,
    timeout_inatividade_minutos: Number(row.timeout_inatividade_minutos) || CONFIG_PADRAO.timeout_inatividade_minutos,
    prevencao_ciclos_ativa: row.prevencao_ciclos_ativa !== null && row.prevencao_ciclos_ativa !== undefined ? Boolean(row.prevencao_ciclos_ativa) : CONFIG_PADRAO.prevencao_ciclos_ativa,
    exigir_troca_senha_primeiro_acesso: row.exigir_troca_senha_primeiro_acesso !== null && row.exigir_troca_senha_primeiro_acesso !== undefined ? Boolean(row.exigir_troca_senha_primeiro_acesso) : CONFIG_PADRAO.exigir_troca_senha_primeiro_acesso,
    senha_temporaria_padrao: row.senha_temporaria_padrao || CONFIG_PADRAO.senha_temporaria_padrao,
    atualizado_em: row.atualizado_em
  };
}

/**
 * GET /api/configuracoes/aparencia
 * Retorna as configurações ativas de identidade visual e cabeçalho (público)
 */
export async function obterConfiguracoesAparencia(req, res, next) {
  try {
    const config = await garantirConfiguracoesPadrao();
    res.json({
      sucesso: true,
      configuracoes: config
    });
  } catch (error) {
    console.error('Erro ao buscar configurações de aparência:', error);
    next(error);
  }
}

/**
 * PUT /api/configuracoes/aparencia
 * Atualiza e persiste títulos, tag e logotipos do sistema
 */
export async function atualizarConfiguracoesAparencia(req, res, next) {
  try {
    const configAtual = await garantirConfiguracoesPadrao();

    const {
      titulo_sistema,
      subtitulo_sistema,
      tag_texto,
      tag_ativa,
      logo_clara,
      logo_escura,
      logo_clara_url,
      logo_escura_url,
      cor_primaria,
      cor_secundaria,
      cor_fundo_canvas,
      timeout_ativo,
      timeout_inatividade_minutos,
      prevencao_ciclos_ativa,
      exigir_troca_senha_primeiro_acesso,
      senha_temporaria_padrao
    } = req.body;

    // Normalização dos valores enviados
    const novoTitulo = typeof titulo_sistema === 'string' && titulo_sistema.trim() !== '' ? titulo_sistema.trim() : configAtual.titulo_sistema;
    const novoSubtitulo = typeof subtitulo_sistema === 'string' && subtitulo_sistema.trim() !== '' ? subtitulo_sistema.trim() : configAtual.subtitulo_sistema;
    const novaTagTexto = typeof tag_texto === 'string' ? tag_texto.trim() : (tag_texto !== undefined && tag_texto !== null ? String(tag_texto).trim() : configAtual.tag_texto);
    const novaTagAtiva = tag_ativa !== undefined ? (tag_ativa === true || tag_ativa === 1 || tag_ativa === '1') : configAtual.tag_ativa;

    // Suporte tanto para logo_clara quanto logo_clara_url (string base64 ou url)
    const novaLogoClara = logo_clara !== undefined ? logo_clara : (logo_clara_url !== undefined ? logo_clara_url : configAtual.logo_clara);
    const novaLogoEscura = logo_escura !== undefined ? logo_escura : (logo_escura_url !== undefined ? logo_escura_url : configAtual.logo_escura);

    const novaCorPrimaria = typeof cor_primaria === 'string' && cor_primaria.startsWith('#') ? cor_primaria.trim() : configAtual.cor_primaria;
    const novaCorSecundaria = typeof cor_secundaria === 'string' && cor_secundaria.startsWith('#') ? cor_secundaria.trim() : configAtual.cor_secundaria;
    const novaCorFundoCanvas = typeof cor_fundo_canvas === 'string' && cor_fundo_canvas.startsWith('#') ? cor_fundo_canvas.trim() : configAtual.cor_fundo_canvas;

    // Políticas de Governança e Regras Corporativas
    const novoTimeoutAtivo = timeout_ativo !== undefined ? (timeout_ativo === true || timeout_ativo === 1 || timeout_ativo === '1') : configAtual.timeout_ativo;
    const novoTimeoutMinutos = timeout_inatividade_minutos !== undefined ? Number(timeout_inatividade_minutos) : configAtual.timeout_inatividade_minutos;
    const novaPrevencaoCiclos = prevencao_ciclos_ativa !== undefined ? (prevencao_ciclos_ativa === true || prevencao_ciclos_ativa === 1 || prevencao_ciclos_ativa === '1') : configAtual.prevencao_ciclos_ativa;
    const novaExigirTrocaSenha = exigir_troca_senha_primeiro_acesso !== undefined ? (exigir_troca_senha_primeiro_acesso === true || exigir_troca_senha_primeiro_acesso === 1 || exigir_troca_senha_primeiro_acesso === '1') : configAtual.exigir_troca_senha_primeiro_acesso;
    const novaSenhaTemporaria = typeof senha_temporaria_padrao === 'string' && senha_temporaria_padrao.trim() !== '' ? senha_temporaria_padrao.trim() : configAtual.senha_temporaria_padrao;

    // Upsert na tabela configuracoes_sistema ID 1
    const query = `
      INSERT INTO configuracoes_sistema 
        (id, titulo_sistema, subtitulo_sistema, tag_texto, tag_ativa, logo_clara_url, logo_escura_url, cor_primaria, cor_secundaria, cor_fundo_canvas, timeout_ativo, timeout_inatividade_minutos, prevencao_ciclos_ativa, exigir_troca_senha_primeiro_acesso, senha_temporaria_padrao)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        titulo_sistema = VALUES(titulo_sistema),
        subtitulo_sistema = VALUES(subtitulo_sistema),
        tag_texto = VALUES(tag_texto),
        tag_ativa = VALUES(tag_ativa),
        logo_clara_url = VALUES(logo_clara_url),
        logo_escura_url = VALUES(logo_escura_url),
        cor_primaria = VALUES(cor_primaria),
        cor_secundaria = VALUES(cor_secundaria),
        cor_fundo_canvas = VALUES(cor_fundo_canvas),
        timeout_ativo = VALUES(timeout_ativo),
        timeout_inatividade_minutos = VALUES(timeout_inatividade_minutos),
        prevencao_ciclos_ativa = VALUES(prevencao_ciclos_ativa),
        exigir_troca_senha_primeiro_acesso = VALUES(exigir_troca_senha_primeiro_acesso),
        senha_temporaria_padrao = VALUES(senha_temporaria_padrao)
    `;

    await pool.query(query, [
      novoTitulo,
      novoSubtitulo,
      novaTagTexto,
      novaTagAtiva ? 1 : 0,
      novaLogoClara,
      novaLogoEscura,
      novaCorPrimaria,
      novaCorSecundaria,
      novaCorFundoCanvas,
      novoTimeoutAtivo ? 1 : 0,
      novoTimeoutMinutos,
      novaPrevencaoCiclos ? 1 : 0,
      novaExigirTrocaSenha ? 1 : 0,
      novaSenhaTemporaria
    ]);

    // Registro na trilha de auditoria corporativa
    try {
      await registrarLogAuditoria({
        usuarioId: req.user?.id || 1,
        acao: 'EDICAO',
        noId: null,
        detalhes: {
          entidade: 'configuracoes_sistema',
          chave: 'politicas_governanca_aparencia',
          alteracoes: {
            titulo_sistema: novoTitulo,
            tag_texto: novaTagTexto,
            tag_ativa: novaTagAtiva,
            timeout_ativo: novoTimeoutAtivo,
            timeout_inatividade_minutos: novoTimeoutMinutos,
            prevencao_ciclos_ativa: novaPrevencaoCiclos,
            exigir_troca_senha_primeiro_acesso: novaExigirTrocaSenha,
            senha_temporaria_padrao: novaSenhaTemporaria ? '***' : null
          }
        }
      });
    } catch (auditErr) {
      console.warn('Aviso: falha não-bloqueante ao registrar log de auditoria de configurações:', auditErr.message);
    }

    const configAtualizada = {
      id: 1,
      titulo_sistema: novoTitulo,
      subtitulo_sistema: novoSubtitulo,
      tag_texto: novaTagTexto,
      tag_ativa: novaTagAtiva,
      logo_clara: novaLogoClara,
      logo_escura: novaLogoEscura,
      logo_clara_url: novaLogoClara,
      logo_escura_url: novaLogoEscura,
      cor_primaria: novaCorPrimaria,
      cor_secundaria: novaCorSecundaria,
      cor_fundo_canvas: novaCorFundoCanvas,
      timeout_ativo: novoTimeoutAtivo,
      timeout_inatividade_minutos: novoTimeoutMinutos,
      prevencao_ciclos_ativa: novaPrevencaoCiclos,
      exigir_troca_senha_primeiro_acesso: novaExigirTrocaSenha,
      senha_temporaria_padrao: novaSenhaTemporaria,
      atualizado_em: new Date().toISOString()
    };

    res.json({
      sucesso: true,
      mensagem: 'Configurações atualizadas com sucesso.',
      configuracoes: configAtualizada
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    next(error);
  }
}

export const obterConfiguracoesGovernanca = obterConfiguracoesAparencia;
export const atualizarConfiguracoesGovernanca = atualizarConfiguracoesAparencia;
