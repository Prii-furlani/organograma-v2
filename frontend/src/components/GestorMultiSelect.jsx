import React, { useState, useEffect, useRef } from 'react';
import { getInitials } from './MultiResponsavelInput';
import { User, X, Search, ChevronDown, Check } from 'lucide-react';

/**
 * Componente Multi-Select dinâmico para seleção de Responsáveis / Gestores
 * Alimentado exclusivamente pelos colaboradores ativos cadastrados no banco de dados.
 */
export default function GestorMultiSelect({
  usuariosDisponiveis = [],
  gestoresSelecionados = [],
  onChange,
  isLoading = false
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Fecha o dropdown ao clicar fora ou ao pressionar Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setAberto(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const usuariosFiltrados = usuariosDisponiveis.filter((u) => {
    const jaSelecionado = gestoresSelecionados.some(
      (g) => String(g.id) === String(u.id) || (g.nome && u.nome && g.nome.toLowerCase() === u.nome.toLowerCase())
    );
    const q = busca.trim().toLowerCase();
    if (!q) return !jaSelecionado;
    const coincideBusca =
      (u.nome && u.nome.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.cargo && u.cargo.toLowerCase().includes(q)) ||
      (u.cargo_especialidade && u.cargo_especialidade.toLowerCase().includes(q));
    return !jaSelecionado && coincideBusca;
  });

  const adicionarGestor = (usuario) => {
    onChange([...gestoresSelecionados, usuario]);
    setBusca('');
    if (inputRef.current) inputRef.current.focus();
  };

  const removerGestor = (usuarioId, usuarioNome) => {
    onChange(
      gestoresSelecionados.filter((g) => {
        if (usuarioId && g.id) return String(g.id) !== String(usuarioId);
        return g.nome !== usuarioNome;
      })
    );
  };

  return (
    <div className="relative space-y-1.5" ref={wrapperRef}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          4. Responsável / Gestor (Cotitulares e Comitês)
          <span className="text-slate-400 font-normal lowercase ml-1">(opcional)</span>
        </label>
        {isLoading && (
          <span className="text-[10px] text-sky-500 font-medium animate-pulse">
            Carregando usuários...
          </span>
        )}
      </div>

      {/* Caixa de Entrada e Chips Selecionados */}
      <div
        onClick={() => {
          setAberto(true);
          if (inputRef.current) inputRef.current.focus();
        }}
        className="min-h-[44px] p-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-wrap items-center gap-2 cursor-pointer transition focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-950/50 focus-within:border-sky-400 dark:focus-within:border-sky-500"
      >
        {gestoresSelecionados.map((gestor) => {
          const inits = getInitials(gestor.nome);
          const gestorKey = gestor.id || gestor.nome;

          return (
            <span
              key={gestorKey}
              className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium border border-slate-200/90 dark:border-slate-700 transition-colors shadow-xs"
            >
              <span className="w-5 h-5 rounded-full bg-[#0E284E] text-[#61CBE8] dark:bg-sky-950 dark:text-sky-300 text-[9.5px] font-bold flex items-center justify-center shrink-0">
                {inits}
              </span>
              <span className="truncate max-w-[150px]">{gestor.nome}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removerGestor(gestor.id, gestor.nome);
                }}
                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold transition-colors ml-0.5"
                title={`Remover ${gestor.nome}`}
              >
                ×
              </button>
            </span>
          );
        })}

        <div className="grow flex items-center min-w-[160px]">
          <input
            ref={inputRef}
            type="text"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setAberto(true);
            }}
            onFocus={() => setAberto(true)}
            placeholder={
              gestoresSelecionados.length === 0
                ? 'Selecione um ou mais gestores cadastrados...'
                : 'Adicionar outro gestor...'
            }
            className="w-full border-none bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none p-1"
          />
          <ChevronDown size={14} className="opacity-50 shrink-0 ml-1 pointer-events-none" />
        </div>
      </div>

      {/* Dropdown de Opções */}
      {aberto && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800">
          {usuariosFiltrados.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500">
              {usuariosDisponiveis.length === 0
                ? 'Nenhum usuário cadastrado na base.'
                : 'Nenhum colaborador encontrado.'}
            </div>
          ) : (
            usuariosFiltrados.map((usuario) => {
              const inits = getInitials(usuario.nome);
              return (
                <div
                  key={usuario.id}
                  onClick={() => adicionarGestor(usuario)}
                  className="px-3 py-2 hover:bg-sky-50/70 dark:hover:bg-slate-800/80 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {inits}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block truncate">
                        {usuario.nome}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 block truncate">
                        {usuario.cargo || usuario.cargo_especialidade || usuario.email}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-bold text-sky-700 dark:text-sky-300 uppercase px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/70 border border-sky-100 dark:border-sky-800/50 shrink-0">
                    {usuario.role_global}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
