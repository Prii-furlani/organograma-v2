import React, { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import Swal from 'sweetalert2';
import { useConfiguracoes } from '../context/ConfiguracoesContext';

export default function GovernancaRegrasTab({
  formConfig: propFormConfig,
  setFormConfig: propSetFormConfig,
  salvando: propSalvando,
  onSalvar: propOnSalvar
}) {
  const { config, salvarGovernanca } = useConfiguracoes();

  // Estado local com fallback caso as props não sejam fornecidas
  const [localConfig, setLocalConfig] = useState({
    timeout_ativo: config.timeout_ativo !== undefined ? Boolean(config.timeout_ativo) : true,
    timeout_inatividade_minutos: config.timeout_inatividade_minutos || 60,
    prevencao_ciclos_ativa: config.prevencao_ciclos_ativa !== undefined ? Boolean(config.prevencao_ciclos_ativa) : true,
    exigir_troca_senha_primeiro_acesso: config.exigir_troca_senha_primeiro_acesso !== undefined ? Boolean(config.exigir_troca_senha_primeiro_acesso) : true,
    senha_temporaria_padrao: config.senha_temporaria_padrao || 'JHE@2026'
  });

  const [localSalvando, setLocalSalvando] = useState(false);

  // Sincroniza estado local caso o contexto global seja atualizado
  useEffect(() => {
    if (config) {
      setLocalConfig({
        timeout_ativo: config.timeout_ativo !== undefined ? Boolean(config.timeout_ativo) : true,
        timeout_inatividade_minutos: config.timeout_inatividade_minutos || 60,
        prevencao_ciclos_ativa: config.prevencao_ciclos_ativa !== undefined ? Boolean(config.prevencao_ciclos_ativa) : true,
        exigir_troca_senha_primeiro_acesso: config.exigir_troca_senha_primeiro_acesso !== undefined ? Boolean(config.exigir_troca_senha_primeiro_acesso) : true,
        senha_temporaria_padrao: config.senha_temporaria_padrao || 'JHE@2026'
      });
    }
  }, [
    config.timeout_ativo,
    config.timeout_inatividade_minutos,
    config.prevencao_ciclos_ativa,
    config.exigir_troca_senha_primeiro_acesso,
    config.senha_temporaria_padrao
  ]);

  const formConfig = propFormConfig || localConfig;
  const setFormConfig = propSetFormConfig || setLocalConfig;
  const salvando = propSalvando !== undefined ? propSalvando : localSalvando;

  const handleChange = (campo, valor) => {
    setFormConfig(prev => ({ ...prev, [campo]: valor }));
  };

  const handleSalvar = async () => {
    if (propOnSalvar) {
      propOnSalvar(formConfig);
      return;
    }

    try {
      setLocalSalvando(true);
      await salvarGovernanca(formConfig);

      Swal.fire({
        icon: 'success',
        title: 'Políticas de Governança Atualizadas!',
        text: 'As diretrizes corporativas foram salvas com sucesso no banco de dados.',
        timer: 1800,
        showConfirmButton: false,
        confirmButtonColor: '#0E284E'
      });
    } catch (err) {
      console.error('Erro ao salvar governança:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao salvar',
        text: err.response?.data?.mensagem || err.message || 'Falha ao salvar políticas de governança.',
        confirmButtonColor: '#0E284E'
      });
    } finally {
      setLocalSalvando(false);
    }
  };

  const handleRestaurarPadroes = () => {
    Swal.fire({
      title: 'Restaurar Políticas Padrão?',
      text: 'Os parâmetros de governança retornarão às diretrizes corporativas recomendadas pela JHE.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, restaurar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0E284E',
      cancelButtonColor: '#64748B'
    }).then((result) => {
      if (result.isConfirmed) {
        setFormConfig(prev => ({
          ...prev,
          timeout_ativo: true,
          timeout_inatividade_minutos: 60,
          prevencao_ciclos_ativa: true,
          exigir_troca_senha_primeiro_acesso: true,
          senha_temporaria_padrao: 'JHE@2026'
        }));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Aba com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Governança & Regras Corporativas
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Políticas de conformidade, expiração de sessão, bloqueio contra ciclos hierárquicos e requisitos de credenciais.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleRestaurarPadroes}
            title="Restaurar parâmetros padrão de governança"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={13} /> Restaurar Padrões
          </button>

          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0E284E] hover:bg-[#163b70] transition flex items-center gap-1.5 shadow-md shadow-[#0E284E]/20 cursor-pointer disabled:opacity-50"
          >
            {salvando ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>Salvar Políticas</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 1. Timeout de Sessão */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Logout Automático por Inatividade (Idle Session Timeout)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
              Encerra automaticamente sessões de administradores após o período estipulado sem cliques ou toques, revogando o token JWT.
            </p>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={formConfig.timeout_ativo}
            onClick={() => handleChange('timeout_ativo', !formConfig.timeout_ativo)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
              formConfig.timeout_ativo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                formConfig.timeout_ativo ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Linha de Controles e Parâmetros */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Tempo Limite:</span>
            <select
              value={formConfig.timeout_inatividade_minutos || 60}
              onChange={(e) => handleChange('timeout_inatividade_minutos', Number(e.target.value))}
              disabled={!formConfig.timeout_ativo}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 disabled:opacity-50 cursor-pointer"
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora (60 minutos)</option>
              <option value={120}>2 horas (120 minutos)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              Throttle: 1s
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Sessões Autenticadas
            </span>
          </div>
        </div>
      </div>

      {/* 2. Prevenção de Ciclos Hierárquicos */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Prevenção de Ciclos Hierárquicos
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
              Mecanismo algorítmico que intercepta operações de alteração de vínculo de nós, impedindo que qualquer diretoria ou coordenação seja atribuída como subordinada a um setor de sua própria subárvore.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={formConfig.prevencao_ciclos_ativa}
            onClick={() => handleChange('prevencao_ciclos_ativa', !formConfig.prevencao_ciclos_ativa)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
              formConfig.prevencao_ciclos_ativa ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                formConfig.prevencao_ciclos_ativa ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Validação recursiva no backend & frontend</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {formConfig.prevencao_ciclos_ativa ? 'Ativo e Monitorado' : 'Desativado'}
          </span>
        </div>
      </div>

      {/* 3. Política de Primeiro Acesso */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Política de Primeiro Acesso & Senhas Temporárias
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
              Exigência mandatória de redefinição de credenciais provisórias emitidas pelo RH antes da liberação do painel analítico.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={formConfig.exigir_troca_senha_primeiro_acesso}
            onClick={() => handleChange('exigir_troca_senha_primeiro_acesso', !formConfig.exigir_troca_senha_primeiro_acesso)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
              formConfig.exigir_troca_senha_primeiro_acesso ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                formConfig.exigir_troca_senha_primeiro_acesso ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Chave Padrão Provisória:</span>
            <input
              type="text"
              name="senha_temporaria_padrao"
              value={formConfig.senha_temporaria_padrao || 'JHE@2026'}
              onChange={(e) => handleChange('senha_temporaria_padrao', e.target.value)}
              className="text-xs font-mono font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-slate-800 dark:text-slate-100 w-28 text-center"
            />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            {formConfig.exigir_troca_senha_primeiro_acesso ? 'Obrigatório no Login' : 'Opcional'}
          </span>
        </div>
      </div>
    </div>
  );
}
