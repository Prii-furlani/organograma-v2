import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Compass,
  Move,
  Users,
  ShieldCheck,
  Search,
  Sliders,
  ChevronRight,
  Sparkles,
  Layers,
  MousePointerClick
} from 'lucide-react';

export default function QuickGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('navegacao');

  if (!isOpen) return null;

  const sections = [
    {
      id: 'navegacao',
      title: 'Navegação e Visualização',
      icon: Compass,
      description: 'Como explorar a estrutura organizacional e localizar setores rapidamente.',
      cards: [
        {
          title: 'Zoom e Deslocamento do Canvas',
          icon: MousePointerClick,
          badge: 'Canvas D3',
          content:
            'Clique e arraste no fundo do organograma para se deslocar livremente. Use a roda do mouse (scroll) ou os botões de controle no canto para aproximar ou afastar a visualização.'
        },
        {
          title: 'Busca Inteligente Global',
          icon: Search,
          badge: 'Atalho / Busca',
          content:
            'Utilize a barra de pesquisa na barra superior para encontrar qualquer setor por título, sigla, gestor ou cargo. Pressione Enter para focar instantaneamente no primeiro resultado.'
        },
        {
          title: 'Detalhes da Área e Equipe',
          icon: Users,
          badge: 'Interatividade',
          content:
            'Passe o mouse ou clique no contador de pessoas de um card para ver os colaboradores vinculados com suas respectivas atribuições. Visitantes podem clicar em qualquer setor para abrir a ficha institucional.'
        }
      ]
    },
    {
      id: 'topicos',
      title: 'Editor em Tópicos & Estrutura',
      icon: Layers,
      description: 'Gestão visual da árvore hierárquica por meio de listas expansíveis e arrasto.',
      cards: [
        {
          title: 'Organização em Lista Hierárquica',
          icon: Layers,
          badge: 'Modo Tópicos',
          content:
            'Alterne entre "Canvas" e "Tópicos" na barra superior para visualizar a árvore corporativa em tabela. Expanda ou recolha níveis conforme sua necessidade.'
        },
        {
          title: 'Reestruturação via Arrastar e Soltar',
          icon: Move,
          badge: 'Drag & Drop',
          content:
            'Gestores autorizados podem mover setores inteiros simplesmente arrastando a linha do setor sobre o novo setor de destino. Um diálogo de confirmação detalhado garantirá a precisão da alteração.'
        },
        {
          title: 'Desfazer e Refazer Governança',
          icon: Sliders,
          badge: 'Memória Segura',
          content:
            'Erros de movimentação acidental podem ser desfeitos ou refeitos usando os botões de seta no topo da tela, sempre solicitando confirmação explícita antes de reverter.'
        }
      ]
    },
    {
      id: 'governanca',
      title: 'Perfis, Governança & Auditoria',
      icon: ShieldCheck,
      description: 'Controle de acesso por papel (RBAC), multi-vínculos e rastreabilidade total.',
      cards: [
        {
          title: 'Perfis de Acesso (RBAC)',
          icon: ShieldCheck,
          badge: 'Segurança',
          content:
            'O sistema possui três níveis de permissão: Administrador (gestão integral de estrutura, usuários e configurações), Gestor (criação e edição dentro do seu escopo) e Visualizador / Público.'
        },
        {
          title: 'Colaboradores com Vínculos Múltiplos',
          icon: Users,
          badge: 'Flexibilidade',
          content:
            'Um mesmo colaborador pode pertencer a múltiplas diretorias ou comitês estratégicos (ex: Membro OIA, Gerência e Grupo Técnico) sem duplicação de cadastro.'
        },
        {
          title: 'Rastreabilidade e Logs de Auditoria',
          icon: Sparkles,
          badge: 'Auditoria JHE',
          content:
            'Todas as alterações no organograma, inclusões de pessoas e movimentações são registradas com data, hora, IP e responsável, acessíveis pelo menu de perfil do administrador.'
        }
      ]
    }
  ];

  const currentSection = sections.find((s) => s.id === activeTab) || sections[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-slate-50 via-white to-sky-50/30 dark:from-slate-900 dark:to-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0E284E] text-white flex items-center justify-center shadow-xs">
              <HelpCircle size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Governança & Instruções JHE
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Guia Rápido do Sistema
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
            title="Fechar guia"
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas Superiores no estilo Sabesp / Executivo */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-6 gap-2 pt-3">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeTab === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveTab(sec.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold rounded-t-xl transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-[#0E284E] dark:text-sky-400 border-t-2 border-t-[#0E284E] dark:border-t-sky-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon size={15} />
                <span>{sec.title}</span>
              </button>
            );
          })}
        </div>

        {/* Corpo do Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-[#0E284E] dark:text-sky-300 mb-1">
              {currentSection.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {currentSection.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentSection.cards.map((card, idx) => {
              const CardIcon = card.icon;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-[#0E284E] dark:text-sky-400 flex items-center justify-center group-hover:bg-[#0E284E] group-hover:text-white transition-colors">
                        <CardIcon size={16} />
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {card.badge}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-2">
                      {card.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {card.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dica Institucional de Governança */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={13} />
            </div>
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>Padrão de Qualidade JHE:</strong> Para preservar a integridade das auditorias e certificações técnicas (como OIA), certifique-se de que cada movimentação ou criação de área tenha o escopo de subordinação devidamente aprovado pela diretoria executiva.
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            JHE Consultores Associados • Organograma Corporativo
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0E284E] hover:bg-[#15386b] cursor-pointer transition shadow-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
