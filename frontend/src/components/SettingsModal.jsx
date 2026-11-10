import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Layers,
  ShieldAlert,
  Palette,
  Info,
  Plus,
  Edit2,
  Trash2,
  Save,
  Check,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  Calendar,
  Sparkles,
  HelpCircle,
  Clock
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useTheme } from '../context/ThemeContext';
import AparenciaIdentidadeTab from './AparenciaIdentidadeTab';
import GovernancaRegrasTab from './GovernancaRegrasTab';

// 1. Cores de atalho rápido (linha principal)
const CORES_PRINCIPAIS = [
  { nome: 'Navy Institucional', hex: '#0E284E' },
  { nome: 'Azul Tecnologia', hex: '#0284C7' },
  { nome: 'Âmbar Executivo', hex: '#B4783C' },
  { nome: 'Laranja Operações', hex: '#D97706' },
  { nome: 'Ardósia / Técnico', hex: '#5B6B7C' },
  { nome: 'Verde Sustentável', hex: '#15803D' }
];

// 2. Cores pré-definidas da biblioteca estendida do lápis
const CORES_EXTRAS = [
  { nome: 'Índigo Profundo', hex: '#4338CA' },
  { nome: 'Índigo Real', hex: '#6366F1' },
  { nome: 'Violeta Executivo', hex: '#7C3AED' },
  { nome: 'Púrpura Corporativo', hex: '#A855F7' },
  { nome: 'Bordô / Rosa Escuro', hex: '#BE185D' },
  { nome: 'Rubi Corporativo', hex: '#E11D48' },
  { nome: 'Petróleo / Teal', hex: '#0D9488' },
  { nome: 'Esmeralda', hex: '#059669' },
  { nome: 'Oliva / Musgo', hex: '#4D7C0F' },
  { nome: 'Caramelo Nobre', hex: '#B45309' },
  { nome: 'Chumbo Sóbrio', hex: '#334155' },
  { nome: 'Grafite Noturno', hex: '#1E293B' }
];

/**
 * Seletor de Cores Homologadas (Atalhos Rápidos + Menu Flutuante Estendido com Lápis)
 */
