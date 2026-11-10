import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  UserPlus,
  Search,
  KeyRound,
  Edit2,
  CheckCircle,
  XCircle,
  Building2,
  Shield,
  Loader2,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../services/api';
import OrganogramaMultiSelect from './OrganogramaMultiSelect';

/**
 * Renderiza o badge de área vinculada com destaque âmbar para a área de triagem transitória
 */
function renderVinculoBadge(v, i, allNodesFlat = []) {
  const noId = typeof v === 'object' ? v.no_id : v;
  const node = allNodesFlat.find((n) => Number(n.id) === Number(noId));
  const sigla = (v?.sigla || v?.no_sigla || node?.sigla || '').toUpperCase();
  const titulo = (v?.titulo || v?.no_titulo || node?.titulo || (noId ? `Nó #${noId}` : '')).trim();

  const isTriagem =
    String(noId) === '999' ||
    sigla === 'PENDENTE' ||
    titulo.toLowerCase().includes('triagem') ||
    titulo.toLowerCase().includes('aguardando alocação');

  if (isTriagem) {
    return (
      <span
        key={i}
        className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-2xs"
        title="Colaborador transitório aguardando alocação definitiva"
      >
        <AlertTriangle size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <span>Pendente de Vínculo</span>
      </span>
    );
  }

  const rotulo = sigla || titulo;

  return (
    <span
      key={i}
      className="bg-sky-50/80 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/50 text-[11px] font-medium px-2.5 py-0.5 rounded-lg truncate max-w-[140px]"
      title={titulo}
    >
      {rotulo}
    </span>
  );
}

const ROLES_INFO = {
  admin: {
    label: 'Administrador',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/50'
  },
  diretor: {
    label: 'Diretor',
    badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/50'
  },
  coordenador: {
    label: 'Coordenador',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/50'
  },
  colaborador: {
    label: 'Colaborador',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/70 dark:border-slate-700'
  }
};

