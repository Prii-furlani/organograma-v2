import React, { useEffect, useState, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfiguracoesProvider } from './context/ConfiguracoesContext';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import api, { fetchFlatNodesList } from './services/api';
import Navbar from './components/Navbar';
import OrganogramaView from './components/OrganogramaView';
import TopicEditorView from './components/TopicEditorView';
import NodeDrawerEditor from './components/NodeDrawerEditor';
import PublicNodeDetailsCard from './components/PublicNodeDetailsCard';
import AuditLogsModal from './components/AuditLogsModal';
import UserManagementModal from './components/UserManagementModal';
import SettingsModal from './components/SettingsModal';
import QuickGuideModal from './components/QuickGuideModal';
import FirstAccessPasswordModal from './components/FirstAccessPasswordModal';
import LoginView from './components/LoginView';
import Footer from './components/Footer';

const INITIAL_NIVEIS = [
  { id: 1, slug: 'ceo', nome: 'Co-CEOs / Presidência', ordem_hierarquica: 0, nivel_ordem: 0, classe_css: 'jhe-level-ceo', cor_identificador: '#0E284E', cor_hex: '#0E284E', subtitulo: 'Direção Executiva e Conselho de Administração' },
  { id: 2, slug: 'oia', nome: 'OIA / Auditoria', ordem_hierarquica: 1, nivel_ordem: 1, classe_css: 'jhe-level-oia', cor_identificador: '#0E284E', cor_hex: '#0E284E', subtitulo: 'Organismo de Inspeção Acreditado' },
  { id: 3, slug: 'staff', nome: 'Staff / Assessoria', ordem_hierarquica: 1, nivel_ordem: 1, classe_css: 'jhe-level-staff', cor_identificador: '#0E284E', cor_hex: '#0E284E', subtitulo: 'Assessoria Estratégica & Governança' },
  { id: 4, slug: 'diretoria', nome: 'Diretoria Executiva', ordem_hierarquica: 2, nivel_ordem: 2, classe_css: 'jhe-level-diretoria', cor_identificador: '#0E284E', cor_hex: '#0E284E', subtitulo: 'Diretorias Corporativas e Operacionais' },
  { id: 5, slug: 'gerencia', nome: 'Gerência', ordem_hierarquica: 3, nivel_ordem: 3, classe_css: 'jhe-level-gerencia', cor_identificador: '#B4783C', cor_hex: '#B4783C', subtitulo: 'Gerências Setoriais e Regionais' },
  { id: 6, slug: 'unidade', nome: 'Unidade de Negócios', ordem_hierarquica: 3, nivel_ordem: 3, classe_css: 'jhe-level-unidade', cor_identificador: '#B4783C', cor_hex: '#B4783C', subtitulo: 'Unidades de Negócio Estruturadas' },
  { id: 7, slug: 'coordenacao', nome: 'Coordenação', ordem_hierarquica: 4, nivel_ordem: 4, classe_css: 'jhe-level-coordenacao', cor_identificador: '#B4783C', cor_hex: '#B4783C', subtitulo: 'Coordenação de Projetos e Contratos' },
  { id: 8, slug: 'apoio', nome: 'Apoio Operacional', ordem_hierarquica: 5, nivel_ordem: 5, classe_css: 'jhe-level-apoio', cor_identificador: '#0284C7', cor_hex: '#0284C7', subtitulo: 'Apoio Técnico e Suporte Operacional' },
  { id: 9, slug: 'equipe', nome: 'Equipe Técnica', ordem_hierarquica: 6, nivel_ordem: 6, classe_css: 'jhe-level-equipe', cor_identificador: '#5B6B7C', cor_hex: '#5B6B7C', subtitulo: 'Corpo Técnico Multidisciplinar' },
  { id: 10, slug: 'contrato', nome: 'Contrato / Obra', ordem_hierarquica: 7, nivel_ordem: 7, classe_css: 'jhe-level-contrato', cor_identificador: '#5B6B7C', cor_hex: '#5B6B7C', subtitulo: 'Contratos e Obras em Fiscalização' }
];