function ColorPickerSection({
  selectedHex = '#0E284E',
  onSelectHex
}) {
  const [paletaAberta, setPaletaAberta] = useState(false);
  const paletaRef = useRef(null);

  // Fecha o popover ao clicar fora
  useEffect(() => {
    function handleClickOutside(e) {
      if (paletaRef.current && !paletaRef.current.contains(e.target)) {
        setPaletaAberta(false);
      }
    }
    if (paletaAberta) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [paletaAberta]);

  const hexAtivo = (selectedHex || '#0E284E').toUpperCase();
  const isPrincipal = CORES_PRINCIPAIS.some(
    (c) => c.hex.toUpperCase() === hexAtivo
  );
  const isExtraOuCustom = !isPrincipal;

  const selecionarCor = (hex) => {
    onSelectHex(hex);
    setPaletaAberta(false);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          Cor de Destaque
        </label>
        <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 uppercase">
          {hexAtivo}
        </span>
      </div>

      <div className="flex items-center gap-1.5 h-9">
        {/* 1. Cores de atalho rápido (linha principal) */}
        {CORES_PRINCIPAIS.map((item) => {
          const isSelecionada = hexAtivo === item.hex.toUpperCase();
          return (
            <button
              key={item.hex}
              type="button"
              title={`${item.nome} (${item.hex})`}
              onClick={() => selecionarCor(item.hex)}
              style={{ backgroundColor: item.hex }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isSelecionada
                  ? 'ring-2 ring-sky-500 ring-offset-2 scale-110 shadow-sm'
                  : 'hover:scale-105 opacity-80 hover:opacity-100'
              }`}
            >
              {isSelecionada && (
                <svg className="w-3.5 h-3.5 text-white stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}

        {/* 2. Botão do Lápis com Menu Flutuante (Popover) */}
        <div className="relative" ref={paletaRef}>
          <button
            type="button"
            onClick={() => setPaletaAberta((prev) => !prev)}
            title="Mais cores pré-definidas (paleta estendida)"
            aria-label="Abrir paleta de cores estendida"
            style={{
              backgroundColor: isExtraOuCustom ? hexAtivo : 'transparent'
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border border-dashed ${
              isExtraOuCustom
                ? 'ring-2 ring-sky-500 ring-offset-2 scale-110 shadow-sm border-white text-white'
                : paletaAberta
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 ring-2 ring-sky-400/40'
                  : 'border-slate-400 dark:border-slate-500 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-600 hover:scale-105'
            }`}
          >
            {isExtraOuCustom ? (
              <svg className="w-3.5 h-3.5 text-white stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <Edit2 size={12} className="stroke-[2.2]" />
            )}
          </button>

          {/* Menu Flutuante de Cores Extras Pré-definidas */}
          {paletaAberta && (
            <div className="absolute right-0 top-full mt-2 w-56 p-2.5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-700 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Paleta Estendida
                </span>
                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                  {CORES_EXTRAS.length} tons
                </span>
              </div>

              <div className="grid grid-cols-6 gap-1.5 mb-1">
                {CORES_EXTRAS.map((extra) => {
                  const isSelecionadaExtra = hexAtivo === extra.hex.toUpperCase();
                  return (
                    <button
                      key={extra.hex}
                      type="button"
                      title={`${extra.nome} (${extra.hex})`}
                      onClick={() => selecionarCor(extra.hex)}
                      style={{ backgroundColor: extra.hex }}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        isSelecionadaExtra
                          ? 'ring-2 ring-sky-500 scale-110 shadow-xs'
                          : 'hover:scale-110 opacity-90 hover:opacity-100'
                      }`}
                    >
                      {isSelecionadaExtra && (
                        <svg className="w-3.5 h-3.5 text-white stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsModal({
  isOpen,
  onClose,
  niveis = [],
  allNodes = [],
  onSaveNiveis
}) {
  const { themePreference, setThemePreference, theme } = useTheme();
  const [activeTab, setActiveTab] = useState('niveis');
  const [niveisState, setNiveisState] = useState([]);
  
  // Controle de edição inline no próprio card
  const [nivelEmEdicaoId, setNivelEmEdicaoId] = useState(null);
  const [formEdicao, setFormEdicao] = useState({ nome: '', nivel_ordem: 0, cor_hex: '#0E284E' });

  const [isAddingNivel, setIsAddingNivel] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const modalRef = useRef(null);

  // Formulário temporário para inclusão de novo nível
  const [tempFormData, setTempFormData] = useState({
    nome: '',
    slug: '',
    nivel_ordem: 1,
    classe_css: 'jhe-level-diretoria',
    cor_hex: '#0E284E'
  });

  useEffect(() => {
    if (isOpen) {
      setNiveisState(niveis && niveis.length > 0 ? JSON.parse(JSON.stringify(niveis)) : []);
      setHasChanges(false);
      setNivelEmEdicaoId(null);
      setIsAddingNivel(false);
    }
  }, [isOpen, niveis]);

  const cancelarEdicao = (onConfirmedClose) => {
    if (nivelEmEdicaoId !== null) {
      const nivelAtual = niveisState.find((n) => n.id === nivelEmEdicaoId);
      if (nivelAtual) {
        const nomeAlterado = formEdicao.nome.trim() !== (nivelAtual.nome || '').trim();
        const ordemAlterada = Number(formEdicao.nivel_ordem) !== Number(nivelAtual.nivel_ordem ?? nivelAtual.ordem_hierarquica ?? 0);
        const corAtual = (nivelAtual.cor_identificador || nivelAtual.cor_hex || '#0E284E').toUpperCase();
        const corForm = (formEdicao.cor_hex || '#0E284E').toUpperCase();
        const corAlterada = corAtual !== corForm;

        if (nomeAlterado || ordemAlterada || corAlterada) {
          Swal.fire({
            title: 'Descartar alterações?',
            text: 'Existem alterações não salvas neste nível hierárquico. Deseja realmente descartá-las?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E11D48',
            cancelButtonColor: '#64748B',
            confirmButtonText: 'Sim, descartar',
            cancelButtonText: 'Continuar editando',
            reverseButtons: true
          }).then((result) => {
            if (result.isConfirmed) {
              setNivelEmEdicaoId(null);
              if (typeof onConfirmedClose === 'function') onConfirmedClose();
            }
          });
          return;
        }
      }
    }
    setNivelEmEdicaoId(null);
    if (typeof onConfirmedClose === 'function') onConfirmedClose();
  };

  const cancelarAdicao = (onConfirmedClose) => {
    if (isAddingNivel && tempFormData.nome.trim() !== '') {
      Swal.fire({
        title: 'Descartar novo nível?',
        text: 'Você começou a preencher um novo nível hierárquico. Deseja descartar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#E11D48',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Sim, descartar',
        cancelButtonText: 'Continuar preenchendo',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          setIsAddingNivel(false);
          if (typeof onConfirmedClose === 'function') onConfirmedClose();
        }
      });
      return;
    }
    setIsAddingNivel(false);
    if (typeof onConfirmedClose === 'function') onConfirmedClose();
  };

  const handleModalClose = () => {
    if (nivelEmEdicaoId !== null) {
      cancelarEdicao(() => onClose());
      return;
    }
    if (isAddingNivel && tempFormData.nome.trim() !== '') {
      cancelarAdicao(() => onClose());
      return;
    }
    onClose();
  };

  // Listener para fechar no Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (nivelEmEdicaoId !== null) {
          cancelarEdicao();
        } else if (isAddingNivel) {
          cancelarAdicao();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, nivelEmEdicaoId, isAddingNivel, formEdicao, tempFormData, niveisState]);

  if (!isOpen) return null;

  // Ações da Aba Níveis
  const handleStartAdd = () => {
    if (nivelEmEdicaoId !== null) {
      const nivelAtual = niveisState.find((n) => n.id === nivelEmEdicaoId);
      if (nivelAtual) {
        const nomeAlterado = formEdicao.nome.trim() !== (nivelAtual.nome || '').trim();
        const ordemAlterada = Number(formEdicao.nivel_ordem) !== Number(nivelAtual.nivel_ordem ?? nivelAtual.ordem_hierarquica ?? 0);
        const corAtual = (nivelAtual.cor_identificador || nivelAtual.cor_hex || '#0E284E').toUpperCase();
        const corForm = (formEdicao.cor_hex || '#0E284E').toUpperCase();
        if (nomeAlterado || ordemAlterada || (corAtual !== corForm)) {
          Swal.fire({
            title: 'Descartar alterações?',
            text: 'Existem alterações não salvas no nível em edição. Deseja descartar?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E11D48',
            cancelButtonColor: '#64748B',
            confirmButtonText: 'Sim, descartar',
            cancelButtonText: 'Continuar editando',
            reverseButtons: true
          }).then((result) => {
            if (result.isConfirmed) {
              abrirNovoNivel();
            }
          });
          return;
        }
      }
    }
    abrirNovoNivel();
  };

  const abrirNovoNivel = () => {
    const nextOrder = Math.max(0, ...niveisState.map((n) => Number(n.nivel_ordem ?? n.ordem_hierarquica ?? 0))) + 1;
    setTempFormData({
      nome: '',
      slug: `nivel_${Date.now()}`,
      nivel_ordem: nextOrder,
      classe_css: 'jhe-level-diretoria',
      cor_hex: '#0E284E'
    });
    setNivelEmEdicaoId(null);
    setIsAddingNivel(true);
  };

  const iniciarEdicao = (nivel) => {
    if (nivelEmEdicaoId !== null && nivelEmEdicaoId !== nivel.id) {
      const nivelAtual = niveisState.find((n) => n.id === nivelEmEdicaoId);
      if (nivelAtual) {
        const nomeAlterado = formEdicao.nome.trim() !== (nivelAtual.nome || '').trim();
        const ordemAlterada = Number(formEdicao.nivel_ordem) !== Number(nivelAtual.nivel_ordem ?? nivelAtual.ordem_hierarquica ?? 0);
        const corAtual = (nivelAtual.cor_identificador || nivelAtual.cor_hex || '#0E284E').toUpperCase();
        const corForm = (formEdicao.cor_hex || '#0E284E').toUpperCase();
        if (nomeAlterado || ordemAlterada || (corAtual !== corForm)) {
          Swal.fire({
            title: 'Descartar alterações?',
            text: 'Existem alterações não salvas no nível em edição. Deseja descartá-las?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E11D48',
            cancelButtonColor: '#64748B',
            confirmButtonText: 'Sim, descartar',
            cancelButtonText: 'Continuar editando',
            reverseButtons: true
          }).then((result) => {
            if (result.isConfirmed) {
              ativarEdicao(nivel);
            }
          });
          return;
        }
      }
    }
    ativarEdicao(nivel);
  };

  const ativarEdicao = (nivel) => {
    setIsAddingNivel(false);
    setNivelEmEdicaoId(nivel.id);
    setFormEdicao({
      nome: nivel.nome || '',
      nivel_ordem: nivel.nivel_ordem ?? nivel.ordem_hierarquica ?? 0,
      cor_hex: nivel.cor_identificador || nivel.cor_hex || '#0E284E'
    });
  };

  const salvarEdicaoInline = (id) => {
    if (!formEdicao.nome.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nome obrigatório',
        text: 'Por favor, informe o nome do nível hierárquico.',
        confirmButtonColor: '#0E284E'
      });
      return;
    }

    const corAtualizada = formEdicao.cor_hex || '#0E284E';
    const nextNiveis = niveisState.map((item) =>
      item.id === id
        ? {
          ...item,
          nome: formEdicao.nome.trim(),
          nivel_ordem: Number(formEdicao.nivel_ordem),
          ordem_hierarquica: Number(formEdicao.nivel_ordem),
          cor_identificador: corAtualizada,
          cor_hex: corAtualizada
        }
        : item
    );

    setNiveisState(nextNiveis);
    setNivelEmEdicaoId(null);
    setHasChanges(true);

    if (onSaveNiveis) {
      onSaveNiveis(nextNiveis);
    }
  };

  const handleSaveNovoNivel = () => {
    if (!tempFormData.nome.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nome obrigatório',
        text: 'Por favor, informe o nome do nível hierárquico.',
        confirmButtonColor: '#0E284E'
      });
      return;
    }

    const novoId = Math.max(0, ...niveisState.map((n) => Number(n.id))) + 1;
    const corAtualizada = tempFormData.cor_hex || '#0E284E';
    const novoNivel = {
      id: novoId,
      ...tempFormData,
      nome: tempFormData.nome.trim(),
      nivel_ordem: Number(tempFormData.nivel_ordem),
      ordem_hierarquica: Number(tempFormData.nivel_ordem),
      cor_identificador: corAtualizada,
      cor_hex: corAtualizada,
      slug: tempFormData.slug || `nivel_${novoId}`
    };
    const nextNiveis = [...niveisState, novoNivel];
    setNiveisState(nextNiveis);
    setIsAddingNivel(false);
    setHasChanges(true);

    if (onSaveNiveis) {
      onSaveNiveis(nextNiveis);
    }
  };

  const handleDeleteNivel = (id, nome) => {
    // Validação se há nós vinculados
    const nosVinculados = allNodes.filter(
      (n) => Number(n.nivel_id) === Number(id) || n.nivel_slug === niveisState.find((x) => x.id === id)?.slug
    );

    if (nosVinculados.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Remoção Bloqueada',
        html: `Não é possível remover o nível <strong>"${nome}"</strong> pois existem <strong>${nosVinculados.length} áreas ou cargos vinculados</strong> no organograma.`,
        confirmButtonColor: '#0E284E'
      });
      return;
    }

    Swal.fire({
      title: 'Remover Nível?',
      text: `Deseja realmente excluir o nível "${nome}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Sim, remover',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        setNiveisState((prev) => prev.filter((item) => item.id !== id));
        setHasChanges(true);
      }
    });
  };

  const handleSaveAll = () => {
    if (onSaveNiveis) {
      onSaveNiveis(niveisState);
    }
    setHasChanges(false);
    Swal.fire({
      icon: 'success',
      title: 'Alterações Salvas!',
      text: 'Os níveis hierárquicos foram atualizados com sucesso.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-5xl h-[85vh] max-h-[800px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl flex overflow-hidden relative"
      >
        {/* Botão X de Fechar com Dirty Check */}
        <button
          type="button"
          onClick={handleModalClose}
          className="absolute top-5 right-5 z-20 w-8 h-8 rounded-xl bg-slate-100/80 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#0E284E] cursor-pointer"
          aria-label="Fechar configurações"
          title="Fechar (Esc)"
        >
          <X size={18} />
        </button>

        {/* 1. Sidebar Lateral de Navegação (Esquerda, ~240px) */}
        <aside className="w-60 bg-slate-50/70 dark:bg-slate-950/40 border-r border-slate-100 dark:border-slate-800 p-5 flex flex-col justify-between shrink-0">
          <div>
            <div className="px-3 mb-4">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                CONFIGURAÇÕES
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Painel do Sistema
              </h3>
            </div>

            {/* Lista de Abas */}
            <nav className="space-y-1.5" aria-label="Abas de configuração">
              <button
                type="button"
                onClick={() => setActiveTab('niveis')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${activeTab === 'niveis'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 font-medium'
                  }`}
              >
                <Layers size={16} className={activeTab === 'niveis' ? 'text-[#0E284E] dark:text-[#61CBE8]' : 'text-slate-400'} />
                <span>Níveis Hierárquicos</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('governanca')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${activeTab === 'governanca'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 font-medium'
                  }`}
              >
                <ShieldAlert size={16} className={activeTab === 'governanca' ? 'text-[#0E284E] dark:text-[#61CBE8]' : 'text-slate-400'} />
                <span>Governança & Regras</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('aparencia')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${activeTab === 'aparencia'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 font-medium'
                  }`}
              >
                <Palette size={16} className={activeTab === 'aparencia' ? 'text-[#0E284E] dark:text-[#61CBE8]' : 'text-slate-400'} />
                <span>Aparência & Identidade</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${activeTab === 'info'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 font-medium'
                  }`}
              >
                <Info size={16} className={activeTab === 'info' ? 'text-[#0E284E] dark:text-[#61CBE8]' : 'text-slate-400'} />
                <span>Informações do Sistema</span>
              </button>
            </nav>
          </div>

          <div className="px-3 text-[11px] text-slate-400">
            JHE Organograma v2.0
          </div>
        </aside>

        {/* 2. Painel de Conteúdo Principal (Direita, flex-1) */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Aba 1: Níveis Hierárquicos */}
          {activeTab === 'niveis' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Topo da Aba */}
              <div className="p-8 pb-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 pr-14">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Níveis Hierárquicos
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    Gerencie as camadas estruturais da JHE, suas cores identificadoras e ordenação no organograma.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="bg-[#0E284E] hover:bg-[#194775] text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0 mr-2"
                >
                  <Plus size={15} />
                  <span>Adicionar Nível</span>
                </button>
              </div>

              {/* Lista e Área Rolável */}
              <div className="flex-1 overflow-y-auto p-8 space-y-3">
                {/* Form Inline de Inclusão no Topo */}
                {isAddingNivel && (
                  <div className="bg-sky-50/70 dark:bg-sky-950/30 border-2 border-[#0E284E]/40 dark:border-sky-500/50 rounded-2xl p-4 space-y-3 mb-4 shadow-sm animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-sky-100 dark:border-sky-900/50 pb-2">
                      <span className="text-xs font-bold text-[#0E284E] dark:text-sky-300">
                        Novo Nível Hierárquico
                      </span>
                      <button
                        type="button"
                        onClick={cancelarAdicao}
                        title="Descartar"
                        aria-label="Fechar inclusão"
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                          Nome do Nível <span className="text-rose-600 font-extrabold ml-0.5">*</span>
                        </label>
                        <input
                          type="text"
                          value={tempFormData.nome}
                          onChange={(e) => setTempFormData((prev) => ({ ...prev, nome: e.target.value }))}
                          placeholder="Ex: Superintendência"
                          autoFocus
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0E284E]/30 dark:focus:ring-sky-500/40 font-medium"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                            Ordem / Peso
                          </label>
                          <div className="relative group">
                            <HelpCircle
                              size={13}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-help"
                            />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 p-2.5 bg-slate-900 text-white text-[10px] leading-relaxed rounded-xl shadow-xl z-50 pointer-events-none">
                              Define a profundidade na árvore institucional: 0 representa a Presidência/Co-CEOs (topo da governança), 1 para Órgãos de Apoio/Assessorias imediatas, 2 para Diretorias Executivas, 3 para Coordenações/Gerências e assim por diante. Essa ordem orienta o fluxo de expansão gradual do organograma.
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            </div>
                          </div>
                        </div>
                        <input
                          type="number"
                          value={tempFormData.nivel_ordem}
                          onChange={(e) => setTempFormData((prev) => ({ ...prev, nivel_ordem: Number(e.target.value) }))}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0E284E]/30 dark:focus:ring-sky-500/40 font-medium"
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Ex: 0 = Topo, 1 = Subordinados imediatos, 2 = Gestão tática
                        </span>
                      </div>

                      <div>
                        <ColorPickerSection
                          selectedHex={tempFormData.cor_hex}
                          onSelectHex={(hex) => setTempFormData((prev) => ({ ...prev, cor_hex: hex }))}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-sky-100 dark:border-sky-900/50">
                      <button
                        type="button"
                        onClick={cancelarAdicao}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNovoNivel}
                        className="bg-[#0E284E] text-white px-4 py-1.5 rounded-xl text-xs font-semibold hover:bg-[#194775] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Plus size={14} />
                        <span>Adicionar à Lista</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de Níveis em Cards com Accordion Inline */}
                <div className="space-y-2.5">
                  {niveisState.map((nivel) =>
                    nivel.id === nivelEmEdicaoId ? (
                      /* Card Expandido em Modo de Edição Inline */
                      <div
                        key={nivel.id}
                        className="bg-sky-50/70 dark:bg-sky-950/30 border-2 border-[#0E284E]/40 dark:border-sky-500/50 rounded-2xl p-4 shadow-md transition-all duration-200 animate-in fade-in zoom-in-[0.99] space-y-3"
                      >
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-sky-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: formEdicao.cor_hex }}
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              Editando Nível: {nivel.nome}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                              ID #{nivel.id}
                            </span>
                          </div>

                          {/* Apenas o botão com ícone '✕' no topo */}
                          <button
                            type="button"
                            onClick={cancelarEdicao}
                            title="Descartar alterações"
                            aria-label="Fechar edição"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                              Nome do Nível <span className="text-rose-600 font-extrabold ml-0.5">*</span>
                            </label>
                            <input
                              type="text"
                              value={formEdicao.nome}
                              onChange={(e) => setFormEdicao((prev) => ({ ...prev, nome: e.target.value }))}
                              placeholder="Ex: Superintendência"
                              autoFocus
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0E284E]/30 dark:focus:ring-sky-500/40 font-medium"
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                                Ordem / Peso
                              </label>
                              <div className="relative group">
                                <HelpCircle
                                  size={13}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-help"
                                />
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 p-2.5 bg-slate-900 text-white text-[10px] leading-relaxed rounded-xl shadow-xl z-50 pointer-events-none">
                                  Define a profundidade na árvore institucional: 0 representa a Presidência/Co-CEOs (topo), 1 para Órgãos de Apoio/Assessorias, 2 para Diretorias Executivas, 3 para Coordenações/Gerências, etc.
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                </div>
                              </div>
                            </div>
                            <input
                              type="number"
                              value={formEdicao.nivel_ordem}
                              onChange={(e) => setFormEdicao((prev) => ({ ...prev, nivel_ordem: Number(e.target.value) }))}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0E284E]/30 dark:focus:ring-sky-500/40 font-medium"
                            />
                            <span className="text-[10px] text-slate-400 block mt-1">
                              0 = Topo, 1 = Imediato, 2 = Gestão...
                            </span>
                          </div>

                          <div>
                            <ColorPickerSection
                              selectedHex={formEdicao.cor_hex}
                              onSelectHex={(hex) => setFormEdicao((prev) => ({ ...prev, cor_hex: hex }))}
                            />
                          </div>
                        </div>

                        {/* Rodapé com Ações Claras */}
                        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-sky-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={cancelarEdicao}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => salvarEdicaoInline(nivel.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0E284E] hover:bg-[#194775] dark:bg-sky-600 dark:hover:bg-sky-500 rounded-xl shadow-xs transition-colors cursor-pointer"
                          >
                            <Check size={14} />
                            <span>Salvar Alterações</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Card Normal de Exibição */
                      <div
                        key={nivel.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: nivel.cor_hex || nivel.cor_identificador || '#0E284E' }}
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <span>{nivel.nome}</span>
                              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                Peso {nivel.nivel_ordem ?? nivel.ordem_hierarquica ?? 0}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Slug: {nivel.slug || '—'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => iniciarEdicao(nivel)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Editar Nível"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNivel(nivel.id, nivel.nome)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            title="Excluir Nível"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Rodapé Fixo de Ações da Aba */}
              {hasChanges && (
                <div className="p-4 px-8 bg-amber-50/80 dark:bg-amber-950/20 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between">
                  <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                    Existem alterações não salvas na estrutura de níveis.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNiveisState(JSON.parse(JSON.stringify(niveis)));
                        setHasChanges(false);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw size={13} />
                      Descartar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAll}
                      className="bg-[#0E284E] text-white px-4 py-1.5 rounded-xl text-xs font-semibold hover:bg-[#194775] transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Save size={14} />
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aba 2: Governança & Regras */}
          {activeTab === 'governanca' && (
            <div className="p-8 space-y-6 flex-1 overflow-y-auto">
              <GovernancaRegrasTab />
            </div>
          )}

          {/* Aba 3: Aparência & Identidade */}
          {activeTab === 'aparencia' && <AparenciaIdentidadeTab />}

          {/* Aba 4: Informações do Sistema */}
          {activeTab === 'info' && (
            <div className="p-8 space-y-6 flex-1 overflow-y-auto">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Informações do Sistema
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Metadados do ambiente de execução, versão de homologação e ciclo de deploy.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-3.5 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-400">Versão da Aplicação:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                    Build 2.0.4 (Release Governança)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar size={13} className="text-sky-500" />
                    Última Atualização Sistêmica:
                  </span>
                  <span className="font-semibold text-[#0E284E] dark:text-sky-400">
                    Build 2.0.4 — 05/11/2026, 21:30
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-400">Frontend Stack:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    React 19 + Tailwind CSS v4 + D3.js Org Chart
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-400">Backend API:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Node.js Express 5 + MySQL 8 (InnoDB)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-400">Total de Nós Ativos:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                    {allNodes.length} setores estruturados
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