export default function UserManagementModal({ isOpen, onClose, allNodesFlat = [], onUsersUpdated }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroVinculo, setFiltroVinculo] = useState('todos'); // 'todos' | 'pendentes' | 'alocados'
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const modalRef = useRef(null);
  const searchInputRef = useRef(null);

  // Helper para verificar se o usuário é pendente de alocação definitiva ou em triagem
  const verificarSePendente = useCallback(
    (usr) => {
      const vinculos = Array.isArray(usr.vinculos) ? usr.vinculos : [];
      if (vinculos.length === 0) return true;
      return vinculos.some((v) => {
        const noId = typeof v === 'object' ? v.no_id : v;
        const node = allNodesFlat.find((n) => Number(n.id) === Number(noId));
        const sigla = (v?.sigla || v?.no_sigla || node?.sigla || '').toUpperCase();
        const titulo = (v?.titulo || v?.no_titulo || node?.titulo || '').toLowerCase();
        return (
          String(noId) === '999' ||
          sigla === 'PENDENTE' ||
          titulo.includes('triagem') ||
          titulo.includes('aguardando alocação')
        );
      });
    },
    [allNodesFlat]
  );

  // Contadores para as badges das tabs de filtro rápido
  const contadoresVinculo = useMemo(() => {
    let pendentes = 0;
    let alocados = 0;

    usuarios.forEach((u) => {
      if (verificarSePendente(u)) {
        pendentes++;
      } else {
        alocados++;
      }
    });

    return {
      todos: usuarios.length,
      pendentes,
      alocados
    };
  }, [usuarios, verificarSePendente]);

  // Lista filtrada pelo termo de busca e pelo filtro rápido de lotação
  const usuariosFiltrados = useMemo(() => {
    if (filtroVinculo === 'todos') return usuarios;

    return usuarios.filter((u) => {
      const isPendente = verificarSePendente(u);
      if (filtroVinculo === 'pendentes') return isPendente;
      if (filtroVinculo === 'alocados') return !isPendente;
      return true;
    });
  }, [usuarios, filtroVinculo, verificarSePendente]);

  // Estado de ordenação interativa das colunas
  // campo: 'colaborador' | 'perfil' | 'status' | 'areas'
  // direcao: 'asc' | 'desc'
  const [sortConfig, setSortConfig] = useState({ campo: 'colaborador', direcao: 'asc' });

  const alternarOrdenacao = useCallback((campo) => {
    setSortConfig((prev) => {
      if (prev.campo === campo) {
        return { campo, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' };
      }
      return { campo, direcao: 'asc' };
    });
  }, []);

  // Lista ordenada com base em sortConfig
  const usuariosOrdenados = useMemo(() => {
    const lista = [...usuariosFiltrados];
    const { campo, direcao } = sortConfig;
    const mult = direcao === 'asc' ? 1 : -1;

    return lista.sort((a, b) => {
      let res = 0;
      if (campo === 'colaborador') {
        const nomeA = (a.nome || '').trim();
        const nomeB = (b.nome || '').trim();
        res = nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
        if (res === 0) {
          res = (a.email || '').localeCompare(b.email || '', 'pt-BR');
        }
      } else if (campo === 'perfil') {
        const labelA = ROLES_INFO[a.role_global]?.label || a.role_global || '';
        const labelB = ROLES_INFO[b.role_global]?.label || b.role_global || '';
        res = labelA.localeCompare(labelB, 'pt-BR', { sensitivity: 'base' });
      } else if (campo === 'status') {
        // Ativo (1) vs Inativo (0)
        res = (b.ativo ? 1 : 0) - (a.ativo ? 1 : 0);
        if (res === 0) {
          res = (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
        }
      } else if (campo === 'areas') {
        const getFirstArea = (u) => {
          if (!u.vinculos || u.vinculos.length === 0) return '';
          const v = u.vinculos[0];
          const noId = typeof v === 'object' ? v.no_id : v;
          const node = allNodesFlat.find((n) => Number(n.id) === Number(noId));
          return (v?.sigla || v?.no_sigla || node?.sigla || v?.titulo || v?.no_titulo || node?.titulo || '').trim();
        };
        const areaA = getFirstArea(a);
        const areaB = getFirstArea(b);
        res = areaA.localeCompare(areaB, 'pt-BR', { sensitivity: 'base' });
        if (res === 0) {
          const countA = Array.isArray(a.vinculos) ? a.vinculos.length : 0;
          const countB = Array.isArray(b.vinculos) ? b.vinculos.length : 0;
          res = countA - countB;
        }
      }
      return res * mult;
    });
  }, [usuariosFiltrados, sortConfig, allNodesFlat]);

  const [formData, setFormData] = useState({
    id: null,
    nome: '',
    email: '',
    cargo: '',
    role_global: 'colaborador',
    ativo: 1,
    vinculos: []
  });
  const [initialSnapshot, setInitialSnapshot] = useState(null);

  // Verifica se houve alteração nos dados do formulário
  const isDirty = useMemo(() => {
    if (!isEditing || !initialSnapshot) return false;
    try {
      const currentSnapshot = JSON.stringify({
        ...formData,
        vinculos: [...formData.vinculos].sort()
      });
      return currentSnapshot !== initialSnapshot;
    } catch {
      return false;
    }
  }, [isEditing, formData, initialSnapshot]);

  // Função centralizada para fechamento com verificação de dirty state
  const handleAttemptClose = useCallback(async () => {
    if (isDirty) {
      const result = await Swal.fire({
        title: 'Descartar alterações?',
        text: 'Você possui alterações não salvas. Se sair agora, todos os dados editados serão perdidos.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0E284E',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Sim, descartar',
        cancelButtonText: 'Continuar editando'
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    if (isEditing) {
      setIsEditing(false);
      setInitialSnapshot(null);
    } else {
      onClose();
    }
  }, [isDirty, isEditing, onClose]);

  const carregarUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/usuarios', { params: { busca: termoBusca } });
      const lista = Array.isArray(data) ? data : (data?.usuarios || []);
      setUsuarios(lista);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  }, [termoBusca]);

  useEffect(() => {
    if (isOpen) {
      carregarUsuarios();
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, carregarUsuarios]);

  // Acessibilidade WCAG 2.1 AA: Focus Trap e Escape key listener com salvaguarda
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleAttemptClose();
      } else if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleAttemptClose]);

  const handleOpenCreate = () => {
    const initial = {
      id: null,
      nome: '',
      email: '',
      cargo: '',
      role_global: 'colaborador',
      ativo: 1,
      vinculos: []
    };
    setFormData(initial);
    setInitialSnapshot(JSON.stringify({ ...initial, vinculos: [] }));
    setIsEditing(true);
  };

  const handleOpenEdit = (user) => {
    const vinculoIds = Array.isArray(user.vinculos)
      ? user.vinculos.map((v) => (typeof v === 'object' ? v.no_id : v))
      : [];

    const initial = {
      id: user.id,
      nome: user.nome || '',
      email: user.email || '',
      cargo: user.cargo || '',
      role_global: user.role_global || 'colaborador',
      ativo: user.ativo ? 1 : 0,
      vinculos: vinculoIds
    };

    setFormData(initial);
    setInitialSnapshot(
      JSON.stringify({
        ...initial,
        vinculos: [...vinculoIds].sort()
      })
    );
    setIsEditing(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();

    if (!formData.vinculos || formData.vinculos.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Vínculo Obrigatório',
        text: "Selecione ao menos uma área vinculada. Caso o colaborador ainda não possua setor definitivo, selecione 'Aguardando Alocação / Triagem'.",
        confirmButtonColor: '#0E284E'
      });
      return;
    }

    setSaving(true);
    try {
      if (formData.id) {
        await api.put(`/usuarios/${formData.id}`, formData);
        Swal.fire({
          icon: 'success',
          title: 'Usuário atualizado!',
          timer: 1400,
          showConfirmButton: false
        });
      } else {
        await api.post('/usuarios', formData);
        Swal.fire({
          icon: 'success',
          title: 'Usuário cadastrado!',
          text: 'Senha provisória definida: JHE@2026',
          confirmButtonColor: '#0E284E'
        });
      }
      setInitialSnapshot(null);
      setIsEditing(false);
      carregarUsuarios();
      if (onUsersUpdated) {
        onUsersUpdated();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Erro ao salvar',
        text: err.response?.data?.mensagem || 'Falha ao processar solicitação.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const novoStatus = user.ativo ? 0 : 1;
    try {
      await api.patch(`/usuarios/${user.id}/status`, { ativo: novoStatus });
      setUsuarios((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ativo: novoStatus } : u))
      );
      if (onUsersUpdated) {
        onUsersUpdated();
      }
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const handleResetPassword = async (user) => {
    const result = await Swal.fire({
      title: 'Redefinir senha de acesso?',
      text: `A senha de ${user.nome} voltará para o padrão "JHE@2026" e uma nova senha será exigida no próximo login.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0E284E',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Sim, redefinir',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const { data } = await api.post(`/usuarios/${user.id}/reset-senha`);
        Swal.fire({
          icon: 'success',
          title: 'Senha Redefinida!',
          text: data.mensagem || 'Senha padrão JHE@2026 aplicada.',
          confirmButtonColor: '#0E284E'
        });
        carregarUsuarios();
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Falha',
          text: 'Não foi possível redefinir a senha.'
        });
      }
    }
  };

  const toggleVinculo = (areaId) => {
    setFormData((prev) => {
      let novasAreas = [...(prev.vinculos || [])];
      const ID_PENDENTE = 999;
      const numId = Number(areaId);

      const jaSelecionado = novasAreas.some((id) => Number(id) === numId);

      if (jaSelecionado) {
        // Remove a área selecionada
        novasAreas = novasAreas.filter((id) => Number(id) !== numId);
      } else {
        if (numId === ID_PENDENTE) {
          // Se escolheu explicitamente "Pendente de Vínculo", limpa as outras áreas
          novasAreas = [ID_PENDENTE];
        } else {
          // Se escolheu uma área real definitiva, adiciona ela e PURGA o nó pendente
          novasAreas = novasAreas.filter((id) => Number(id) !== ID_PENDENTE);
          novasAreas.push(numId);
        }
      }

      return {
        ...prev,
        vinculos: novasAreas
      };
    });
  };

  const handleAreaToggle = toggleVinculo;

  const renderSortHeader = (campo, label, paddingClass = 'py-3 px-4') => {
    const isSelected = sortConfig.campo === campo;
    const isAsc = isSelected && sortConfig.direcao === 'asc';

    return (
      <th
        className={`${paddingClass} select-none`}
        aria-sort={isSelected ? (isAsc ? 'ascending' : 'descending') : 'none'}
      >
        <button
          type="button"
          onClick={() => alternarOrdenacao(campo)}
          className={`group inline-flex items-center gap-1.5 font-bold uppercase tracking-wider transition-colors cursor-pointer rounded-md -mx-1 px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E284E] dark:focus-visible:ring-[#61CBE8] ${
            isSelected
              ? 'text-[#0E284E] dark:text-[#61CBE8]'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
          title={`Ordenar por ${label} (${isSelected ? (isAsc ? 'decrescente Z-A' : 'crescente A-Z') : 'crescente A-Z'})`}
          aria-label={`Ordenar por ${label}`}
        >
          <span>{label}</span>
          <span className="shrink-0 transition-opacity">
            {isSelected ? (
              isAsc ? (
                <ArrowUp size={13} className="text-[#0E284E] dark:text-[#61CBE8]" />
              ) : (
                <ArrowDown size={13} className="text-[#0E284E] dark:text-[#61CBE8]" />
              )
            ) : (
              <ArrowUpDown
                size={12}
                className="text-slate-300 dark:text-slate-600 opacity-60 group-hover:opacity-100 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-all"
              />
            )}
          </span>
        </button>
      </th>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/35 backdrop-blur-sm transition-all"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-none sm:rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xl shadow-slate-900/10"
      >
        {/* Cabeçalho Clean & Minimalista (Fundo 100% Branco) */}
        <div className="border-b border-slate-100 dark:border-slate-800/80 px-6 sm:px-8 py-5 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Botão Voltar à Esquerda do Título */}
            {isEditing && (
              <button
                type="button"
                onClick={handleAttemptClose}
                className="p-1.5 -ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-[#0E284E] focus-visible:outline-none cursor-pointer"
                title="Voltar para a listagem"
                aria-label="Voltar para listagem de usuários"
              >
                <ArrowLeft size={18} />
              </button>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="user-modal-title"
                  className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate"
                >
                  {isEditing ? (formData.id ? 'Editar Usuário' : 'Novo Usuário') : 'Gestão de Usuários'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700 uppercase tracking-wider shrink-0">
                  Governança
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                {isEditing
                  ? 'Configure credenciais, perfil institucional e múltiplos setores de subordinação.'
                  : 'Controle acessos, perfis e escopos de colaboradores no organograma.'}
              </p>
            </div>
          </div>

          {/* Apenas o botão Fechar no canto direito */}
          <button
            type="button"
            onClick={handleAttemptClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-[#0E284E] focus-visible:outline-none cursor-pointer"
            aria-label="Fechar modal"
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Visualização: Listagem Principal ou Formulário */}
        {!isEditing ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Barra de Ações & Filtros Responsiva */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 px-6 sm:px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                    aria-hidden="true"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    placeholder="Filtrar por nome, e-mail ou cargo..."
                    aria-label="Filtrar usuários por nome, e-mail ou cargo"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 focus:border-sky-300 dark:focus:border-sky-700 outline-none transition-all"
                  />
                </div>

                {/* Filtro Rápido por Lotação/Vínculo */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/60 shrink-0 self-start sm:self-auto overflow-x-auto max-w-full">
                  <button
                    type="button"
                    onClick={() => setFiltroVinculo('todos')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      filtroVinculo === 'todos'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>Todos</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                      {contadoresVinculo.todos}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroVinculo('pendentes')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      filtroVinculo === 'pendentes'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-950/40'
                    }`}
                    title="Exibir colaboradores pendentes de alocação ou em triagem"
                  >
                    <AlertTriangle
                      size={12}
                      className={filtroVinculo === 'pendentes' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}
                    />
                    <span>Pendentes</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        filtroVinculo === 'pendentes'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50'
                      }`}
                    >
                      {contadoresVinculo.pendentes}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroVinculo('alocados')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      filtroVinculo === 'alocados'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>Alocados</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                      {contadoresVinculo.alocados}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="bg-[#0E284E] text-white rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold hover:bg-[#194775] transition-all flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0E284E] focus-visible:outline-none"
              >
                <UserPlus size={15} />
                <span>+ Novo usuário</span>
              </button>
            </div>

            {/* Listagem de Usuários */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0E284E] dark:text-[#61CBE8]" />
                  <span className="text-xs sm:text-sm">Carregando usuários cadastrados...</span>
                </div>
              ) : usuariosOrdenados.length === 0 ? (
                <div className="text-center py-24 px-4 text-slate-400 text-xs sm:text-sm">
                  {filtroVinculo === 'pendentes'
                    ? 'Nenhum colaborador com vínculo pendente ou em triagem.'
                    : filtroVinculo === 'alocados'
                    ? 'Nenhum colaborador alocado localizado.'
                    : 'Nenhum usuário localizado para o termo pesquisado.'}
                </div>
              ) : (
                <>
                  {/* Tabela Tradicional para Tablet e Desktop */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                        <tr>
                          {renderSortHeader('colaborador', 'Colaborador', 'py-3 px-6 sm:px-8')}
                          {renderSortHeader('perfil', 'Perfil', 'py-3 px-4')}
                          {renderSortHeader('status', 'Status', 'py-3 px-4')}
                          {renderSortHeader('areas', 'Áreas Vinculadas', 'py-3 px-4')}
                          <th className="py-3 px-6 sm:px-8 text-right font-bold uppercase tracking-wider text-slate-400">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/60">
                        {usuariosOrdenados.map((u) => {
                          const roleConfig = ROLES_INFO[u.role_global] || ROLES_INFO.colaborador;
                          const vinculosList = Array.isArray(u.vinculos) ? u.vinculos : [];
                          const initials = (u.nome || 'JH')
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join('')
                            .toUpperCase();

                          return (
                            <tr
                              key={u.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="py-3.5 px-6 sm:px-8">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-[#0E284E] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                      {u.nome}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                                      {u.email}
                                    </div>
                                    {u.cargo && (
                                      <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                        {u.cargo}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${roleConfig.badgeClass}`}
                                >
                                  {roleConfig.label}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                    u.ativo
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50'
                                      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/50'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      u.ativo ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                  />
                                  {u.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="flex flex-wrap items-center gap-1 max-w-xs">
                                  {vinculosList.length > 0 ? (
                                    vinculosList.slice(0, 3).map((v, i) =>
                                      renderVinculoBadge(v, i, allNodesFlat)
                                    )
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/50 text-[10.5px] font-medium px-2 py-0.5 rounded-md italic">
                                      Sem vínculo
                                    </span>
                                  )}
                                  {vinculosList.length > 3 && (
                                    <span className="text-[10px] font-semibold text-slate-400 px-1 py-0.5">
                                      +{vinculosList.length - 3}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3.5 px-6 sm:px-8 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(u)}
                                    aria-label={`Editar usuário ${u.nome}`}
                                    title="Editar usuário"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-[#0E284E] focus-visible:outline-none"
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(u)}
                                    aria-label={u.ativo ? `Inativar conta de ${u.nome}` : `Ativar conta de ${u.nome}`}
                                    title={u.ativo ? 'Inativar Conta' : 'Ativar Conta'}
                                    className={`p-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[#0E284E] focus-visible:outline-none ${
                                      u.ativo
                                        ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                    }`}
                                  >
                                    {u.ativo ? <CheckCircle size={15} /> : <XCircle size={15} />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleResetPassword(u)}
                                    aria-label={`Redefinir senha de ${u.nome} para JHE@2026`}
                                    title="Redefinir Senha (JHE@2026)"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors focus-visible:ring-2 focus-visible:ring-[#0E284E] focus-visible:outline-none"
                                  >
                                    <KeyRound size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Visualização em Cards Empilhados para Mobile (≤ 640px) */}
                  <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
                    {usuariosOrdenados.map((u) => {
                      const roleConfig = ROLES_INFO[u.role_global] || ROLES_INFO.colaborador;
                      const vinculosList = Array.isArray(u.vinculos) ? u.vinculos : [];
                      const initials = (u.nome || 'JH')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join('')
                        .toUpperCase();

                      return (
                        <div
                          key={u.id}
                          className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#0E284E] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                                  {u.nome}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                                  {u.email}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleConfig.badgeClass}`}
                            >
                              {roleConfig.label}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                u.ativo
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60'
                                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.ativo ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              {u.ativo ? 'Ativo' : 'Inativo'}
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(u)}
                                aria-label={`Editar ${u.nome}`}
                                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                aria-label={u.ativo ? `Inativar ${u.nome}` : `Ativar ${u.nome}`}
                                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                {u.ativo ? <CheckCircle size={15} /> : <XCircle size={15} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResetPassword(u)}
                                aria-label={`Redefinir senha de ${u.nome}`}
                                className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                              >
                                <KeyRound size={15} />
                              </button>
                            </div>
                          </div>

                          {vinculosList.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              {vinculosList.map((v, i) =>
                                renderVinculoBadge(v, i, allNodesFlat)
                              )}
                            </div>
                          ) : (
                            <div className="pt-1">
                              <span className="inline-flex items-center text-rose-600 dark:text-rose-400 text-[10px] font-medium italic">
                                Sem vínculo atribuído
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Formulário de Cadastro / Edição Responsivo */
          <form
            onSubmit={handleSaveUser}
            className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-slate-900"
          >
            {/* Conteúdo Rolável do Formulário */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Nome Completo <span className="text-rose-600 font-extrabold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Carlos Andrade"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-100 focus:border-sky-300 outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    E-mail Corporativo <span className="text-rose-600 font-extrabold ml-0.5">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@jhe.com.br"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-100 focus:border-sky-300 outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Cargo / Especialidade
                  </label>
                  <input
                    type="text"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    placeholder="Ex: Engenheiro de Estruturas Sênior"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-100 focus:border-sky-300 outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Perfil Institucional (Permissão) <span className="text-rose-600 font-extrabold ml-0.5">*</span>
                  </label>
                  <select
                    value={formData.role_global}
                    onChange={(e) => setFormData({ ...formData, role_global: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-100 focus:border-sky-300 outline-none transition cursor-pointer"
                  >
                    <option value="colaborador">Colaborador (Visualização / Consulta)</option>
                    <option value="coordenador">Coordenador (Gestão de equipes e contratos)</option>
                    <option value="diretor">Diretor (Governança e edição setorial)</option>
                    <option value="admin">Administrador (Controle irrestrito global)</option>
                  </select>
                </div>
              </div>

              {/* Alternador de Status da Conta */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ativo: formData.ativo ? 0 : 1 })}
                  className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0E284E] focus-visible:outline-none rounded-lg p-1"
                >
                  {formData.ativo ? (
                    <ToggleRight className="text-emerald-600 w-7 h-7" />
                  ) : (
                    <ToggleLeft className="text-slate-400 w-7 h-7" />
                  )}
                  <span>Conta Ativa para Acesso ao Sistema</span>
                </button>
              </div>

              {/* Múltiplos Vínculos no Organograma com Seletor Hierárquico */}
              <div className="flex flex-col min-h-0">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Áreas Vinculadas no Organograma (Múltipla Seleção) <span className="text-rose-600 font-extrabold ml-0.5">*</span>
                </label>
                <OrganogramaMultiSelect
                  nodes={allNodesFlat}
                  selectedIds={formData.vinculos}
                  onChange={(novosVinculos) =>
                    setFormData((prev) => {
                      const ID_PENDENTE = 999;
                      let vinculosFinais = Array.isArray(novosVinculos) ? [...novosVinculos] : [];
                      const temDefinitivo = vinculosFinais.some((id) => Number(id) !== ID_PENDENTE);
                      if (temDefinitivo) {
                        vinculosFinais = vinculosFinais.filter((id) => Number(id) !== ID_PENDENTE);
                      }
                      return { ...prev, vinculos: vinculosFinais };
                    })
                  }
                  showGovernanceNote={true}
                />
              </div>
            </div>

            {/* Rodapé Fixo de Ações do Formulário (Não sobrepõe a lista rolável) */}
            <div className="px-6 sm:px-8 py-4 bg-slate-50/80 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={handleAttemptClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto bg-[#0E284E] text-white rounded-xl px-6 py-2.5 text-xs sm:text-sm font-semibold hover:bg-[#194775] transition flex items-center justify-center gap-2 shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0E284E] focus-visible:outline-none"
              >
                {saving ? 'Gravando...' : 'Salvar Usuário'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
