import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ShieldCheck, FileDown, Search, Loader2 } from 'lucide-react';
import api from '../services/api';
import { exportAuditPdf } from '../utils/exportAuditPdf';

/* ------------------------------------------------------------------ */
/*  Constantes                                                        */
/* ------------------------------------------------------------------ */

const ACOES = [
  { valor: 'TODAS', rotulo: 'Todas as ações' },
  { valor: 'CRIACAO', rotulo: 'Criação' },
  { valor: 'EDICAO', rotulo: 'Edição' },
  { valor: 'MOVIMENTACAO', rotulo: 'Movimentação' },
  { valor: 'EXCLUSAO', rotulo: 'Exclusão' },
];

const MODULOS = [
  { valor: 'TODOS', rotulo: 'Todos os módulos' },
  { valor: 'Canvas Organograma', rotulo: 'Canvas Organograma' },
  { valor: 'Editor em Tópicos', rotulo: 'Editor em Tópicos' },
  { valor: 'Gestão de Usuários', rotulo: 'Gestão de Usuários' },
  { valor: 'Aparência & Regras', rotulo: 'Aparência & Regras' },
  { valor: 'Autenticação', rotulo: 'Autenticação' },
];

const BADGE_CLASSES = {
  CRIACAO: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50',
  EDICAO: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/50',
  MOVIMENTACAO: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/50',
  EXCLUSAO: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/50',
  AUTENTICACAO: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/50',
};

const ACAO_ROTULO = {
  CRIACAO: 'Criação',
  EDICAO: 'Edição',
  MOVIMENTACAO: 'Movimentação',
  EXCLUSAO: 'Exclusão',
  AUTENTICACAO: 'Autenticação',
};

const FILTROS_INICIAIS = {
  usuario_id: '',
  data_inicio: '',
  data_fim: '',
  acao: 'TODAS',
  modulo: 'TODOS',
  termo_busca: '',
};

const INPUT_CLS =
  'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 focus:border-sky-300 dark:focus:border-sky-700 outline-none transition-all';

const LABEL_CLS =
  'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';

/* ------------------------------------------------------------------ */
/*  Helpers de renderização de detalhes                                */
/* ------------------------------------------------------------------ */

