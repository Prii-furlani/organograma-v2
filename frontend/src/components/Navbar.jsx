import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Network,
  ListTree,
  LogIn,
  Search,
  X,
  CornerDownLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfiguracoes } from '../context/ConfiguracoesContext';
import { useTheme } from '../context/ThemeContext';
import UserProfileDropdown from './UserProfileDropdown';
import JheLogo from './JheLogo';

export default function Navbar({
  allNodesFlat = [],
  onFocusNode,
  abaAtiva,
  setAbaAtiva,
  onOpenAuditModal,
  onOpenUserModal,
  onOpenSettingsModal,
  onOpenLoginModal
}) {
  const { usuario, isAuthenticated, canManage, realizarLogout } = useAuth();
  const { config } = useConfiguracoes();
  const { theme } = useTheme();
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMac, setIsMac] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Detecta plataforma para exibir Ctrl + K ou ⌘K
  useEffect(() => {
    setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent));
  }, []);

  // Atalho Global de Teclado: Ctrl + K ou Cmd + K
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 20);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Filtragem Instantânea e Spotlight abrangendo título, sigla, gestor e colaboradores
  const searchResults = useMemo(() => {
    const query = globalSearchQuery.trim().toLowerCase();
    if (!query) return [];

    return allNodesFlat
      .map((n) => {
        const respList = Array.isArray(n.responsavel)
          ? n.responsavel
          : (n.responsavel ? [n.responsavel] : []);
        const respText = respList.join(' & ');

        const secList = Array.isArray(n.lideres_secundarios)
          ? n.lideres_secundarios.map((s) => (typeof s === 'string' ? s : s?.nome)).filter(Boolean)
          : [];

        const membrosList = (Array.isArray(n.membros_equipe) && n.membros_equipe.length > 0)
          ? n.membros_equipe
          : (Array.isArray(n.colaboradores_diretos) ? n.colaboradores_diretos : []);

        const membrosNomes = membrosList.map((m) => (typeof m === 'string' ? m : m?.nome)).filter(Boolean);

        const matchTitulo = n.titulo?.toLowerCase().includes(query);
        const matchSigla = n.sigla?.toLowerCase().includes(query);
        const matchNivel = n.nivel_nome?.toLowerCase().includes(query);
        const matchResp = respText.toLowerCase().includes(query);
        const matchSec = secList.some((s) => s.toLowerCase().includes(query));
        const matchedMembro = membrosNomes.find((m) => m.toLowerCase().includes(query));

        const isMatch = matchTitulo || matchSigla || matchNivel || matchResp || matchSec || Boolean(matchedMembro);

        return {
          ...n,
          isMatch,
          matchInfo: matchedMembro
            ? { tipo: 'colaborador', texto: matchedMembro }
            : matchResp
            ? { tipo: 'lider', texto: respText }
            : null
        };
      })
      .filter((n) => n.isMatch)
      .slice(0, 10);
  }, [allNodesFlat, globalSearchQuery]);

  // Reseta seleção ao digitar nova consulta
  useEffect(() => {
    setSelectedIndex(0);
  }, [globalSearchQuery]);

  // Fecha o popover ao clicar fora (handleClickOutside)
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Seleciona um resultado, limpa o campo, fecha o menu e aciona focusNode(nodeId)
  const handleSelectSearchResult = (nodeId) => {
    setGlobalSearchQuery('');
    setIsSearchOpen(false);
    if (abaAtiva !== 'canvas') {
      setAbaAtiva('canvas');
    }
    if (onFocusNode) {
      onFocusNode(nodeId);
    }
  };

  // Suporte à navegação por setas (ArrowDown / ArrowUp), Enter e Escape
  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % searchResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        const itemEscolhido = searchResults[selectedIndex] || searchResults[0];
        handleSelectSearchResult(itemEscolhido.id);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  return (
    <header
      className="h-16 px-6 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md transition-colors relative z-40"
      style={{ backgroundColor: 'var(--jhe-surface-glass)' }}
    >
      {/* 1. Identidade Executiva Oficial JHE Engenharia (Dinâmica e Customizável) */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex items-center shrink-0">
          {((theme === 'dark' ? (config.logo_escura || config.logo_clara) : (config.logo_clara || config.logo_escura))) ? (
            <img
              src={theme === 'dark' ? (config.logo_escura || config.logo_clara) : (config.logo_clara || config.logo_escura)}
              alt={config.titulo_sistema || 'Organograma Corporativo'}
              className="h-10 w-auto max-w-[170px] object-contain"
            />
          ) : (
            <>
              <div className="block dark:hidden">
                <JheLogo className="h-10 w-auto" variant="default" />
              </div>
              <div className="hidden dark:block">
                <JheLogo className="h-10 w-auto" variant="dark" />
              </div>
            </>
          )}
        </div>
        <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className="text-sm font-bold tracking-tight text-[#0E284E] dark:text-slate-100 truncate"
              style={{ color: theme === 'dark' ? undefined : (config.cor_primaria || '#0E284E') }}
            >
              {config.titulo_sistema || 'Organograma Corporativo'}
            </h1>
            {config.tag_ativa && config.tag_texto && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50 shrink-0">
                {config.tag_texto}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {config.subtitulo_sistema || 'JHE Consultores Associados'}
          </p>
        </div>
      </div>

      {/* 2. Busca Central Minimalista (Search Spotlight) */}
      <div ref={searchContainerRef} className="relative w-80 md:w-96">
        <div className="relative flex items-center">
          <Search
            size={16}
            className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={globalSearchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setGlobalSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Localizar setor, diretoria ou líder..."
            aria-label="Localizar setor, diretoria ou líder (Ctrl + K)"
            className="w-full pl-10 pr-20 py-2 rounded-xl text-xs sm:text-sm bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200/70 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0E284E] dark:focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-2xs"
          />
          
          <div className="absolute right-2.5 flex items-center gap-1">
            {globalSearchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setGlobalSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold font-mono text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-700/80 border border-slate-200/90 dark:border-slate-600 rounded-md shadow-2xs select-none pointer-events-none">
                <span>{isMac ? '⌘' : 'Ctrl'}</span>
                <span>+</span>
                <span>K</span>
              </kbd>
            )}
          </div>
        </div>

        {/* Popover Flutuante de Resultados da Busca (Search Spotlight) */}
        {isSearchOpen && globalSearchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3.5 py-2 bg-slate-50/80 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Resultados no Organograma</span>
              <span className="flex items-center gap-1.5 text-[10px] font-normal text-slate-400">
                <span>↑↓ para navegar</span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <CornerDownLeft size={10} /> Enter para focar
                </span>
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100/80 dark:divide-slate-800/60 p-1.5 space-y-0.5">
              {searchResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Nenhum setor, gestor ou colaborador encontrado para "{globalSearchQuery}".
                </div>
              ) : (
                searchResults.map((no, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <button
                      key={no.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(no.id)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50/90 dark:bg-sky-950/60 ring-1 ring-sky-300/80 dark:ring-sky-700'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="min-w-0 flex items-start gap-2.5">
                        <span
                          style={{ backgroundColor: no.cor_hex || '#0E284E' }}
                          className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 ring-2 ring-white dark:ring-slate-900 shadow-2xs"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-semibold text-xs truncate ${isSelected ? 'text-sky-900 dark:text-sky-200' : 'text-slate-800 dark:text-slate-200'}`}>
                              {no.titulo}
                            </span>
                            {no.sigla && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                                {no.sigla}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                            <span>{no.nivel_nome || 'Setor'}</span>
                            {no.matchInfo ? (
                              <>
                                <span>•</span>
                                <span className={no.matchInfo.tipo === 'colaborador' ? 'text-sky-600 dark:text-sky-400 font-medium' : 'text-slate-600 dark:text-slate-300'}>
                                  {no.matchInfo.tipo === 'colaborador' ? 'Colaborador: ' : 'Líder: '}
                                  {no.matchInfo.texto}
                                </span>
                              </>
                            ) : (
                              no.responsavel && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">
                                    {Array.isArray(no.responsavel) ? no.responsavel.join(' & ') : no.responsavel}
                                  </span>
                                </>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <span className={`shrink-0 text-[10px] font-medium transition-colors px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        isSelected
                          ? 'bg-sky-600 text-white font-semibold shadow-2xs'
                          : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 bg-slate-100 dark:bg-slate-800'
                      }`}>
                        <span>Focar</span>
                        <CornerDownLeft size={10} />
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Ações e Navegação com RBAC Executivo */}
      <div className="flex items-center gap-3">
        {/* Somente renderiza Alternância de Visualização se estiver logado e autorizado */}
        {canManage && (
          <div className="flex items-center p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setAbaAtiva('canvas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${abaAtiva === 'canvas'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
            >
              <Network size={14} />
              Canvas
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva('topicos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${abaAtiva === 'topicos'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
            >
              <ListTree size={14} />
              Tópicos
            </button>
          </div>
        )}

        {/* Se deslogado: apenas o botão Entrar */}
        {!isAuthenticated ? (
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#0E284E] dark:text-slate-100 bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer transition shadow-2xs"
          >
            <LogIn size={15} className="text-[#0E284E] dark:text-sky-400" />
            <span>Entrar</span>
          </button>
        ) : (
          <div className="pl-1 border-l border-slate-200 dark:border-slate-700">
            <UserProfileDropdown
              user={usuario}
              onLogout={realizarLogout}
              onOpenUsersModal={onOpenUserModal}
              onOpenSettingsModal={onOpenSettingsModal}
              onOpenAuditModal={onOpenAuditModal}
            />
          </div>
        )}
      </div>
    </header>
  );
}
