import React, { useState, useEffect, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronsUpDown,
  ChevronsDownUp,
  Sun,
  Moon,
  Lock,
  Unlock,
  Plus,
  HelpCircle,
  Briefcase,
  Layers,
  Download,
  Image,
  FileImage,
  FileText
} from 'lucide-react';
import { useDarkMode } from '../context/ThemeContext';

export default function CanvasControls({
  onZoomIn,
  onZoomOut,
  onFit,
  onExpandAll,
  onCollapseAll,
  modoVisao = 'completo',
  onToggleModoVisao,
  onExportImage,
  isCanvasLocked,
  onToggleLock,
  onNewNode,
  onOpenQuickGuide
}) {
  const { isDarkMode, toggleTheme } = useDarkMode();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  // Fecha o menu de exportação ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    }
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportMenuOpen]);

  const isExecutive = modoVisao === 'executivo';

  return (
    <div
      className="fixed bottom-11 left-6 z-20 flex items-center gap-1 p-1.5 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md transition-colors bg-white/95 dark:bg-slate-900/90"
      style={{ backgroundColor: 'var(--jhe-surface-glass)' }}
    >
      {/* 1. Zoom In (+) */}
      <button
        type="button"
        disabled={isCanvasLocked}
        onClick={onZoomIn}
        className="p-2 rounded-xl text-[#475569] hover:text-[#0E284E] dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition"
        title="Aumentar Zoom (+)"
      >
        <ZoomIn size={16} strokeWidth={2.2} />
      </button>

      {/* 2. Zoom Out (-) */}
      <button
        type="button"
        disabled={isCanvasLocked}
        onClick={onZoomOut}
        className="p-2 rounded-xl text-[#475569] hover:text-[#0E284E] dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition"
        title="Diminuir Zoom (-)"
      >
        <ZoomOut size={16} strokeWidth={2.2} />
      </button>

      {/* 3. Centralizar (Maximize / FitView) */}
      <button
        type="button"
        disabled={isCanvasLocked}
        onClick={onFit}
        className="p-2 rounded-xl text-[#475569] hover:text-[#0E284E] dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition"
        title="Centralizar Organograma na Tela (FitView)"
      >
        <Maximize size={16} strokeWidth={2.2} />
      </button>

      <div className="h-4 w-px mx-0.5 bg-slate-200 dark:bg-slate-700" />

      {/* 4. Alternância: Visão Executiva vs. Visão Completa */}
      {onToggleModoVisao && (
        <button
          type="button"
          disabled={isCanvasLocked}
          onClick={onToggleModoVisao}
          className={`px-2.5 py-1.5 rounded-xl cursor-pointer transition flex items-center gap-1.5 text-xs font-semibold ${
            isExecutive
              ? 'bg-[#0E284E] text-white shadow-xs dark:bg-sky-500 dark:text-slate-950 ring-1 ring-[#0E284E]/30 dark:ring-sky-400'
              : 'text-[#475569] hover:text-[#0E284E] dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          } disabled:opacity-35 disabled:cursor-not-allowed`}
          title={
            isExecutive
              ? 'Modo Executivo Ativo (Presidência, Coordenações e Diretorias). Clique para Visão Completa.'
              : 'Alternar para Visão Executiva (recolhe níveis abaixo das Diretorias)'
          }
        >
          {isExecutive ? (
            <Briefcase size={15} strokeWidth={2.2} />
          ) : (
            <Layers size={15} strokeWidth={2.2} />
          )}
          <span className="hidden sm:inline">
            {isExecutive ? 'Visão Executiva' : 'Visão Completa'}
          </span>
        </button>
      )}

      {/* 5. Expandir Tudo (ChevronsUpDown) */}
      <button
        type="button"
        disabled={isCanvasLocked}
        onClick={onExpandAll}
        className="p-2 rounded-xl text-[#475569] hover:text-[#0E284E] dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition"
        title="Expandir Todos os Ramos do Organograma"
      >
        <ChevronsUpDown size={16} strokeWidth={2.2} />
      </button>

      {/* 6. Recolher Tudo (ChevronsDownUp) */}
      <button
        type="button"
        disabled={isCanvasLocked}
        onClick={onCollapseAll}
        className="p-2 rounded-xl text-[#475569] hover:text-[#0E284E] dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition"
        title="Recolher Ramos (Manter apenas Co-CEOs)"
      >
        <ChevronsDownUp size={16} strokeWidth={2.2} />
      </button>

      <div className="h-4 w-px mx-0.5 bg-slate-200 dark:bg-slate-700" />

      {/* 7. Exportação Direta de Imagem (PNG / SVG) */}
      {onExportImage && (
        <div className="relative" ref={exportMenuRef}>
          <button
            type="button"
            disabled={isCanvasLocked}
            onClick={() => setExportMenuOpen((prev) => !prev)}
            className={`p-2 rounded-xl cursor-pointer transition flex items-center gap-1 ${
              exportMenuOpen
                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
                : 'text-[#475569] hover:text-[#0E284E] dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            } disabled:opacity-35 disabled:cursor-not-allowed`}
            title="Baixar Organograma em Imagem (PNG / SVG)"
          >
            <Download size={16} strokeWidth={2.2} />
          </button>

          {exportMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-56 p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Exportar Imagem</span>
                <span className="text-[9px] font-mono text-sky-600 dark:text-sky-400">d3-org-chart</span>
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false);
                    onExportImage('png');
                  }}
                  className="w-full text-left p-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                    <Image size={15} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">Imagem PNG (2x)</div>
                    <div className="text-[10px] text-slate-400">Alta resolução nítida</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false);
                    onExportImage('pdf');
                  }}
                  className="w-full text-left p-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <FileText size={15} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">Documento PDF (A4)</div>
                    <div className="text-[10px] text-slate-400">Pronto para impressão</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false);
                    onExportImage('svg');
                  }}
                  className="w-full text-left p-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <FileImage size={15} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">Vetor SVG</div>
                    <div className="text-[10px] text-slate-400">Escalável sem perda</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="h-4 w-px mx-0.5 bg-slate-200 dark:bg-slate-700" />

      {/* 8. Tema Claro / Escuro (Sun / Moon) */}
      <button
        type="button"
        onClick={toggleTheme}
        className="p-2 rounded-xl text-[#475569] hover:text-[#0E284E] dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
        title={isDarkMode ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
      >
        {isDarkMode ? <Sun size={16} className="text-amber-400" strokeWidth={2.2} /> : <Moon size={16} strokeWidth={2.2} />}
      </button>

      {/* 9. Travar / Destravar Canvas (Lock / Unlock) */}
      <button
        type="button"
        onClick={onToggleLock}
        className={`p-2 rounded-xl cursor-pointer transition flex items-center gap-1 text-xs font-medium ${
          isCanvasLocked
            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/50'
            : 'text-[#475569] hover:text-[#0E284E] dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        title={
          isCanvasLocked
            ? 'Destravar Canvas (Liberar Zoom e Arraste)'
            : 'Travar Canvas (Bloquear movimentos acidentais em reuniões)'
        }
      >
        {isCanvasLocked ? <Lock size={15} strokeWidth={2.2} /> : <Unlock size={15} strokeWidth={2.2} />}
        {isCanvasLocked && <span className="pr-1">Travado</span>}
      </button>

      {/* 10. Guia Rápido */}
      {onOpenQuickGuide && (
        <>
          <div className="h-4 w-px mx-0.5 bg-slate-200 dark:bg-slate-700" />
          <button
            type="button"
            onClick={onOpenQuickGuide}
            className="p-2 rounded-xl text-[#475569] hover:text-[#0E284E] dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition flex items-center gap-1.5 text-xs font-medium"
            title="Abrir Guia Rápido e Instruções"
          >
            <HelpCircle size={16} strokeWidth={2.2} className="text-amber-500" />
            <span className="hidden sm:inline">Guia</span>
          </button>
        </>
      )}

      {/* 11. Novo Nó Hierárquico */}
      {onNewNode && (
        <>
          <div className="h-4 w-px mx-0.5 bg-slate-200 dark:bg-slate-700" />
          <button
            type="button"
            onClick={onNewNode}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer hover:opacity-95 transition"
            style={{ backgroundColor: 'var(--jhe-primary-darker, #0E284E)' }}
            title="Adicionar Novo Nó Hierárquico"
          >
            <Plus size={14} strokeWidth={2.5} />
            Novo Nó
          </button>
        </>
      )}
    </div>
  );
}
