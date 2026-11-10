import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Building2,
  X,
  MapPin,
  User,
  Mail,
  Phone,
  FileText,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { parseResponsaveis, formatResponsaveisText } from './MultiResponsavelInput';

/**
 * PublicNodeDetailsCard Component
 * 
 * Painel lateral flutuante de visualização somente-leitura para o modo público/deslogado.
 * Quando qualquer visitante clica em um card no organograma, este painel surge sobreposto
 * à direita do canvas com as informações institucionais do nó selecionado.
 * 
 * @param {Object} props.node - Dados do nó selecionado
 * @param {Array<Object>} [props.allNodes=[]] - Todos os nós para identificação do pai/superintendência
 * @param {Function} props.onClose - Função de callback disparada ao fechar o card
 */
export default function PublicNodeDetailsCard({ node, allNodes = [], onClose }) {
  const [isDescricaoExpanded, setIsDescricaoExpanded] = useState(false);

  // Fecha o card ao pressionar a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!node) return null;

  // Localiza o nó pai / superintendência para o rótulo ÁREA
  const parentNode =
    node.parent_id !== null && node.parent_id !== undefined && node.parent_id !== '' && String(node.parent_id) !== '0'
      ? allNodes.find((n) => String(n.id) === String(node.parent_id))
      : null;

  const areaPaiNome = parentNode ? parentNode.titulo : (node.depth === 0 ? 'Governança Institucional' : 'Presidência / Diretoria Superior');

  // Responsável e Cotitulares (suporte seguro a Array, String ou vazio)
  const rawResponsavel = node.responsavel;
  let baseResponsavelStr = '';
  if (Array.isArray(rawResponsavel)) {
    baseResponsavelStr = rawResponsavel
      .map((r) => (typeof r === 'string' ? r.trim() : r?.nome?.trim() || ''))
      .filter(Boolean)
      .join(' & ');
  } else if (typeof rawResponsavel === 'string') {
    baseResponsavelStr = rawResponsavel.trim();
  }

  let titularList = parseResponsaveis(baseResponsavelStr);
  if (Array.isArray(node.lideres_secundarios)) {
    node.lideres_secundarios.forEach((sec) => {
      const secNome = typeof sec === 'string' ? sec.trim() : sec?.nome?.trim();
      if (secNome && !titularList.includes(secNome)) {
        titularList.push(secNome);
      }
    });
  }

  const responsavel = titularList.length > 0 ? titularList.join(' & ') : '';
  const cargoResponsavel = node.cargo_responsavel?.trim() || null;
  const responsavelFormatado = responsavel
    ? `${responsavel}${cargoResponsavel ? ` (${cargoResponsavel})` : ''}`
    : 'Titular a definir';

  // Equipe / Colaboradores diretos
  const colaboradores = Array.isArray(node.colaboradores_diretos)
    ? node.colaboradores_diretos
    : Array.isArray(node.todas_pessoas)
    ? node.todas_pessoas
    : [];

  const countPessoas = node.total_equipe_acumulada ?? node.count_total ?? node.count_direto ?? colaboradores.length;

  // Descrição / Atribuições
  const descricao = node.descricao?.trim() || '';
  const isDescricaoLonga = descricao.length > 120;

  return (
    <aside
      className="absolute top-20 right-6 z-40 w-80 sm:w-88 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-6 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200 max-h-[calc(100vh-7rem)] flex flex-col"
      role="dialog"
      aria-labelledby="public-node-title"
      aria-modal="false"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Cabeçalho */}
      <div className="flex items-start justify-between gap-3 shrink-0">
        <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-[#0E284E] dark:text-[#61CBE8] flex items-center justify-center border border-sky-100 dark:border-sky-900/60 shrink-0">
          {node.nivel_slug === 'ceo' || node.nivel_slug === 'diretoria' ? (
            <Building2 size={20} />
          ) : (
            <Briefcase size={20} />
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-slate-100/70 dark:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800"
          aria-label="Fechar painel de detalhes da posição"
          title="Fechar (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 shrink-0">
        <span className="text-[10px] font-bold tracking-wider text-[#B4783C] dark:text-[#D4985C] uppercase block">
          DETALHES DA POSIÇÃO
        </span>
        <h2
          id="public-node-title"
          className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight mt-1"
        >
          {node.titulo}
        </h2>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs font-semibold text-[#B4783C] dark:text-[#D4985C]">
            {node.nivel_nome || 'Setor Institucional'}
          </span>
          {node.sigla && (
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
              {node.sigla}
            </span>
          )}
        </div>
      </div>

      {/* 2. Seções de Informação Roláveis */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 overflow-y-auto pr-1 space-y-4 flex-1">
        {/* Área / Subordinação */}
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 shrink-0 mt-0.5">
            <MapPin size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              ÁREA
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
              {areaPaiNome}
            </p>
          </div>
        </div>

        {/* Gestor / Responsável */}
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 shrink-0 mt-0.5">
            <User size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              RESPONSÁVEL / TITULAR
            </span>
            <p className={`text-xs mt-0.5 ${responsavel ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-400 italic'}`}>
              {responsavelFormatado}
            </p>
          </div>
        </div>

        {/* E-mail Institucional */}
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 shrink-0 mt-0.5">
            <Mail size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              E-MAIL
            </span>
            {node.email ? (
              <a
                href={`mailto:${node.email}`}
                className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline break-all mt-0.5 block"
              >
                {node.email}
              </a>
            ) : (
              <p className="text-xs text-slate-400 italic mt-0.5">
                Não informado
              </p>
            )}
          </div>
        </div>

        {/* Telefone / Ramal */}
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 shrink-0 mt-0.5">
            <Phone size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              TELEFONE
            </span>
            {node.telefone ? (
              <a
                href={`tel:${node.telefone.replace(/\D/g, '')}`}
                className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 mt-0.5 block font-mono"
              >
                {node.telefone}
              </a>
            ) : (
              <p className="text-xs text-slate-400 italic mt-0.5">
                Não informado
              </p>
            )}
          </div>
        </div>

        {/* Atribuições / Descrição */}
        {descricao && (
          <div className="flex items-start gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 shrink-0 mt-0.5">
              <FileText size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  ATRIBUIÇÕES / DESCRIÇÃO
                </span>
                {isDescricaoLonga && (
                  <button
                    type="button"
                    onClick={() => setIsDescricaoExpanded(!isDescricaoExpanded)}
                    className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    {isDescricaoExpanded ? (
                      <>Menos <ChevronUp size={12} /></>
                    ) : (
                      <>Mais <ChevronDown size={12} /></>
                    )}
                  </button>
                )}
              </div>
              <p
                className={`text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed ${
                  !isDescricaoExpanded && isDescricaoLonga ? 'line-clamp-3' : ''
                }`}
              >
                {descricao}
              </p>
            </div>
          </div>
        )}

        {/* Equipe / Colaboradores */}
        <div className="flex items-start gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 shrink-0 mt-0.5">
            <Users size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                EQUIPE / COLABORADORES
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {countPessoas} {countPessoas === 1 ? 'pessoa' : 'pessoas'}
              </span>
            </div>

            {colaboradores.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {colaboradores.map((colab, idx) => {
                  const nome = typeof colab === 'object' ? colab.nome : colab;
                  const cargo = typeof colab === 'object' ? colab.cargo : '';
                  return (
                    <span
                      key={idx}
                      title={cargo || nome}
                      className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B4783C]" />
                      <span className="truncate max-w-[170px]">{nome}</span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic mt-1">
                Nenhum colaborador registrado nesta equipe.
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
