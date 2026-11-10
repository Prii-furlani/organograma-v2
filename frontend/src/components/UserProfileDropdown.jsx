import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  ShieldCheck, 
  LogOut, 
  ChevronDown 
} from 'lucide-react';

/**
 * UserProfileDropdown Component
 * Dropdown de perfil e ações administrativas/governança
 */
export default function UserProfileDropdown({ 
  user, 
  onLogout, 
  onOpenUsersModal, 
  onOpenSettingsModal, 
  onOpenAuditModal 
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fecha o dropdown ao clicar fora ou pressionar Escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const isAdmin = user?.role_global === 'admin';

  const initials = user?.nome
    ? user.nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    : 'AG';

  return (
    <div className="flex items-center gap-2">
      {/* Container do Dropdown de Gestão */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-slate-100/70 hover:bg-slate-200/60 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-all text-left focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 cursor-pointer shadow-2xs"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          {/* Avatar com Iniciais */}
          <div className="w-8 h-8 rounded-xl bg-[#020931] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
            {initials}
          </div>

          {/* Nome e Perfil */}
          <div className="hidden sm:block min-w-0 pr-1">
            <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
              {user?.nome || 'Administrador'}
            </span>
            <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              {user?.role_global || 'ADMIN'}
            </span>
          </div>

          <ChevronDown
            size={14}
            className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Menu Flutuante Minimalista */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
              <span className="text-[10px] font-bold text-[#B4783C] uppercase tracking-wider block">
                Painel Administrativo
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user?.email || 'admin@jhe.com.br'}
              </p>
            </div>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onOpenUsersModal) onOpenUsersModal();
                  }}
                  className="w-full px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <Users className="text-[#0E284E] dark:text-[#61CBE8]" size={16} />
                  <span>Gestão de Usuários</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onOpenSettingsModal) onOpenSettingsModal();
                  }}
                  className="w-full px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <Settings className="text-[#0E284E] dark:text-[#61CBE8]" size={16} />
                  <span>Configurações</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                if (onOpenAuditModal) onOpenAuditModal();
              }}
              className="w-full px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
            >
              <ShieldCheck className="text-[#0E284E] dark:text-[#61CBE8]" size={16} />
              <span>Registro de Auditoria</span>
            </button>
          </div>
        )}
      </div>

      {/* Botão de Sair Mantido Fixo à Direita */}
      <button
        type="button"
        onClick={onLogout}
        title="Sair do sistema"
        aria-label="Sair da conta"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 cursor-pointer transition-colors"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}