const INITIAL_NOS = [
  {
    id: 1,
    parentId: null,
    parent_id: null,
    nivel_id: 1,
    nivel_slug: 'ceo',
    nivel_nome: 'Co-CEOs / Presidência',
    classe_css: 'jhe-level-ceo',
    cor_hex: '#0E284E',
    titulo: 'Co-CEOs',
    sigla: 'CEO',
    responsavel: ['Dr. Hélio', 'Dr. Viol'],
    cargo_responsavel: 'Co-CEOs (DH / DV)',
    email: 'diretoria@jhe.com.br',
    telefone: '(31) 3200-1000',
    descricao: 'Direção Estratégica Institucional JHE Consultores Associados',
    ordem: 1,
    lideres_secundarios: [{ nome: 'Dr. Viol', iniciais: 'DV', cargo: 'Co-CEO', cor_avatar: '#B4783C' }]
  },
  {
    id: 2,
    parentId: 1,
    parent_id: 1,
    nivel_id: 2,
    nivel_slug: 'oia',
    nivel_nome: 'OIA / Auditoria',
    classe_css: 'jhe-level-oia',
    cor_hex: '#0E284E',
    titulo: 'Organismo de Inspeção Acreditado',
    sigla: 'OIA',
    responsavel: ['Responsável Técnico OIA'],
    cargo_responsavel: 'Gestor OIA',
    email: 'oia@jhe.com.br',
    telefone: '(31) 3200-1010',
    descricao: 'Inspeção acreditada com independência técnica e governança',
    ordem: 1,
    lideres_secundarios: []
  },
  {
    id: 3,
    parentId: 1,
    parent_id: 1,
    nivel_id: 3,
    nivel_slug: 'staff',
    nivel_nome: 'Staff / Assessoria',
    classe_css: 'jhe-level-staff',
    cor_hex: '#0E284E',
    titulo: 'Assessoria Executiva & Governança',
    sigla: 'STAFF',
    responsavel: ['Coordenação Staff'],
    cargo_responsavel: 'Assessoria Estratégica',
    email: 'staff@jhe.com.br',
    telefone: '(31) 3200-1020',
    descricao: 'Suporte estratégico e conformidade institucional',
    ordem: 2,
    lideres_secundarios: []
  },
  {
    id: 4,
    parentId: 1,
    parent_id: 1,
    nivel_id: 4,
    nivel_slug: 'diretoria',
    nivel_nome: 'Diretoria Executiva',
    classe_css: 'jhe-level-diretoria',
    cor_hex: '#0E284E',
    titulo: 'Diretoria de Engenharia e Operações',
    sigla: 'DIR-ENG',
    responsavel: ['Leandro Neves'],
    cargo_responsavel: 'Diretor de Engenharia',
    email: 'engenharia@jhe.com.br',
    telefone: '(31) 3200-1030',
    descricao: 'Gestão global de contratos, projetos e unidades de negócios',
    ordem: 3,
    lideres_secundarios: []
  },
  {
    id: 5,
    parentId: 1,
    parent_id: 1,
    nivel_id: 4,
    nivel_slug: 'diretoria',
    nivel_nome: 'Diretoria Executiva',
    classe_css: 'jhe-level-diretoria',
    cor_hex: '#0E284E',
    titulo: 'Diretoria Comercial',
    sigla: 'DIR-COM',
    responsavel: ['Diretor Comercial'],
    cargo_responsavel: 'Diretor Comercial',
    email: 'comercial@jhe.com.br',
    telefone: '(31) 3200-1035',
    descricao: 'Desenvolvimento de novos negócios, propostas e relações corporativas',
    ordem: 4,
    lideres_secundarios: []
  },
  {
    id: 6,
    parentId: 1,
    parent_id: 1,
    nivel_id: 4,
    nivel_slug: 'diretoria',
    nivel_nome: 'Diretoria Executiva',
    classe_css: 'jhe-level-diretoria',
    cor_hex: '#0E284E',
    titulo: 'Diretoria Administrativa',
    sigla: 'DIR-ADM',
    responsavel: ['Diretor Administrativo'],
    cargo_responsavel: 'Diretor Financeiro & Administrativo',
    email: 'administrativo@jhe.com.br',
    telefone: '(31) 3200-1038',
    descricao: 'Controladoria, finanças, recursos humanos e suprimentos',
    ordem: 5,
    lideres_secundarios: []
  },
  {
    id: 7,
    parentId: 4,
    parent_id: 4,
    nivel_id: 7,
    nivel_slug: 'coordenacao',
    nivel_nome: 'Coordenação',
    classe_css: 'jhe-level-coordenacao',
    cor_hex: '#B4783C',
    titulo: 'Coordenação de Projetos e Contratos',
    sigla: 'COORD-PROJ',
    responsavel: ['Coordenador Geral'],
    cargo_responsavel: 'Coordenador de Engenharia',
    email: 'projetos@jhe.com.br',
    telefone: '(31) 3200-1040',
    descricao: 'Gestão tática das equipes multidisciplinares e contratos ativos',
    ordem: 1,
    lideres_secundarios: []
  },
  {
    id: 8,
    parentId: 4,
    parent_id: 4,
    nivel_id: 8,
    nivel_slug: 'apoio',
    nivel_nome: 'Apoio Operacional',
    classe_css: 'jhe-level-apoio',
    cor_hex: '#0284C7',
    titulo: 'Apoio Técnico e Planejamento',
    sigla: 'APOIO-TEC',
    responsavel: ['Líder de Planejamento'],
    cargo_responsavel: 'Especialista de Apoio',
    email: 'planejamento@jhe.com.br',
    telefone: '(31) 3200-1050',
    descricao: 'Suporte operacional, controle físico-financeiro e qualidade',
    ordem: 2,
    lideres_secundarios: []
  },
  {
    id: 9,
    parentId: 7,
    parent_id: 7,
    nivel_id: 9,
    nivel_slug: 'equipe',
    nivel_nome: 'Equipe Técnica',
    classe_css: 'jhe-level-equipe',
    cor_hex: '#5B6B7C',
    titulo: 'Equipe de Engenharia Civil e Estruturas',
    sigla: 'EQ-CIV',
    responsavel: ['Eng. Líder Civil'],
    cargo_responsavel: 'Líder Técnico',
    email: 'civil@jhe.com.br',
    telefone: '(31) 3200-1060',
    descricao: 'Execução técnica de projetos estruturais e consultoria',
    ordem: 1,
    lideres_secundarios: []
  },
  {
    id: 10,
    parentId: 7,
    parent_id: 7,
    nivel_id: 10,
    nivel_slug: 'contrato',
    nivel_nome: 'Contrato / Obra',
    classe_css: 'jhe-level-contrato',
    cor_hex: '#5B6B7C',
    titulo: 'Contrato 042/2026 - Fiscalização e Gerenciamento',
    sigla: 'CT-042',
    responsavel: ['Eng. Residente'],
    cargo_responsavel: 'Gestor de Contrato',
    email: 'ct042@jhe.com.br',
    telefone: '(31) 3200-1070',
    descricao: 'Contrato de gerenciamento e fiscalização de obras de infraestrutura',
    ordem: 2,
    lideres_secundarios: []
  }
];

