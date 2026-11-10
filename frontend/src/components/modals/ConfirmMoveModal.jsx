import React, { useEffect, useRef } from 'react';
import { ArrowRight, CornerDownRight, X, Loader2 } from 'lucide-react';

/**
 * Modal Executivo de Confirmação de Movimentação Hierárquica — JHE Engenharia
 *
 * @param {Object} props
 * @param {boolean} props.isOpen Controla a visibilidade do modal
 * @param {() => void} props.onClose Callback acionado ao cancelar ou pressionar Escape
 * @param {() => void} props.onConfirm Callback acionado ao confirmar ou pressionar Enter
 * @param {Object} props.draggedNode Nó/Área que está sendo movimentada
 * @param {Object} props.targetNode Nó/Área de destino (Nova Área Superior)
 * @param {boolean} [props.isLoading=false] Estado de carregamento durante a persistência
 */
export default function ConfirmMoveModal({
  isOpen: isOpenProp,
  onClose,
  onCancel,
  onConfirm,
  draggedNode: draggedNodeProp,
  targetNode: targetNodeProp,
  moveData,
  isLoading = false
}) {
  const isOpen = isOpenProp !== undefined ? Boolean(isOpenProp) : Boolean(moveData);
  const handleClose = onClose || onCancel || (() => {});
  const draggedNode = draggedNodeProp || moveData?.draggedNode;
  const targetNode = targetNodeProp || moveData?.targetParentNode || moveData?.targetNode;

  const confirmButtonRef = useRef(null);

  // Auto-foco no botão primário e suporte aos atalhos de teclado (Escape e Enter)
  useEffect(() => {
    if (!isOpen) return;

    // Aplica foco imediato ao botão de confirmação para acessibilidade
    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 30);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isLoading) {
        event.preventDefault();
        handleClose?.();
      } else if (event.key === 'Enter' && !isLoading) {
        // Evita disparo duplicado caso o foco já esteja no próprio botão submit/confirm
        if (document.activeElement !== confirmButtonRef.current) {
          event.preventDefault();
          onConfirm?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, handleClose, onConfirm]);

  if (!isOpen || !draggedNode || !targetNode) return null;

  const draggedLevel =
    draggedNode.nivel_nome || draggedNode.sigla || draggedNode.tipo || 'Unidade Organizacional';
  const targetLevel =
    targetNode.nivel_nome || targetNode.sigla || targetNode.tipo || 'Diretoria / Gestão';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="jhe-confirm-move-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) handleClose?.();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity"
    >
      {/* Cartão Central Branco Puro (max-w-[620px]) */}
      <div className="relative w-full max-w-[620px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-8 text-[#020931]">
        {/* Botão de Fechar Discreto no Canto Superior Direito */}
        <button
          type="button"
          disabled={isLoading}
          onClick={handleClose}
          aria-label="Fechar modal"
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 transition cursor-pointer disabled:opacity-40"
        >
          <X size={18} />
        </button>

        {/* 2. Cabeçalho Executivo */}
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 text-[#194775]">
            <ArrowRight size={20} strokeWidth={2.2} />
          </div>

          <div className="pr-8">
            <span
              className="block text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--jhe-secondary, #B4783C)' }}
            >
              REORGANIZAR ESTRUTURA
            </span>
            <h2
              id="jhe-confirm-move-title"
              className="mt-1 text-lg sm:text-xl font-semibold text-[#020931] tracking-tight"
            >
              Confirmar nova liderança?
            </h2>
          </div>
        </div>

        {/* 3. Comparativo Lado a Lado */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch sm:items-center gap-3">
          {/* Cartão Esquerdo: Área Movimentada */}
          <div className="bg-white border border-sky-100 rounded-xl p-4 shadow-2xs flex flex-col justify-between min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ÁREA MOVIMENTADA
            </span>
            <div className="mt-1.5 text-sm font-bold text-[#020931] leading-snug break-words">
              {draggedNode.titulo}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#194775]" />
              <span className="text-xs font-medium text-slate-500 truncate">
                {draggedLevel}
              </span>
            </div>
          </div>

          {/* Elemento Central: Ícone de Subordinação em Ciano/Azul Claro */}
          <div className="flex items-center justify-center py-1 sm:py-0">
            <div
              className="w-9 h-9 rounded-full bg-sky-50/90 border border-sky-100 flex items-center justify-center"
              style={{ color: 'var(--jhe-primary-lighter, #61CBE8)' }}
              title="Passa a subordinar-se a"
            >
              <CornerDownRight size={18} strokeWidth={2.25} className="text-sky-500" />
            </div>
          </div>

          {/* Cartão Direito: Nova Área Superior */}
          <div className="bg-white border border-sky-100 rounded-xl p-4 shadow-2xs flex flex-col justify-between min-w-0">
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--jhe-primary, #194775)' }}
            >
              NOVA ÁREA SUPERIOR
            </span>
            <div className="mt-1.5 text-sm font-bold text-[#020931] leading-snug break-words">
              {targetNode.titulo}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'var(--jhe-secondary, #B4783C)' }}
              />
              <span className="text-xs font-medium text-slate-500 truncate">
                {targetLevel}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Aviso de Subordinados */}
        <div className="mt-5 bg-sky-50/60 border border-sky-100/80 rounded-xl px-4 py-3 text-xs text-slate-600 leading-relaxed">
          Todos os subordinados de{' '}
          <strong className="font-semibold text-[#020931]">{draggedNode.titulo}</strong>{' '}
          acompanham o card e permanecem vinculados à mesma estrutura.
        </div>

        {/* 5. Ações e Acessibilidade */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 transition cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            ref={confirmButtonRef}
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            style={{ backgroundColor: 'var(--jhe-primary-darker, #0E284E)' }}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#61CBE8] focus:ring-offset-2 transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            Confirmar movimentação
          </button>
        </div>
      </div>
    </div>
  );
}
