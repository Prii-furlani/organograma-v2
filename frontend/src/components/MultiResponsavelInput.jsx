import React, { useState } from 'react';
import { X, Plus, User } from 'lucide-react';

/**
 * Extrai até 2 iniciais maiúsculas de um nome (ex: "Dr. Hélio" -> "DH", "Dr. Viol" -> "DV")
 */
export function getInitials(name = '') {
  if (!name) return 'JH';
  const clean = String(name).trim();
  const parts = clean.split(/[\s.&]+/).filter(Boolean);
  if (parts.length === 0) return 'JH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Detecta se uma string representa um placeholder de titular a definir ou ausente
 */
export function isPlaceholderResponsavel(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return (
    !s ||
    s.includes('a definir') ||
    s.includes('titular a definir') ||
    s.includes('vazio') ||
    s.includes('pendente') ||
    s.includes('nenhum') ||
    s === 'n/a' ||
    s === '-' ||
    s === 'null' ||
    s === 'undefined'
  );
}

/**
 * Converte valor de responsáveis (string unificada, array ou delimitado) para array limpo de strings
 * Ignora automaticamente placeholders como "Titular a definir"
 */
export function parseResponsaveis(value) {
  if (!value) return [];
  let rawList = [];
  if (Array.isArray(value)) {
    rawList = value.map((v) => (typeof v === 'string' ? v.trim() : v?.nome || '')).filter(Boolean);
  } else if (typeof value === 'string') {
    // Trata JSON array stringificado
    if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          rawList = parsed.map((v) => (typeof v === 'string' ? v.trim() : v?.nome || '')).filter(Boolean);
        }
      } catch (e) {
        // Fallback
      }
    }
    if (rawList.length === 0) {
      // Divide por & ou vírgula
      rawList = value
        .split(/ & |,/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return rawList.filter((item) => !isPlaceholderResponsavel(item));
}

/**
 * Formata array de responsáveis para exibição amigável ("A", "A & B", "A, B & C")
 */
export function formatResponsaveisText(responsaveisArray = []) {
  if (!responsaveisArray || responsaveisArray.length === 0) return 'Titular a definir';
  if (responsaveisArray.length === 1) return responsaveisArray[0];
  if (responsaveisArray.length === 2) return `${responsaveisArray[0]} & ${responsaveisArray[1]}`;
  const allExceptLast = responsaveisArray.slice(0, -1).join(', ');
  const last = responsaveisArray[responsaveisArray.length - 1];
  return `${allExceptLast} & ${last}`;
}

export default function MultiResponsavelInput({ value = [], onChange, placeholder }) {
  const [inputValue, setInputValue] = useState('');

  const list = Array.isArray(value) ? value : parseResponsaveis(value);

  const addTag = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Se o usuário colou texto com & ou vírgula, divide
    const splitItems = trimmed
      .split(/ & |,/)
      .map((s) => s.trim())
      .filter(Boolean);

    const nextList = [...list];
    splitItems.forEach((item) => {
      if (!nextList.includes(item)) {
        nextList.push(item);
      }
    });

    onChange?.(nextList);
    setInputValue('');
  };

  const removeTag = (indexToRemove) => {
    const nextList = list.filter((_, idx) => idx !== indexToRemove);
    onChange?.(nextList);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && list.length > 0) {
      e.preventDefault();
      removeTag(list.length - 1);
    }
  };

  const dynamicPlaceholder =
    placeholder ||
    (list.length === 0 ? 'Digite o nome e pressione Enter...' : 'Adicionar cotitular...');

  return (
    <div
      className="w-full min-h-[42px] px-2.5 py-1.5 rounded-xl border flex flex-wrap items-center gap-1.5 bg-transparent transition-all focus-within:ring-2 focus-within:ring-[#61CBE8]/40 focus-within:border-sky-400"
      style={{
        borderColor: 'var(--jhe-border-subtle)',
        backgroundColor: 'var(--jhe-surface-card)'
      }}
    >
      {/* Pílulas / Chips dos Titulares */}
      {list.map((nome, idx) => {
        const initials = getInitials(nome);
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-lg text-xs font-medium border shadow-2xs animate-in fade-in zoom-in-95 duration-100"
            style={{
              backgroundColor: 'var(--jhe-avatar-subtle-bg)',
              color: 'var(--jhe-text-main)',
              borderColor: 'var(--jhe-border-subtle)'
            }}
          >
            {/* Mini Avatar Circular */}
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 shadow-2xs"
              style={{
                backgroundColor: idx % 2 === 0 ? '#0E284E' : '#B4783C',
                color: '#FFFFFF'
              }}
            >
              {initials}
            </span>

            <span className="truncate max-w-[140px] text-xs font-semibold">{nome}</span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(idx);
              }}
              className="text-slate-400 hover:text-rose-500 rounded-sm p-0.5 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
              title={`Remover ${nome}`}
            >
              <X size={12} />
            </button>
          </span>
        );
      })}

      {/* Input de digitação de cotitulares */}
      <div className="flex-1 flex items-center min-w-[150px]">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) {
              addTag(inputValue);
            }
          }}
          placeholder={dynamicPlaceholder}
          className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400"
        />

        {inputValue.trim() && (
          <button
            type="button"
            onClick={() => addTag(inputValue)}
            className="p-1 rounded-md text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 cursor-pointer shrink-0 transition"
            title="Adicionar cotitular"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