function OrganogramaContent() {
  const {
    usuario,
    isAuthenticated,
    canManage,
    realizarLogout,
    atualizarPrimeiroAcessoConcluido
  } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState('canvas');
  const [niveis, setNiveis] = useState(INITIAL_NIVEIS);
  const [allNodesFlat, setAllNodesFlat] = useState(INITIAL_NOS);
  const [noSelecionado, setNoSelecionado] = useState(null);
  const [selectedPublicNode, setSelectedPublicNode] = useState(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [quickGuideModalOpen, setQuickGuideModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Redefine a visualização para passiva se o usuário deslogar ou perder permissão
  useEffect(() => {
    if (!canManage) {
      setAbaAtiva('canvas');
      setNoSelecionado(null);
      setAuditModalOpen(false);
      setUserModalOpen(false);
      setSettingsModalOpen(false);
    }
  }, [canManage]);

  const organogramaViewRef = useRef(null);

  // Logout automático após 1 hora (60 minutos) de inatividade (ativo somente para sessões autenticadas)
  const handleIdleLogout = useCallback(() => {
    realizarLogout();
    setAbaAtiva('canvas');
    setNoSelecionado(null);
    setAuditModalOpen(false);
    setUserModalOpen(false);
    setSettingsModalOpen(false);
    organogramaViewRef.current?.clearHighlight?.();

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: 'Sessão Expirada por Inatividade',
      text: 'Sua sessão foi encerrada automaticamente após 1 hora de inatividade por motivos de segurança.',
      showConfirmButton: false,
      timer: 7500,
      timerProgressBar: true
    });
  }, [realizarLogout]);

  useIdleTimeout({
    isAuthenticated,
    onIdle: handleIdleLogout,
    timeoutMs: 60 * 60 * 1000,
    throttleMs: 1000
  });

  const handleCloseDrawer = useCallback(() => {
    setNoSelecionado(null);
    organogramaViewRef.current?.clearHighlight?.();
  }, []);

  const handleClosePublicDetails = useCallback(() => {
    setSelectedPublicNode(null);
    organogramaViewRef.current?.clearHighlight?.();
  }, []);

  // Interceptação do clique no nó conforme estado de autenticação e RBAC:
  const handleNodeClick = useCallback(
    (nodeData) => {
      // Se não autenticado ou perfil estritamente de consulta (colaborador/visualizador), abre o card lateral flutuante
      if (!isAuthenticated || usuario?.role_global === 'colaborador' || usuario?.role_global === 'visualizador') {
        setSelectedPublicNode(nodeData);
      } else {
        // Administrador, Diretor ou Coordenador: abre o drawer completo de edição
        setNoSelecionado(nodeData);
      }
    },
    [isAuthenticated, usuario]
  );

  const carregarDados = useCallback(async () => {
    try {
      const { nos, niveis: niveisApi } = await fetchFlatNodesList();
      if (Array.isArray(nos) && nos.length > 0) {
        setNiveis(niveisApi?.length ? niveisApi : INITIAL_NIVEIS);
        setAllNodesFlat(nos);
      }
    } catch (error) {
      console.warn('Operando com estrutura local em memória:', error.message);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Aciona clearHighlighting -> setHighlighted(nodeId).render() -> setCentered(nodeId).render()
  const focusNode = useCallback((nodeId) => {
    setTimeout(() => {
      organogramaViewRef.current?.focusNode(nodeId);
    }, 60);
  }, []);

  const handleSaveNode = async (dadosNo) => {
    try {
      if (dadosNo.id) {
        await api.put(`/organograma/${dadosNo.id}`, dadosNo);
      } else {
        await api.post('/organograma', dadosNo);
      }
      setNoSelecionado(null);
      await carregarDados();
    } catch (error) {
      const nivelObj = niveis.find((n) => Number(n.id) === Number(dadosNo.nivel_id)) || niveis[3];
      if (dadosNo.id) {
        setAllNodesFlat((prev) =>
          prev.map((item) =>
            String(item.id) === String(dadosNo.id)
              ? {
                  ...item,
                  ...dadosNo,
                  parentId: dadosNo.parent_id,
                  nivel_slug: nivelObj?.slug,
                  nivel_nome: nivelObj?.nome,
                  classe_css: nivelObj?.classe_css,
                  cor_hex: nivelObj?.cor_hex
                }
              : item
          )
        );
      } else {
        const novoId = Math.max(0, ...allNodesFlat.map((n) => Number(n.id))) + 1;
        setAllNodesFlat((prev) => [
          ...prev,
          {
            ...dadosNo,
            id: novoId,
            parentId: dadosNo.parent_id,
            nivel_slug: nivelObj?.slug || 'diretoria',
            nivel_nome: nivelObj?.nome || 'Diretoria',
            classe_css: nivelObj?.classe_css || 'jhe-level-diretoria',
            cor_hex: nivelObj?.cor_hex || '#0E284E'
          }
        ]);
      }
      setNoSelecionado(null);
    }
  };

  // Movimentação de estrutura via Drag-and-Drop no TopicEditor com chamada direta à API
  const handleMoveNode = async (draggedNode, newParentId) => {
    const targetParent = newParentId === null ? null : Number(newParentId);
    try {
      await api.patch(`/organograma/nos/${draggedNode.id}/mover`, {
        parent_id: targetParent
      });
      await carregarDados();
    } catch (err) {
      console.warn('Falha em /nos/:id/mover, tentando atualização cadastral:', err.message);
      try {
        await handleSaveNode({
          ...draggedNode,
          parent_id: targetParent
        });
      } catch {
        // Fallback otimista no estado em memória
        setAllNodesFlat((prev) =>
          prev.map((item) =>
            String(item.id) === String(draggedNode.id)
              ? { ...item, parent_id: targetParent, parentId: targetParent }
              : item
          )
        );
      }
    }
  };

  const handleDeleteNode = async (id) => {
    // Bloqueio preventivo: impede exclusão de nós que possuam filhos ativos
    const filhos = (allNodesFlat || []).filter((n) => String(n.parent_id) === String(id));
    if (filhos.length > 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Exclusão Bloqueada',
        text: `Esta área possui ${filhos.length} subunidade(s) diretamente vinculada(s). Realoque os subordinados antes de prosseguir com a exclusão.`,
        confirmButtonColor: '#0E284E'
      });
      return;
    }

    const confirm = await Swal.fire({
      title: 'Confirmar exclusão?',
      text: 'Esta ação removerá a estrutura da base de dados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#64748B'
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/organograma/nos/${id}`);
      setNoSelecionado(null);
      await carregarDados();
      Swal.fire({
        icon: 'success',
        title: 'Excluído!',
        text: 'A unidade foi removida com sucesso.',
        timer: 1600,
        showConfirmButton: false
      });
    } catch (error) {
      const msg = error.response?.data?.mensagem || error.message;
      Swal.fire({
        icon: 'error',
        title: 'Erro ao excluir',
        text: msg,
        confirmButtonColor: '#0E284E'
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        allNodesFlat={allNodesFlat}
        onFocusNode={focusNode}
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtiva}
        onOpenAuditModal={() => canManage && setAuditModalOpen(true)}
        onOpenUserModal={() => canManage && setUserModalOpen(true)}
        onOpenSettingsModal={() => canManage && setSettingsModalOpen(true)}
        onOpenLoginModal={() => setLoginModalOpen(true)}
      />

      <main className="flex-1 relative">
        {abaAtiva === 'canvas' || !canManage ? (
          <OrganogramaView
            ref={organogramaViewRef}
            nos={allNodesFlat}
            niveis={niveis}
            onSelectNode={handleNodeClick}
            onCanvasBackgroundClick={handleClosePublicDetails}
            onOpenQuickGuide={() => setQuickGuideModalOpen(true)}
            onCreateNode={
              canManage
                ? () =>
                    setNoSelecionado({
                      parent_id: 1,
                      nivel_id: 9,
                      titulo: '',
                      sigla: '',
                      responsavel: '',
                      cargo_responsavel: '',
                      ordem: 1
                    })
                : undefined
            }
          />
        ) : (
          <TopicEditorView
            nos={allNodesFlat}
            onClose={() => setAbaAtiva('canvas')}
            onSelectNode={(no) => setNoSelecionado(no)}
            onCreateChild={(parentId) =>
              setNoSelecionado({
                parent_id: parentId,
                nivel_id: 9,
                titulo: '',
                sigla: '',
                responsavel: '',
                cargo_responsavel: '',
                ordem: 1
              })
            }
            onCreateRoot={() =>
              setNoSelecionado({
                parent_id: null,
                nivel_id: 9,
                titulo: '',
                sigla: '',
                responsavel: '',
                cargo_responsavel: '',
                ordem: 1
              })
            }
            onDeleteNode={handleDeleteNode}
            onMoveNode={handleMoveNode}
            fetchTopicsData={carregarDados}
            onOpenAuditModal={() => setAuditModalOpen(true)}
            onOpenQuickGuide={() => setQuickGuideModalOpen(true)}
          />
        )}

        {/* Modo Visualização / Consulta: Card Lateral Flutuante de Detalhes da Posição */}
        {(!isAuthenticated || usuario?.role_global === 'colaborador' || usuario?.role_global === 'visualizador') && selectedPublicNode && (
          <PublicNodeDetailsCard
            node={selectedPublicNode}
            allNodes={allNodesFlat}
            onClose={handleClosePublicDetails}
          />
        )}

        {canManage && (
          <NodeDrawerEditor
            noSelecionado={noSelecionado}
            niveis={niveis}
            nos={allNodesFlat}
            onClose={handleCloseDrawer}
            onSave={handleSaveNode}
            onDelete={handleDeleteNode}
          />
        )}
      </main>

      {canManage && (
        <AuditLogsModal
          isOpen={auditModalOpen}
          onClose={() => setAuditModalOpen(false)}
        />
      )}

      {canManage && usuario?.role_global === 'admin' && (
        <>
          <UserManagementModal
            isOpen={userModalOpen}
            onClose={() => setUserModalOpen(false)}
            allNodesFlat={allNodesFlat}
            onUsersUpdated={carregarDados}
          />

          <SettingsModal
            isOpen={settingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            niveis={niveis}
            allNodes={allNodesFlat}
            onSaveNiveis={async (novosNiveis) => {
              setNiveis(novosNiveis);
              // Atualização reativa imediata de todos os nós em memória
              setAllNodesFlat((prev) =>
                prev.map((n) => {
                  const nv = novosNiveis.find(
                    (x) =>
                      Number(x.id) === Number(n.nivel_id) ||
                      (x.slug && (x.slug === n.nivel_slug || x.slug === n.slug_nivel))
                  );
                  if (nv) {
                    const cor = nv.cor_identificador || nv.cor_hex;
                    return {
                      ...n,
                      cor_identificador: cor,
                      cor_hex: cor,
                      nivel_nome: nv.nome,
                      classe_css: nv.classe_css || n.classe_css
                    };
                  }
                  return n;
                })
              );

              try {
                await api.put('/organograma/niveis', { niveis: novosNiveis });
                await carregarDados();
              } catch (error) {
                console.warn('Sincronização de níveis em memória local:', error.message);
              }
            }}
          />
        </>
      )}

      <FirstAccessPasswordModal
        isOpen={Boolean(isAuthenticated && usuario?.primeiro_acesso)}
        onPasswordChanged={atualizarPrimeiroAcessoConcluido}
      />

      <QuickGuideModal
        isOpen={quickGuideModalOpen}
        onClose={() => setQuickGuideModalOpen(false)}
      />

      <LoginView
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ConfiguracoesProvider>
          <OrganogramaContent />
        </ConfiguracoesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
