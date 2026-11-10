import React from 'react';

/**
 * Rodapé Institucional Minimalista e Executivo - JHE Organograma Corporativo
 * Exibe o aviso legal de direitos reservados, ano dinâmico e versão do sistema.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="fixed bottom-0 inset-x-0 h-8 z-30 flex items-center justify-between px-4 sm:px-6 border-t backdrop-blur-sm transition-colors duration-200 select-none bg-white/70 dark:bg-[#020931]/70 border-slate-200/70 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 text-[11px] font-medium pointer-events-auto"
      role="contentinfo"
    >
      <div className="flex items-center gap-1.5 truncate pr-2">
        <span>&copy; {currentYear} JHE Consultores Associados &amp; Engenharia.</span>
        <span className="hidden sm:inline">Todos os direitos reservados.</span>
      </div>

      <div className="flex items-center gap-2 shrink-0 text-[10.5px]">
        <span className="font-semibold text-slate-600 dark:text-slate-300">v2.4.0</span>
        <span className="text-slate-400 dark:text-slate-600">•</span>
        <span>Governança Corporativa</span>
      </div>
    </footer>
  );
}
