import React from 'react';

/**
 * NodeCard - Componente de cartão individual do Organograma JHE
 * Estrutura visual elegante com rodapé protegido e botão de expansão perfeitamente ancorado.
 */
export default function NodeCard({
  node = {},
  isExpanded = false,
  subordinatesCount = 0,
  handleToggleExpand,
  onSelectNode,
  isHighlighted = false,
  isDark = true
}) {
  const leaderName = node.leader_name || node.responsavel || '';
  const titulo = node.titulo || node.name || 'Setor';
  const sigla = node.sigla ? node.sigla.trim() : '';
  const nivelNome = node.nivel_nome || node.nivel || '';
  const corAcento = node.cor_identificador || node.cor_hex || '#3B82F6';
  const hasSubordinates = subordinatesCount > 0;

  // Extrai iniciais do gestor para avatar
  const getInitials = (name) => {
    if (!name) return 'JH';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      onClick={() => onSelectNode && onSelectNode(node)}
      className={`relative w-[260px] min-h-[154px] rounded-2xl border transition-all duration-200 cursor-pointer select-none pb-5 ${
        isDark
          ? 'bg-slate-900 border-slate-700/80 text-white shadow-xl hover:border-slate-600'
          : 'bg-white border-slate-200 text-slate-900 shadow-md hover:border-slate-300'
      } ${
        isHighlighted
          ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-cyan-500/20 shadow-lg'
          : ''
      }`}
      style={{
        borderTopWidth: '4px',
        borderTopColor: corAcento
      }}
    >
      <div className="p-3.5 pb-2 flex flex-col justify-between h-full">
        {/* Topo: Ponto Colorido + Sigla + Nível */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1.5 overflow-hidden">
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0 shadow-sm"
              style={{ backgroundColor: corAcento }}
            />
            {sigla && (
              <>
                <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                  {sigla}
                </span>
                <span className="text-slate-500">•</span>
              </>
            )}
            <span className={`truncate font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {nivelNome}
            </span>
          </div>

          {/* Título do Setor/Cargo */}
          <h4
            className={`text-xs font-bold leading-snug line-clamp-3 break-words ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
            title={titulo}
          >
            {titulo}
          </h4>
        </div>

        {/* Rodapé: Gestor e Contador de Equipe com linha divisória consistente */}
        <div className={`mt-2 pt-2 border-t flex items-center justify-between min-h-[28px] ${
          isDark ? 'border-slate-700/60' : 'border-slate-100'
        }`}>
          {/* Lado Esquerdo: Avatar + Nome do Líder delimitado com truncate */}
          <div className="flex items-center gap-1.5 min-w-0 max-w-[145px] overflow-hidden">
            {leaderName ? (
              <>
                <span className={`w-5 h-5 min-w-[20px] rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0 ${
                  isDark
                    ? 'bg-slate-800 text-slate-200 border-slate-600'
                    : 'bg-slate-100 text-slate-700 border-white'
                }`}>
                  {getInitials(leaderName)}
                </span>
                <span
                  className={`text-xs font-medium truncate max-w-[115px] ${
                    isDark ? 'text-slate-200' : 'text-slate-700'
                  }`}
                  title={leaderName}
                >
                  {leaderName}
                </span>
              </>
            ) : (
              <span className={`text-[10px] italic truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Sem gestor titular
              </span>
            )}
          </div>

          {/* Lado Direito: Badge de Contagem de Membros */}
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
            isDark
              ? 'bg-slate-800 text-slate-300 border border-slate-700'
              : 'bg-slate-50 text-slate-600 border border-slate-200'
          }`}>
            <svg
              className="w-3 h-3 opacity-70"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span>{node.total_subordinates ?? node.membros_count ?? subordinatesCount}</span>
          </div>
        </div>
      </div>

      {/* Botão de Expansão/Colapso Inferior 50% ancorado para fora */}
      {hasSubordinates && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (handleToggleExpand) handleToggleExpand(node);
          }}
          className={`absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-md transition-colors cursor-pointer ${
            isDark
              ? 'bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800'
              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
          title={isExpanded ? 'Recolher ramos' : 'Expandir ramos'}
        >
          <span className="text-[9px] leading-none">{isExpanded ? '▲' : '▼'}</span>
          <span>{subordinatesCount}</span>
        </button>
      )}
    </div>
  );
}
