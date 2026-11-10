/**
 * ============================================================================
 * JHE ORGANOGRAMA CORPORATIVO - SCRIPT DE CARGA INCREMENTAL DE COLABORADORES
 * ----------------------------------------------------------------------------
 * Arquivo: carga_incremental_colaboradores.js
 * Módulo: Engenharia de Dados / Carga em Lote / Sincronização de Pessoal
 * Função Principal: Executa a carga idempotente de colaboradores no TiDB Cloud,
 * prevenindo duplicidade de registros, priorizando e-mail corporativo, vinculando
 * cargos/setores correspondentes e alocando não identificados no nó de triagem (999).
 *
 * ----------------------------------------------------------------------------
 * GUIA RÁPIDO DE MANUTENÇÃO (ONDE EDITAR SE...):
 * • Alterar senha inicial padrão dos novos usuários: Linha ~35 (SENHA_PADRAO)
 * • Definir nó da área de triagem transitória: Linha ~37 (NO_TRIAGEM_ID)
 * • Regras de higienização de e-mails corporativos/pessoais: Linhas ~45-90 (cleanEmail)
 * • Algoritmo de desduplicação e regras de SKIP: Linhas ~220-270
 * • Leitura e parse dos dados brutos (CSV/JSON/SQL): Linhas ~140-200
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool from '../database/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SENHA_PADRAO = 'JHE@2026';
const SALT_ROUNDS = 10;
const NO_TRIAGEM_ID = 999; // Nó "Aguardando Alocação / Triagem"

/**
 * Higieniza strings de e-mail removendo links markdown, tags e caracteres espúrios
 */
