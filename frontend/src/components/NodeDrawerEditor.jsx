import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  Save,
  Trash2,
  ChevronDown,
  Search,
  Check,
  Mail,
  Phone,
  AlertCircle,
  Eye,
  PlusCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../services/api';
import GestorMultiSelect from './GestorMultiSelect';
import MultiResponsavelInput, {
  parseResponsaveis,
  formatResponsaveisText,
  getInitials,
  isPlaceholderResponsavel
} from './MultiResponsavelInput';

/**
 * Metadados e subtítulos executivos dos 10 níveis institucionais da JHE Engenharia
 */
const LEVEL_SUBTITLES = {
  ceo: 'Direção Executiva',
  staff: 'Assessoria & Planejamento',
  oia: 'Órgão de Inspeção & Auditoria',
  diretoria: 'Direção Estratégica',
  coordenacao: 'Gestão Operacional & Tática',
  gerencia: 'Gestão de Unidade',
  unidade: 'Operação & Projetos',
  apoio: 'Suporte Operacional',
  equipe: 'Execução Técnica',
  contrato: 'Prestação de Serviços'
};

/**
 * Extrai até 2 iniciais com segurança a partir de Array, String, Objeto ou nulo/indefinido.
 * Fallback padrão: "JH".
 */
export function getIniciais(val) {
  if (!val) return 'JH';

  let rawStr = '';
  if (Array.isArray(val)) {
    const firstValid = val.find((item) =>
      typeof item === 'string' ? item.trim().length > 0 : Boolean(item?.nome)
    );
    rawStr = typeof firstValid === 'string' ? firstValid : firstValid?.nome || '';
  } else if (typeof val === 'object') {
    rawStr = val.nome || val.titulo || '';
  } else if (typeof val === 'string') {
    rawStr = val;
  } else {
    rawStr = String(val);
  }

  const clean = rawStr.trim();
  if (!clean) return 'JH';

  const parts = clean.split(/[\s.&,]+/).filter(Boolean);
  if (parts.length === 0) return 'JH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Aplica máscara brasileira de telefone automaticamente:
 * - Fixo (10 dígitos): (11) 9999-9999
 * - Celular (11 dígitos): (11) 99999-9999
 */
export function formatPhone(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Coleta todos os IDs bloqueados (o próprio nó e todos os seus descendentes)
 * para evitar loops infinitos na escolha da Área Superior Imediata (Pai).
 */
function collectDisabledParentIds(editingNodeId, allNodes = []) {
  if (!editingNodeId) return new Set();
  const blocked = new Set([String(editingNodeId)]);
  let changed = true;
  while (changed) {
    changed = false;
    allNodes.forEach((n) => {
      if (
        n.parent_id !== null &&
        n.parent_id !== undefined &&
        blocked.has(String(n.parent_id)) &&
        !blocked.has(String(n.id))
      ) {
        blocked.add(String(n.id));
        changed = true;
      }
    });
  }
  return blocked;
}

/**
 * Monta as opções hierárquicas da árvore com recuo visual e setas (↳)
 * de acordo com a profundidade (depth-0 a depth-5).
 */
function buildFormattedTreeOptions(allNodes = []) {
  const map = new Map();
  allNodes.forEach((n) => {
    map.set(String(n.id), { ...n, children: [] });
  });

  const roots = [];
  map.forEach((node) => {
    const pId =
      node.parent_id !== null && node.parent_id !== undefined && node.parent_id !== ''
        ? String(node.parent_id)
        : null;
    if (pId && map.has(pId)) {
      map.get(pId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortList = (list) => {
    list.sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0) || Number(a.id) - Number(b.id));
    list.forEach((c) => sortList(c.children));
  };
  sortList(roots);

  const flatOptions = [];
  const walk = (nodes, depth = 0) => {
    nodes.forEach((n) => {
      const clampedDepth = Math.min(depth, 5);
      flatOptions.push({
        id: n.id,
        titulo: n.titulo,
        sigla: n.sigla,
        nivel_nome: n.nivel_nome || n.nivel_slug,
        nivel_slug: n.nivel_slug || 'diretoria',
        depth: clampedDepth,
        depthClass: `depth-${clampedDepth}`
      });
      if (n.children.length > 0) {
        walk(n.children, depth + 1);
      }
    });
  };
  walk(roots, 0);
  return flatOptions;
}

export default function NodeDrawerEditor({
  noSelecionado,
  niveis = [],
  nos = [],
  onClose,
  onSave,
  onDelete
}) {
  const isCreateMode = Boolean(noSelecionado && !noSelecionado.id);
  const isRootNode = !isCreateMode && (
    String(noSelecionado?.id) === '1' ||
    noSelecionado?.parent_id === null ||
    noSelecionado?.parent_id === undefined ||
    String(noSelecionado?.parent_id) === '0'
  );

  // Localiza o ID padrão do nível "Equipe" (ou 9 / 7 conforme catálogo)
  const defaultEquipeLevelId = useMemo(() => {
    const eq = niveis.find((n) => n.slug === 'equipe');
    return eq ? eq.id : 7;
  }, [niveis]);

  const [formData, setFormData] = useState({
    titulo: '',
    nivel_id: 7,
    parent_id: null,
    responsavel: [],
    email_contato: '',
    telefone: '',
    descricao: '',
    sigla: '',
    ordem: 1
  });

  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Estados para o GestorMultiSelect dinâmico (alimentado via GET /api/usuarios)
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);
  const [gestoresSelecionados, setGestoresSelecionados] = useState([]);

  // Estados dos Comboboxes Customizados (Nível Hierárquico e Área Superior em Árvore)
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [levelSearch, setLevelSearch] = useState('');
  const [isParentOpen, setIsParentOpen] = useState(false);
  const [parentSearch, setParentSearch] = useState('');

  const levelDropdownRef = useRef(null);
  const parentDropdownRef = useRef(null);

  // Busca lista de colaboradores ativos diretamente da API MySQL
  useEffect(() => {
    let isMounted = true;
    async function carregarUsuarios() {
      try {
        setCarregandoUsuarios(true);
        const { data } = await api.get('/usuarios');
        if (isMounted && Array.isArray(data)) {
          const ativos = data
            .filter((u) => u.ativo === 1 || u.ativo === true)
            .map((u) => ({
              id: u.id,
              nome: u.nome,
              email: u.email,
              cargo: u.cargo || u.cargo_especialidade || '',
              cargo_especialidade: u.cargo_especialidade || u.cargo || '',
              role_global: u.role_global || 'colaborador',
              ativo: u.ativo
            }));
          setUsuariosDisponiveis(ativos);
        }
      } catch (err) {
        console.warn('Erro ao carregar lista de usuários para GestorMultiSelect:', err.message);
      } finally {
        if (isMounted) setCarregandoUsuarios(false);
      }
    }
    carregarUsuarios();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sincroniza formData e gestoresSelecionados quando noSelecionado abre
  useEffect(() => {
    if (!noSelecionado) return;

    // Normaliza responsavel: se vier Array mantém intacto; se vier String divide via .split(/ & |,/); se nulo vira []
    let initialResponsaveis = [];
    if (Array.isArray(noSelecionado.responsavel)) {
      initialResponsaveis = noSelecionado.responsavel
        .map((r) => (typeof r === 'string' ? r.trim() : r?.nome?.trim() || ''))
        .filter(Boolean);
    } else if (typeof noSelecionado.responsavel === 'string' && noSelecionado.responsavel.trim()) {
      initialResponsaveis = noSelecionado.responsavel
        .split(/ & |,/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (Array.isArray(noSelecionado.lideres_secundarios)) {
      noSelecionado.lideres_secundarios.forEach((sec) => {
        const secNome = typeof sec === 'string' ? sec.trim() : sec?.nome?.trim();
        if (secNome && !initialResponsaveis.includes(secNome)) {
          initialResponsaveis.push(secNome);
        }
      });
    }

    // Filtra strings de placeholder
    initialResponsaveis = initialResponsaveis.filter((nome) => !isPlaceholderResponsavel(nome));

    // Mapeia para objetos de gestores selecionados a partir de usuariosDisponiveis
    const gestoresIniciais = [];

    // 1. Adiciona a partir de membros_equipe caso existam vínculos diretos na tabela relacional
    if (Array.isArray(noSelecionado.membros_equipe) && noSelecionado.membros_equipe.length > 0) {
      noSelecionado.membros_equipe.forEach((m) => {
        const match = usuariosDisponiveis.find((u) => Number(u.id) === Number(m.id || m.usuario_id));
        if (match && !gestoresIniciais.some((g) => Number(g.id) === Number(match.id))) {
          gestoresIniciais.push(match);
        }
      });
    }

    // 2. Mapeia a partir de initialResponsaveis por nome
    initialResponsaveis.forEach((nome) => {
      const match = usuariosDisponiveis.find(
        (u) => u.nome.trim().toLowerCase() === nome.trim().toLowerCase()
      );
      if (match) {
        if (!gestoresIniciais.some((g) => Number(g.id) === Number(match.id))) {
          gestoresIniciais.push(match);
        }
      } else {
        if (!gestoresIniciais.some((g) => g.nome.trim().toLowerCase() === nome.trim().toLowerCase())) {
          gestoresIniciais.push({
            id: `legacy-${nome}`,
            nome,
            cargo: 'Titular / Gestor',
            cargo_especialidade: 'Titular / Gestor',
            email: '',
            role_global: 'gestor'
          });
        }
      }
    });

    setGestoresSelecionados(gestoresIniciais);

    const initial = {
      titulo: noSelecionado.titulo || '',
      nivel_id: noSelecionado.nivel_id || defaultEquipeLevelId,
      parent_id:
        noSelecionado.parent_id !== undefined && noSelecionado.parent_id !== ''
          ? noSelecionado.parent_id
          : null,
      responsavel: initialResponsaveis,
      email_contato: noSelecionado.email_contato || noSelecionado.email || '',
      telefone: formatPhone(noSelecionado.telefone || ''),
      descricao: noSelecionado.descricao || '',
      sigla: noSelecionado.sigla || '',
      ordem: noSelecionado.ordem ?? 1
    };

    setFormData(initial);
    setInitialSnapshot(JSON.stringify(initial));
    setValidationError('');
    setIsLevelOpen(false);
    setIsParentOpen(false);
    setLevelSearch('');
    setParentSearch('');
  }, [noSelecionado, defaultEquipeLevelId, usuariosDisponiveis]);

  // Verifica se o formulário foi alterado pelo usuário (isDirty)
  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return JSON.stringify(formData) !== initialSnapshot;
  }, [formData, initialSnapshot]);

  // Proteção contra fechamento acidental (handleSafeClose)
  const handleSafeClose = useCallback(async () => {
    if (isDirty) {
      const result = await Swal.fire({
        title: 'Descartar alterações?',
        text: 'Você preencheu informações neste formulário que ainda não foram salvas.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#E11D48',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Sim, descartar',
        cancelButtonText: 'Continuar editando'
      });
      if (!result.isConfirmed) return;
    }
    onClose?.();
  }, [isDirty, onClose]);

  // Fecha comboboxes ao clicar fora e suporta tecla Esc para fechar o Drawer com segurança
  useEffect(() => {
    if (!noSelecionado) return;

    const handleClickOutside = (e) => {
      if (levelDropdownRef.current && !levelDropdownRef.current.contains(e.target)) {
        setIsLevelOpen(false);
      }
      if (parentDropdownRef.current && !parentDropdownRef.current.contains(e.target)) {
        setIsParentOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isLevelOpen) {
          setIsLevelOpen(false);
        } else if (isParentOpen) {
          setIsParentOpen(false);
        } else {
          handleSafeClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [noSelecionado, isLevelOpen, isParentOpen, handleSafeClose]);

  // Opções filtradas do Select 2: Nível Hierárquico
  const filteredLevels = useMemo(() => {
    const q = levelSearch.trim().toLowerCase();
    if (!q) return niveis;
    return niveis.filter(
      (n) =>
        n.nome?.toLowerCase().includes(q) ||
        n.slug?.toLowerCase().includes(q) ||
        (LEVEL_SUBTITLES[n.slug] || '').toLowerCase().includes(q)
    );
  }, [niveis, levelSearch]);

  // Opções hierárquicas e IDs desabilitados do Select 3: Área Superior Imediata (Pai)
  const formattedTreeOptions = useMemo(() => buildFormattedTreeOptions(nos), [nos]);
  const disabledParentIds = useMemo(
    () => collectDisabledParentIds(noSelecionado?.id, nos),
    [noSelecionado?.id, nos]
  );

  const filteredTreeOptions = useMemo(() => {
    const q = parentSearch.trim().toLowerCase();
    if (!q) return formattedTreeOptions;
    return formattedTreeOptions.filter(
      (opt) =>
        opt.titulo?.toLowerCase().includes(q) ||
        opt.nivel_nome?.toLowerCase().includes(q) ||
        opt.sigla?.toLowerCase().includes(q)
    );
  }, [formattedTreeOptions, parentSearch]);

  if (!noSelecionado) return null;

  const selectedLevelObj =
    niveis.find((n) => Number(n.id) === Number(formData.nivel_id)) ||
    niveis.find((n) => n.slug === 'equipe') ||
    niveis[0];

  const selectedParentObj =
    formData.parent_id !== null && formData.parent_id !== ''
      ? nos.find((n) => String(n.id) === String(formData.parent_id))
      : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tituloTrim = formData.titulo.trim();

    if (!tituloTrim) {
      setValidationError('O Nome da Área é um campo obrigatório.');
      return;
    }

    if (!isRootNode && (!formData.parent_id || String(formData.parent_id).trim() === '' || String(formData.parent_id) === '0')) {
      setValidationError('A Área Superior Imediata (Pai) é um campo obrigatório.');
      return;
    }

    setValidationError('');

    const nomesGestores = gestoresSelecionados.map((g) => g.nome.trim()).filter(Boolean);
    const responsavelFormatted = nomesGestores.length > 0 ? formatResponsaveisText(nomesGestores) : null;

    const cotitulares = gestoresSelecionados.slice(1).map((g) => ({
      usuario_id: typeof g.id === 'number' ? g.id : null,
      nome: g.nome,
      iniciais: getIniciais(g.nome),
      cargo: g.cargo || g.cargo_especialidade || 'Co-Titular',
      cor_avatar: '#B4783C'
    }));

    const cargosList = gestoresSelecionados
      .map((g) => g.cargo || g.cargo_especialidade)
      .filter(Boolean);
    const cargoConsolidado = cargosList.length > 0 ? cargosList.join(' & ') : null;

    const gestoresIds = gestoresSelecionados
      .map((g) => g.id)
      .filter((id) => typeof id === 'number');

    const payload = {
      ...noSelecionado,
      titulo: tituloTrim,
      nivel_id: Number(formData.nivel_id),
      parent_id:
        formData.parent_id === null || formData.parent_id === ''
          ? null
          : Number(formData.parent_id),
      responsavel: responsavelFormatted === 'Titular a definir' ? null : responsavelFormatted,
      cargo_responsavel: cargoConsolidado,
      gestores_ids: gestoresIds,
      lideres_secundarios: cotitulares,
      email: formData.email_contato.trim() || null,
      email_contato: formData.email_contato.trim() || null,
      telefone: formData.telefone.trim() || null,
      descricao: formData.descricao.trim() || null,
      sigla: formData.sigla?.trim() || null,
      ordem: Number(formData.ordem) || 1
    };

    await onSave(payload);

    Swal.fire({
      toast: true,
      position: 'bottom-end',
      icon: 'success',
      title: isCreateMode
        ? `Área '${tituloTrim}' criada com sucesso!`
        : `Área '${tituloTrim}' atualizada com sucesso!`,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  };

  const previewInitials = getIniciais(
    Array.isArray(formData.responsavel) && formData.responsavel.length > 0
      ? formData.responsavel
      : formData.responsavel || formData.titulo || 'JH'
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[2px] transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleSafeClose();
      }}
    >
      <aside
        className="w-full max-w-[460px] h-full shadow-2xl border-l flex flex-col justify-between overflow-hidden transition-colors"
        style={{
          backgroundColor: 'var(--jhe-surface-card)',
          borderColor: 'var(--jhe-border-subtle)',
          color: 'var(--jhe-text-main)'
        }}
      >
        {/* Cabeçalho do Drawer */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: 'var(--jhe-border-subtle)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className={`slug-badge slug-badge-${selectedLevelObj?.slug || 'equipe'}`}>
                {selectedLevelObj?.nome || 'Equipe'}
              </span>
              <span className="text-[11px] font-medium" style={{ color: 'var(--jhe-text-muted)' }}>
                {isCreateMode ? 'Modo de Criação' : `ID #${noSelecionado.id}`}
              </span>
            </div>
            <h2 className="text-base font-bold mt-1">
              {isCreateMode ? 'Adicionar Nova Área / Setor' : `Editar: ${noSelecionado.titulo}`}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleSafeClose}
            className="p-2 rounded-xl hover:bg-slate-500/10 transition cursor-pointer"
            title="Fechar painel (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo Scrollável com os 7 Campos e o Preview ao Vivo */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto p-6 space-y-4">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{validationError}</span>
            </div>
          )}

          {/* CAMPO 1: Nome da Área — Campo de Texto Obrigatório */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              1. Nome da Área <span className="text-rose-600 font-extrabold ml-0.5">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.titulo}
              onChange={(e) => {
                setFormData({ ...formData, titulo: e.target.value });
                if (validationError) setValidationError('');
              }}
              placeholder="ex: SGI, Planejamento Estratégico, Desenvolvimento"
              className="w-full px-3.5 py-2 rounded-xl text-xs border bg-transparent focus:outline-none focus:ring-2 focus:ring-[#61CBE8]/40 transition"
              style={{ borderColor: 'var(--jhe-border-subtle)', color: 'var(--jhe-text-main)' }}
            />
          </div>

          {/* Campo Sigla / Código da Unidade */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Sigla / Código da Unidade (Opcional)
              </label>
              <span className="text-[10px] text-slate-400">Ex: DIR-ENG, OIA, CT-042</span>
            </div>
            <input
              type="text"
              maxLength={15}
              value={formData.sigla || ''}
              onChange={(e) => setFormData({ ...formData, sigla: e.target.value.toUpperCase() })}
              placeholder="Deixe em branco caso não queira exibir sigla"
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 uppercase font-medium focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
            />
          </div>

          {/* CAMPO 2: Nível Hierárquico — Select Customizado com Busca (Combobox) */}
          <div ref={levelDropdownRef} className="jhe-combobox-container relative">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              2. Nível Hierárquico <span className="text-rose-600 font-extrabold ml-0.5">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setIsLevelOpen((prev) => !prev);
                setIsParentOpen(false);
              }}
              className="w-full px-3.5 py-2 rounded-xl text-xs border flex items-center justify-between gap-2 bg-transparent hover:border-slate-400 transition cursor-pointer"
              style={{ borderColor: 'var(--jhe-border-subtle)', color: 'var(--jhe-text-main)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 slug-badge-${
                    selectedLevelObj?.slug || 'equipe'
                  }`}
                />
                <div className="text-left truncate">
                  <span className="font-semibold">{selectedLevelObj?.nome || 'Equipe'}</span>
                  <span className="ml-1.5 opacity-65 text-[11px]">
                    — {LEVEL_SUBTITLES[selectedLevelObj?.slug] || 'Execução Técnica'}
                  </span>
                </div>
              </div>
              <ChevronDown size={15} className="opacity-60 shrink-0" />
            </button>

            {isLevelOpen && (
              <div
                className="absolute left-0 right-0 mt-1.5 rounded-xl shadow-2xl border overflow-hidden z-40"
                style={{
                  backgroundColor: 'var(--jhe-surface-card)',
                  borderColor: 'var(--jhe-border-subtle)'
                }}
              >
                <div className="p-2 border-b" style={{ borderColor: 'var(--jhe-border-subtle)' }}>
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50"
                    />
                    <input
                      type="text"
                      value={levelSearch}
                      onChange={(e) => setLevelSearch(e.target.value)}
                      placeholder="Buscar nível hierárquico..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border bg-transparent focus:outline-none"
                      style={{ borderColor: 'var(--jhe-border-subtle)' }}
                    />
                  </div>
                </div>

                <ul className="max-h-60 overflow-y-auto divide-y" style={{ borderColor: 'var(--jhe-border-subtle)' }}>
                  {filteredLevels.map((nivel) => {
                    const isSelected = Number(nivel.id) === Number(formData.nivel_id);
                    return (
                      <li key={nivel.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, nivel_id: nivel.id });
                            setIsLevelOpen(false);
                            setLevelSearch('');
                          }}
                          className="w-full px-3.5 py-2 text-left flex items-center justify-between gap-2 hover:bg-sky-500/10 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-3 h-3 rounded-full shrink-0 slug-badge-${nivel.slug}`} />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{nivel.nome}</div>
                              <div className="text-[10.5px] truncate" style={{ color: 'var(--jhe-text-muted)' }}>
                                {LEVEL_SUBTITLES[nivel.slug] || 'Nível Institucional JHE'}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check size={14} style={{ color: 'var(--jhe-primary-lighter)' }} />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* CAMPO 3: Área Superior Imediata (Pai) — Select em Árvore (Tree Combobox com Busca) */}
          <div ref={parentDropdownRef} className="jhe-combobox-container relative">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              3. Área Superior Imediata (Pai)
              {!isRootNode && <span className="text-rose-600 font-extrabold ml-0.5">*</span>}
            </label>

            {isRootNode ? (
              <div
                className="w-full h-10 px-3.5 rounded-xl text-xs border flex items-center justify-between opacity-80 cursor-not-allowed select-none bg-slate-100 dark:bg-slate-800/60"
                style={{
                  borderColor: 'var(--jhe-border-subtle)',
                  color: 'var(--jhe-text-muted)'
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Topo da Organização (Nó Raiz / Sem Liderança Superior)
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  Nó Raiz Institucional
                </span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsParentOpen((prev) => !prev);
                    setIsLevelOpen(false);
                  }}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border flex items-center justify-between gap-2 bg-transparent hover:border-slate-400 transition cursor-pointer ${
                    !selectedParentObj ? 'border-dashed' : ''
                  }`}
                  style={{
                    borderColor: !selectedParentObj && validationError ? '#f43f5e' : 'var(--jhe-border-subtle)',
                    color: 'var(--jhe-text-main)'
                  }}
                >
                  <div className="truncate text-left">
                    {selectedParentObj ? (
                      <>
                        <span className="font-semibold">{selectedParentObj.titulo}</span>
                        <span className="ml-1.5 opacity-65 text-[11px]">
                          ({selectedParentObj.nivel_nome || selectedParentObj.sigla})
                        </span>
                      </>
                    ) : (
                      <span className="font-medium text-slate-400">
                        Selecione a área superior imediata...
                      </span>
                    )}
                  </div>
                  <ChevronDown size={15} className="opacity-60 shrink-0" />
                </button>

                {isParentOpen && (
                  <div
                    className="absolute left-0 right-0 mt-1.5 rounded-xl shadow-2xl border overflow-hidden z-40"
                    style={{
                      backgroundColor: 'var(--jhe-surface-card)',
                      borderColor: 'var(--jhe-border-subtle)'
                    }}
                  >
                    <div className="p-2 border-b" style={{ borderColor: 'var(--jhe-border-subtle)' }}>
                      <div className="relative">
                        <Search
                          size={13}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50"
                        />
                        <input
                          type="text"
                          value={parentSearch}
                          onChange={(e) => setParentSearch(e.target.value)}
                          placeholder="Buscar área superior na estrutura..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border bg-transparent focus:outline-none"
                          style={{ borderColor: 'var(--jhe-border-subtle)' }}
                        />
                      </div>
                    </div>

                    <ul className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: 'var(--jhe-border-subtle)' }}>
                      {filteredTreeOptions.length === 0 ? (
                        <li className="px-3 py-3 text-center text-xs text-slate-400">
                          Nenhuma área encontrada.
                        </li>
                      ) : (
                        filteredTreeOptions.map((opt) => {
                          const isDisabled = disabledParentIds.has(String(opt.id));
                          const isSelected = String(formData.parent_id) === String(opt.id);

                          return (
                            <li key={opt.id}>
                              <button
                                type="button"
                                disabled={isDisabled}
                                onClick={() => {
                                  if (isDisabled) return;
                                  setFormData({ ...formData, parent_id: opt.id });
                                  if (validationError) setValidationError('');
                                  setIsParentOpen(false);
                                  setParentSearch('');
                                }}
                                className={`w-full py-2 pr-3.5 text-left flex items-center justify-between gap-2 transition ${
                                  opt.depthClass
                                } ${
                                  isDisabled
                                    ? 'opacity-35 cursor-not-allowed bg-slate-500/5'
                                    : 'hover:bg-sky-500/10 cursor-pointer'
                                }`}
                              >
                                <div className="min-w-0 flex items-center gap-1.5">
                                  {opt.depth > 0 && (
                                    <span className="text-slate-400 font-mono text-xs shrink-0">↳</span>
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold truncate">{opt.titulo}</div>
                                    <div className="text-[10px] truncate" style={{ color: 'var(--jhe-text-muted)' }}>
                                      {opt.nivel_nome}
                                      {isDisabled ? ' • (Bloqueado: próprio nó/descendente)' : ''}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check size={14} style={{ color: 'var(--jhe-primary-lighter)' }} />
                                )}
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          {/* CAMPO 4: Responsável / Gestor — Multi-Select Dinâmico alimentado pelo MySQL (/api/usuarios) */}
          <GestorMultiSelect
            usuariosDisponiveis={usuariosDisponiveis}
            gestoresSelecionados={gestoresSelecionados}
            onChange={(novosGestores) => {
              setGestoresSelecionados(novosGestores);
              setFormData((prev) => ({
                ...prev,
                responsavel: novosGestores.map((g) => g.nome)
              }));
            }}
            isLoading={carregandoUsuarios}
          />

          {/* CAMPO 5 & CAMPO 6: E-mail Institucional & Telefone Institucional com Máscara */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                5. E-mail Institucional
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"
                />
                <input
                  type="email"
                  value={formData.email_contato}
                  onChange={(e) => setFormData({ ...formData, email_contato: e.target.value })}
                  placeholder="ex: setor@jhe.com.br"
                  className="w-full pl-8 pr-3 py-2 rounded-xl text-xs border bg-transparent focus:outline-none focus:ring-2 focus:ring-[#61CBE8]/40 transition"
                  style={{ borderColor: 'var(--jhe-border-subtle)', color: 'var(--jhe-text-main)' }}
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                6. Telefone Institucional
              </label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"
                />
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: formatPhone(e.target.value) })
                  }
                  placeholder="(11) 99999-9999"
                  className="w-full pl-8 pr-3 py-2 rounded-xl text-xs border bg-transparent focus:outline-none focus:ring-2 focus:ring-[#61CBE8]/40 transition"
                  style={{ borderColor: 'var(--jhe-border-subtle)', color: 'var(--jhe-text-main)' }}
                />
              </div>
            </div>
          </div>

          {/* CAMPO 7: Atribuições / Descrição — Caixa de Texto Multilinha (Textarea) */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              7. Atribuições / Descrição
            </label>
            <textarea
              rows={3}
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva as responsabilidades, escopo ou resumo das atividades do setor..."
              className="w-full px-3.5 py-2 rounded-xl text-xs border bg-transparent focus:outline-none focus:ring-2 focus:ring-[#61CBE8]/40 transition"
              style={{ borderColor: 'var(--jhe-border-subtle)', color: 'var(--jhe-text-main)' }}
            />
          </div>

          {/* 4. Card de Pré-visualização em Tempo Real (drawer-preview-box & jhe-live-preview-card) */}
          <div className="drawer-preview-box">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--jhe-text-muted)' }}>
                <Eye size={12} />
                Pré-visualização ao Vivo no Organograma
              </span>
              <span className="text-[10px]" style={{ color: 'var(--jhe-text-muted)' }}>
                {selectedParentObj ? `Subordinado a: ${selectedParentObj.titulo}` : 'Nó Raiz / Topo'}
              </span>
            </div>

            <div
              className={`jhe-live-preview-card jhe-org-card ${
                selectedLevelObj?.classe_css || 'jhe-level-equipe'
              } slug-accent-${selectedLevelObj?.slug || 'equipe'}`}
              style={{
                borderTopColor:
                  selectedLevelObj?.cor_identificador || selectedLevelObj?.cor_hex || undefined
              }}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full slug-badge-${
                      selectedLevelObj?.slug || 'equipe'
                    }`}
                    style={{
                      backgroundColor:
                        selectedLevelObj?.cor_identificador ||
                        selectedLevelObj?.cor_hex ||
                        undefined
                    }}
                  />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider truncate"
                    style={{ color: 'var(--jhe-text-muted)' }}
                  >
                    {formData.sigla?.trim()
                      ? `${formData.sigla.trim()} • ${selectedLevelObj?.nome || 'Equipe'}`
                      : (selectedLevelObj?.nome || 'Equipe')}
                  </span>
                </div>
                <div className="mt-1 text-xs font-semibold leading-snug">
                  {formData.titulo.trim() || 'Nome da Área aparecerá aqui...'}
                </div>
              </div>

              <div
                className="mt-3 pt-2 border-t flex items-center gap-2"
                style={{ borderColor: 'var(--jhe-border-subtle)' }}
              >
                <div className="flex items-center gap-1 shrink-0">
                  {(Array.isArray(formData.responsavel) && formData.responsavel.length > 0
                    ? formData.responsavel
                    : parseResponsaveis(formData.responsavel)
                  ).map((nome, i) => (
                    <span
                      key={i}
                      className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-semibold border border-white dark:border-slate-800 shadow-2xs ${
                        i > 0 ? '-ml-2' : ''
                      }`}
                      style={{
                        backgroundColor: i % 2 === 0 ? 'var(--jhe-avatar-subtle-bg)' : 'rgba(180, 120, 60, 0.16)',
                        color: i % 2 === 0 ? 'var(--jhe-avatar-subtle-text)' : '#B4783C'
                      }}
                      title={nome}
                    >
                      {getIniciais(nome)}
                    </span>
                  ))}
                  {(!formData.responsavel ||
                    (Array.isArray(formData.responsavel) && formData.responsavel.length === 0)) && (
                    <span
                      className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-semibold"
                      style={{
                        backgroundColor: 'var(--jhe-avatar-subtle-bg)',
                        color: 'var(--jhe-avatar-subtle-text)'
                      }}
                    >
                      JH
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium truncate" style={{ color: 'var(--jhe-text-muted)' }}>
                  {formatResponsaveisText(
                    Array.isArray(formData.responsavel)
                      ? formData.responsavel
                      : parseResponsaveis(formData.responsavel)
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Rodapé de Ações */}
          <div
            className="pt-4 border-t flex items-center justify-between gap-2"
            style={{ borderColor: 'var(--jhe-border-subtle)' }}
          >
            {!isCreateMode && noSelecionado.parent_id !== null ? (
              <button
                type="button"
                onClick={() => onDelete(noSelecionado.id)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition"
                style={{
                  backgroundColor: 'rgba(225, 29, 72, 0.1)',
                  color: 'var(--jhe-status-exclusao)'
                }}
              >
                <Trash2 size={14} />
                Excluir
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSafeClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer hover:opacity-80 transition"
                style={{
                  borderColor: 'var(--jhe-border-subtle)',
                  color: 'var(--jhe-text-muted)'
                }}
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer hover:opacity-95 shadow-sm transition"
              style={{ backgroundColor: 'var(--jhe-primary-darker, #0E284E)' }}
            >
              {isCreateMode ? <PlusCircle size={15} /> : <Save size={15} />}
              {isCreateMode ? 'Criar área' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