function renderDetalhes(log) {
  const { acao, detalhes } = log;
  if (!detalhes) return <span className="text-slate-400 italic text-xs">—</span>;

  // Diff genérico (campo a campo)
  if (detalhes.diff) {
    // Movimentação com área superior
    if (acao === 'MOVIMENTACAO' && detalhes.diff.area_superior) {
      const d = detalhes.diff.area_superior;
      return (
        <span className="text-xs leading-relaxed">
          <span className="text-slate-500 dark:text-slate-400">De:</span>{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-300">{d.de ?? '—'}</span>
          {' ➔ '}
          <span className="text-slate-500 dark:text-slate-400">Para:</span>{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-300">{d.para ?? '—'}</span>
        </span>
      );
    }

    const entries = Object.entries(detalhes.diff);
    if (entries.length > 0) {
      return (
        <ul className="space-y-1">
          {entries.map(([campo, vals]) => (
            <li key={campo} className="text-xs leading-relaxed">
              <span className="font-semibold text-slate-600 dark:text-slate-400">{campo}:</span>{' '}
              <span className="text-slate-500 dark:text-slate-500">
                &quot;{vals?.de ?? '—'}&quot;
              </span>
              {' ➔ '}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                &quot;{vals?.para ?? '—'}&quot;
              </span>
            </li>
          ))}
        </ul>
      );
    }
  }

  // Criação — dados do registro criado
  if (acao === 'CRIACAO' && detalhes.after) {
    const { titulo, nivel_nome, responsavel, area_superior } = detalhes.after;
    return (
      <div className="text-xs space-y-0.5 leading-relaxed">
        {titulo && (
          <div>
            <span className="font-semibold text-slate-600 dark:text-slate-400">Título:</span>{' '}
            <span className="text-slate-800 dark:text-slate-200">{titulo}</span>
          </div>
        )}
        {nivel_nome && (
          <div>
            <span className="font-semibold text-slate-600 dark:text-slate-400">Nível:</span>{' '}
            <span className="text-slate-700 dark:text-slate-300">{nivel_nome}</span>
          </div>
        )}
        {responsavel && (
          <div>
            <span className="font-semibold text-slate-600 dark:text-slate-400">Responsável:</span>{' '}
            <span className="text-slate-700 dark:text-slate-300">{responsavel}</span>
          </div>
        )}
        {area_superior && (
          <div>
            <span className="font-semibold text-slate-600 dark:text-slate-400">Superior:</span>{' '}
            <span className="text-slate-700 dark:text-slate-300">{area_superior}</span>
          </div>
        )}
      </div>
    );
  }

  // Exclusão — dados do registro removido
  if (acao === 'EXCLUSAO' && detalhes.before) {
    const { titulo, nivel_nome, responsavel } = detalhes.before;
    return (
      <div className="text-xs space-y-0.5 leading-relaxed">
        {titulo && (
          <div>
            <span className="font-semibold text-slate-600 dark:text-slate-400">Excluído:</span>{' '}
            <span className="text-rose-600 dark:text-rose-400 font-medium">{titulo}</span>
          </div>
        )}
        {nivel_nome && (
          <div>
            <span className="font-semibold text-slate-600 dark:text-slate-400">Nível:</span>{' '}
            <span className="text-slate-600 dark:text-slate-400">{nivel_nome}</span>
          </div>
        )}
        {responsavel && (
          <div>
            <span className="font-semibold text-slate-600 dark:text-slate-400">Era:</span>{' '}
            <span className="text-slate-600 dark:text-slate-400">{responsavel}</span>
          </div>
        )}
      </div>
    );
  }

  // Autenticação — IP e User Agent
  if (acao === 'AUTENTICACAO') {
    return (
      <div className="text-xs space-y-0.5">
        {detalhes.resumo && (
          <div className="text-slate-700 dark:text-slate-300">{detalhes.resumo}</div>
        )}
        {detalhes.ip && (
          <div className="text-slate-400 font-mono text-[11px]">IP: {detalhes.ip}</div>
        )}
      </div>
    );
  }

  // Fallback
  if (detalhes.resumo) {
    return <span className="text-xs text-slate-600 dark:text-slate-400">{detalhes.resumo}</span>;
  }

  return <span className="text-slate-400 italic text-xs">—</span>;
}

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */

export default function AuditLogsModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);

  const modalRef = useRef(null);

  /* ---- Buscar logs ------------------------------------------------ */
  const buscarLogs = useCallback(async (filtrosAtuais) => {
    setCarregando(true);
    setErro(null);
    try {
      const params = {};
      if (filtrosAtuais.usuario_id) params.usuario_id = filtrosAtuais.usuario_id;
      if (filtrosAtuais.data_inicio) params.data_inicio = filtrosAtuais.data_inicio;
      if (filtrosAtuais.data_fim) params.data_fim = filtrosAtuais.data_fim;
      if (filtrosAtuais.acao && filtrosAtuais.acao !== 'TODAS') params.acao = filtrosAtuais.acao;
      if (filtrosAtuais.modulo && filtrosAtuais.modulo !== 'TODOS') params.modulo = filtrosAtuais.modulo;
      if (filtrosAtuais.termo_busca) params.termo_busca = filtrosAtuais.termo_busca;
      params.limite = 200;

      const { data } = await api.get('/auditoria', { params });
      if (data.sucesso) {
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
      } else {
        setErro('Não foi possível carregar os registros.');
      }
    } catch {
      setErro('Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, []);

  /* ---- Buscar lista de usuários ----------------------------------- */
  const buscarUsuarios = useCallback(async () => {
    try {
      const { data } = await api.get('/auditoria/usuarios');
      if (data.sucesso) setUsuarios(data.usuarios ?? []);
    } catch {
      /* silencioso — dropdown ficará vazio */
    }
  }, []);

  /* ---- Efeitos de montagem ---------------------------------------- */
  useEffect(() => {
    if (!isOpen) return;
    buscarUsuarios();
    buscarLogs(FILTROS_INICIAIS);
    setFiltros(FILTROS_INICIAIS);
  }, [isOpen, buscarUsuarios, buscarLogs]);

  // Acessibilidade WCAG 2.1 AA: Focus Trap e Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  /* ---- Handlers --------------------------------------------------- */
  const handleFiltroChange = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleConsultar = () => buscarLogs(filtros);

  const handleLimpar = () => {
    setFiltros(FILTROS_INICIAIS);
    buscarLogs(FILTROS_INICIAIS);
  };

  const handleExportarPdf = () => {
    const filtrosAtivos = {};
    if (filtros.usuario_id) {
      const u = usuarios.find((usr) => String(usr.id) === String(filtros.usuario_id));
      filtrosAtivos.usuario = u?.nome ?? filtros.usuario_id;
    }
    if (filtros.data_inicio) filtrosAtivos.data_inicio = filtros.data_inicio;
    if (filtros.data_fim) filtrosAtivos.data_fim = filtros.data_fim;
    if (filtros.acao !== 'TODAS') filtrosAtivos.acao = filtros.acao;
    if (filtros.modulo !== 'TODOS') filtrosAtivos.modulo = filtros.modulo;
    if (filtros.termo_busca) filtrosAtivos.termo_busca = filtros.termo_busca;
    exportAuditPdf(logs, filtrosAtivos);
  };

  /* ---- Guard ------------------------------------------------------ */
  if (!isOpen) return null;

  /* ---- Render ----------------------------------------------------- */
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/35 backdrop-blur-sm transition-all"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-none sm:rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xl shadow-slate-900/10"
      >
        {/* Cabeçalho Clean & Minimalista (Fundo 100% Branco) */}
        <div className="border-b border-slate-100 dark:border-slate-800/80 px-6 sm:px-8 py-5 sm:py-6 flex items-start justify-between bg-white dark:bg-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="audit-modal-title"
                className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
              >
                Logs de Auditoria
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                {total} registros
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Rastreabilidade de criação, alteração e movimentação no organograma institucional.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-[#0E284E] focus-visible:outline-none"
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ============================================================ */}
        {/*  FILTER PANEL (Clean, Arejado e Responsivo)                   */}
        {/* ============================================================ */}
        <div className="bg-slate-50/50 dark:bg-slate-800/30 px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Usuário */}
            <div>
              <label className={LABEL_CLS}>Usuário</label>
              <select
                value={filtros.usuario_id}
                onChange={(e) => handleFiltroChange('usuario_id', e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">Todos os usuários</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Início */}
            <div>
              <label className={LABEL_CLS}>Data Início</label>
              <input
                type="date"
                value={filtros.data_inicio}
                onChange={(e) => handleFiltroChange('data_inicio', e.target.value)}
                className={INPUT_CLS}
              />
            </div>

            {/* Data Fim */}
            <div>
              <label className={LABEL_CLS}>Data Fim</label>
              <input
                type="date"
                value={filtros.data_fim}
                onChange={(e) => handleFiltroChange('data_fim', e.target.value)}
                className={INPUT_CLS}
              />
            </div>

            {/* Ação */}
            <div>
              <label className={LABEL_CLS}>Ação</label>
              <select
                value={filtros.acao}
                onChange={(e) => handleFiltroChange('acao', e.target.value)}
                className={INPUT_CLS}
              >
                {ACOES.map((a) => (
                  <option key={a.valor} value={a.valor}>
                    {a.rotulo}
                  </option>
                ))}
              </select>
            </div>

            {/* Módulo */}
            <div>
              <label className={LABEL_CLS}>Módulo</label>
              <select
                value={filtros.modulo}
                onChange={(e) => handleFiltroChange('modulo', e.target.value)}
                className={INPUT_CLS}
              >
                {MODULOS.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.rotulo}
                  </option>
                ))}
              </select>
            </div>

            {/* Busca textual */}
            <div>
              <label className={LABEL_CLS}>Busca Textual</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={filtros.termo_busca}
                  onChange={(e) => handleFiltroChange('termo_busca', e.target.value)}
                  placeholder="Buscar nos detalhes..."
                  className={`${INPUT_CLS} pl-10`}
                />
              </div>
            </div>
          </div>

          {/* Action row responsiva */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/80">
            <button
              type="button"
              onClick={handleExportarPdf}
              disabled={logs.length === 0}
              className="bg-[#0E284E] text-white rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold hover:bg-[#194775] transition-all flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#0E284E] focus-visible:outline-none"
            >
              <FileDown className="w-4 h-4" />
              <span>Exportar PDF</span>
            </button>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleLimpar}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
              >
                Limpar filtros
              </button>

              <button
                type="button"
                onClick={handleConsultar}
                disabled={carregando}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[#0E284E] focus-visible:outline-none"
              >
                {carregando ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#0E284E] dark:text-[#61CBE8]" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Filtrar</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  RESULTS TABLE                                               */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading */}
          {carregando && (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#0E284E] dark:text-[#61CBE8]" />
              <span className="text-xs sm:text-sm">Consultando registros de governança...</span>
            </div>
          )}

          {/* Error */}
          {!carregando && erro && (
            <div className="flex items-center justify-center py-24 px-4">
              <p className="text-xs sm:text-sm text-rose-500 dark:text-rose-400">{erro}</p>
            </div>
          )}

          {/* Empty */}
          {!carregando && !erro && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-24 px-4 text-slate-400">
              <Search className="w-8 h-8 text-slate-300" />
              <p className="text-xs sm:text-sm">Nenhum evento encontrado para os parâmetros selecionados.</p>
            </div>
          )}

          {/* Table */}
          {!carregando && !erro && logs.length > 0 && (
            <div className="p-4 sm:p-6">
              <div className="relative overflow-x-auto overflow-y-auto max-h-[60vh] border border-slate-200 dark:border-slate-800 rounded-xl custom-scrollbar">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                        Data e Hora
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                        Usuário
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                        Ação / Módulo
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                        Entidade Afetada
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                        Detalhamento
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/60">
                    {logs.map((log, idx) => (
                      <tr
                        key={log.id ?? idx}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Data e Hora */}
                        <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {(log.data_hora || log.created_at)
                            ? new Date(log.data_hora || log.created_at).toLocaleString('pt-BR')
                            : '—'}
                        </td>

                        {/* Usuário */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {log.usuario_nome ?? '—'}
                          </div>
                          {log.usuario_email && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                              {log.usuario_email}
                            </div>
                          )}
                        </td>

                        {/* Ação / Local */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              BADGE_CLASSES[log.acao] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {ACAO_ROTULO[log.acao] ?? log.acao}
                          </span>
                          {log.modulo && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                              {log.modulo}
                            </div>
                          )}
                        </td>

                        {/* Entidade Afetada */}
                        <td
                          className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-[200px] font-medium truncate"
                          title={log.entidade_afetada || log.entidade_titulo || ''}
                        >
                          {log.entidade_afetada ?? log.entidade_titulo ?? log.entidade_tipo ?? (log.no_id ? `Nó #${log.no_id}` : '—')}
                        </td>

                        {/* Detalhamento */}
                        <td className="py-3.5 px-4 sm:px-6 max-w-[320px]">{renderDetalhes(log)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Clean */}
        <div className="px-6 sm:px-8 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <p className="text-[11px] text-slate-400 italic text-center sm:text-left">
            Registros de auditoria são imutáveis e auditados segundo as normas de conformidade da JHE Engenharia.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}