function cleanEmail(s) {
  if (!s) return '';
  let val = s.trim();
  if (val === '-' || val === '--' || val === '---' || val === '- -') return '';
  
  // Extrai e-mail de link markdown [email](mailto:email)
  const mailtoMatch = val.match(/mailto:([^\s\)\'\"]+)/i);
  if (mailtoMatch) {
    val = mailtoMatch[1];
  } else {
    const emailMatch = val.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      val = emailMatch[1];
    }
  }

  val = val.replace(/[\'\<\>\[\]]/g, '').trim().toLowerCase();
  val = val.replace(/\.+$/, ''); // Remove pontos finais residuais

  // Correção específica para domínios sem arroba (ex: caio.twsconsulting.com.br)
  if (!val.includes('@') && val.includes('.com')) {
    val = val.replace(/^([a-z0-9_-]+)\.([a-z0-9_-]+\.com.*)$/i, '$1@$2');
  }

  return val;
}

/**
 * Normaliza o nome para comparação (remove acentos, caixa baixa, espaços múltiplos)
 */
function normalizeName(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifica se a linha lida é um e-mail ou marcador de ausência (-)
 */
function isEmailOrDash(s) {
  if (!s) return true;
  const str = s.trim();
  if (str === '-' || str === '--' || str === '---' || str === '- -') return true;
  if (str.includes('@') || str.includes('mailto:')) return true;
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+/.test(str)) return true;
  if (/\.(com|br|net|org|adv|edu)/i.test(str) && !str.includes(' ')) return true;
  return false;
}

/**
 * Realiza o parsing dos dados brutos da planilha institucional
 */
function extrairDadosBrutosPlanilha() {
  const promptPath = path.resolve(__dirname, 'temp_user_prompt.txt');
  if (!fs.existsSync(promptPath)) {
    throw new Error(`Arquivo de dados brutos não localizado em ${promptPath}`);
  }

  const txt = fs.readFileSync(promptPath, 'utf8');
  const lines = txt.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => l.includes('Abilio Marum Tabet Filho'));
  const endIdx = lines.findIndex((l) => l.includes('</USER_REQUEST>'));
  
  if (startIdx === -1) {
    throw new Error('Marcador inicial da lista de colaboradores não encontrado.');
  }

  const rawList = lines
    .slice(startIdx, endIdx !== -1 ? endIdx : undefined)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const people = [];
  let currentPerson = null;

  for (let i = 0; i < rawList.length; i++) {
    const line = rawList[i];
    if (isEmailOrDash(line)) {
      if (currentPerson) {
        currentPerson.rawLines.push(line);
      }
    } else {
      currentPerson = {
        name: line.replace(/\s+/g, ' ').trim(),
        rawLines: []
      };
      people.push(currentPerson);
    }
  }

  return people;
}

/**
 * Rotina Principal de Carga Incremental Idempotente
 */
export async function executarCargaIncremental() {
  console.log('='.repeat(80));
  console.log(' INICIANDO CARGA INCREMENTAL DE COLABORADORES — JHE ORGANOGRAMA');
  console.log(' Destino: Banco TiDB Cloud (AWS sa-east-1) - Schema: jhe_organograma');
  console.log('='.repeat(80));

  const people = extrairDadosBrutosPlanilha();
  const totalLidos = people.length;
  console.log(`[PARSER] ${totalLidos} registros de colaboradores extraídos da planilha.`);

  // 1. Busca usuários atuais no banco para deduplicação absoluta
  const [existingUsers] = await pool.query(
    'SELECT id, nome, email, cargo, role_global, ativo FROM usuarios'
  );
  console.log(`[BANCO] ${existingUsers.length} usuários já cadastrados na base de dados.`);

  const existingEmails = new Map();
  const existingNames = new Map();

  for (const u of existingUsers) {
    if (u.email) {
      existingEmails.set(u.email.toLowerCase().trim(), u);
    }
    if (u.nome) {
      existingNames.set(normalizeName(u.nome), u);
    }
  }

  // 2. Classificação, Priorização de E-mail e Deduplicação
  const processedInBatchEmails = new Set();
  const processedInBatchNames = new Set();

  let jaExistentesNoBanco = 0;
  let duplicadosNoLote = 0;
  let novosCorporativos = 0;
  let novosPessoais = 0;
  let novosPlaceholders = 0;
  let semSetorIdentificado = 0;

  const toInsert = [];
  const logIgnorados = [];

  for (const p of people) {
    let emailPessoal = '';
    let emailCorporativo = '';

    if (p.rawLines.length === 2) {
      emailPessoal = cleanEmail(p.rawLines[0]);
      emailCorporativo = cleanEmail(p.rawLines[1]);
    } else if (p.rawLines.length === 1) {
      const e = cleanEmail(p.rawLines[0]);
      if (
        e.includes('@jhe.com.br') ||
        e.includes('@jhe-etes.com.br') ||
        e.includes('@cespfde.com.br') ||
        e.includes('@habsocial.com.br') ||
        e.includes('@consorciohabinova.com.br') ||
        e.includes('@cvm2.com.br') ||
        e.includes('@aclsorocaba.com.br')
      ) {
        emailCorporativo = e;
      } else {
        emailPessoal = e;
      }
    } else if (p.rawLines.length > 2) {
      for (const r of p.rawLines) {
        const e = cleanEmail(r);
        if (e.includes('@jhe.com.br')) {
          emailCorporativo = e;
        } else if (!emailPessoal && e) {
          emailPessoal = e;
        }
      }
    }

    // Regra de Priorização: Corporativo > Pessoal (Fallback) > Placeholder
    let finalEmail = '';
    let tipoEmail = '';

    if (emailCorporativo) {
      finalEmail = emailCorporativo;
      tipoEmail = 'corporativo';
    } else if (emailPessoal) {
      finalEmail = emailPessoal;
      tipoEmail = 'pessoal_fallback';
    } else {
      const slugName = p.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.|\.$/g, '');
      finalEmail = `${slugName}@sem-email.jhe.com.br`;
      tipoEmail = 'placeholder';
    }

    const normName = normalizeName(p.name);

    // Validação de Duplicidade contra a base atual
    const matchEmail = (finalEmail && existingEmails.get(finalEmail)) ||
                       (emailCorporativo && existingEmails.get(emailCorporativo)) ||
                       (emailPessoal && existingEmails.get(emailPessoal));
    const matchNome = existingNames.get(normName);

    if (matchEmail || matchNome) {
      jaExistentesNoBanco++;
      const match = matchEmail || matchNome;
      logIgnorados.push({
        nome: p.name,
        motivo: `Já cadastrado no banco (ID ${match.id} - ${match.nome} <${match.email}>)`
      });
      continue;
    }

    // Validação de Duplicidade interna dentro da própria planilha
    if (processedInBatchEmails.has(finalEmail) || processedInBatchNames.has(normName)) {
      duplicadosNoLote++;
      logIgnorados.push({
        nome: p.name,
        motivo: `Duplicado no lote da planilha (<${finalEmail}>)`
      });
      continue;
    }

    // Registra nos conjuntos de controle de lote
    processedInBatchEmails.add(finalEmail);
    processedInBatchNames.add(normName);

    if (tipoEmail === 'corporativo') novosCorporativos++;
    else if (tipoEmail === 'pessoal_fallback') novosPessoais++;
    else novosPlaceholders++;

    // A planilha não dispõe de coluna explícita de setor; vincula ao nó #999 Triagem
    semSetorIdentificado++;

    toInsert.push({
      nome: p.name,
      email: finalEmail,
      tipoEmail
    });
  }

  console.log(`[DEDUP] Análise concluída: ${toInsert.length} novos usuários aptos para inserção.`);
  console.log(`[DEDUP] Registros ignorados: ${jaExistentesNoBanco} existentes + ${duplicadosNoLote} duplicados internos.`);

  if (toInsert.length === 0) {
    console.log('[AVISO] Nenhum novo usuário a ser inserido. Base de dados já sincronizada.');
    imprimirResumo({
      totalLidos,
      jaExistentesNoBanco,
      duplicadosNoLote,
      novosCorporativos,
      novosPessoais,
      novosPlaceholders,
      semSetorIdentificado
    });
    return;
  }

  // 3. Geração do hash de senha provisória criptografada
  console.log(`[AUTH] Gerando hash Bcrypt (SALT=${SALT_ROUNDS}) para senha provisória padrão "${SENHA_PADRAO}"...`);
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, SALT_ROUNDS);

  // 4. Execução Atômica da Transação no Banco
  const connection = await pool.getConnection();
  try {
    console.log('[TRANSAÇÃO] Iniciando bloco atômico (BEGIN TRANSACTION)...');
    await connection.beginTransaction();

    let inseridosUsuarios = 0;
    let inseridosVinculos = 0;

    for (const item of toInsert) {
      // Inserção em `usuarios`
      const [resUser] = await connection.execute(
        `INSERT INTO usuarios (
          nome, email, senha, cargo, role_global, ativo, primeiro_acesso, criado_em, atualizado_em
        ) VALUES (?, ?, ?, 'Colaborador', 'colaborador', 1, 1, NOW(), NOW())`,
        [item.nome, item.email, senhaHash]
      );

      const novoUsuarioId = resUser.insertId;
      inseridosUsuarios++;

      // Inserção na tabela relacional `usuario_cargos_nos` vinculando ao nó #999 (Triagem)
      await connection.execute(
        `INSERT INTO usuario_cargos_nos (
          usuario_id, no_id, tipo_vinculo, permissao, criado_em
        ) VALUES (?, ?, 'titular', 'leitura', NOW())`,
        [novoUsuarioId, NO_TRIAGEM_ID]
      );
      inseridosVinculos++;
    }

    // Inserção do log de auditoria corporativa na tabela `organograma_logs`
    await connection.execute(
      `INSERT INTO organograma_logs (
        usuario_id, no_id, acao, detalhes, data_hora
      ) VALUES (?, ?, 'CRIACAO', ?, NOW())`,
      [
        1, // Admin Governança
        NO_TRIAGEM_ID,
        JSON.stringify({
          modulo: 'CARGA_INCREMENTAL_COLABORADORES',
          total_lidos: totalLidos,
          novos_inseridos: inseridosUsuarios,
          vinculos_criados: inseridosVinculos,
          novos_corporativos: novosCorporativos,
          novos_pessoais: novosPessoais,
          novos_placeholders: novosPlaceholders,
          data_execucao: new Date().toISOString()
        })
      ]
    );

    await connection.commit();
    console.log('[TRANSAÇÃO] Transação concluída com sucesso (COMMIT)!');
    console.log(`[BANCO] ${inseridosUsuarios} usuários inseridos e vinculados ao nó #${NO_TRIAGEM_ID}.`);
  } catch (error) {
    console.error('[ERRO] Falha durante a transação SQL. Realizando ROLLBACK...', error);
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  // 5. Relatório Estruturado de Execução
  imprimirResumo({
    totalLidos,
    jaExistentesNoBanco,
    duplicadosNoLote,
    novosCorporativos,
    novosPessoais,
    novosPlaceholders,
    semSetorIdentificado
  });
}

function imprimirResumo({
  totalLidos,
  jaExistentesNoBanco,
  duplicadosNoLote,
  novosCorporativos,
  novosPessoais,
  novosPlaceholders,
  semSetorIdentificado
}) {
  const totalIgnorados = jaExistentesNoBanco + duplicadosNoLote;
  console.log('\n' + '='.repeat(61));
  console.log('================ RESUMO DA CARGA INCREMENTAL ================');
  console.log(`Total de registros lidos da planilha: ${totalLidos}`);
  console.log(`Usuários já existentes (ignorados): ${totalIgnorados}`);
  console.log(`Novos usuários inseridos com e-mail corporativo: ${novosCorporativos}`);
  console.log(`Novos usuários inseridos com e-mail pessoal (fallback): ${novosPessoais}`);
  if (novosPlaceholders > 0) {
    console.log(`Novos usuários inseridos com e-mail placeholder: ${novosPlaceholders}`);
  }
  console.log(`Registros sem setor identificado: ${semSetorIdentificado}`);
  console.log('=============================================================');
}

// Execução direta se acionado via CLI
if (process.argv[1]?.endsWith('carga_incremental_colaboradores.js')) {
  executarCargaIncremental()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
