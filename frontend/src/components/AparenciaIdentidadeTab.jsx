import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
  Save,
  Check,
  Sun,
  Moon,
  Laptop,
  Sparkles,
  Eye,
  Type,
  Tag,
  AlertCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useConfiguracoes } from '../context/ConfiguracoesContext';
import { useTheme } from '../context/ThemeContext';
import JheLogo from './JheLogo';

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'];

/**
 * Dropzone Interativa para Upload de Logotipos com Preview
 */
function LogoDropzone({
  label,
  sublabel,
  logoData,
  onChange,
  onRemove,
  previewBg = 'light',
  fallbackVariant = 'default'
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = (file) => {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      Swal.fire({
        icon: 'warning',
        title: 'Formato não suportado',
        text: 'Envie um arquivo PNG, SVG, JPEG ou WEBP.',
        confirmButtonColor: '#0E284E'
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Arquivo muito grande',
        text: `O logotipo deve ter no máximo ${MAX_FILE_SIZE_MB}MB.`,
        confirmButtonColor: '#0E284E'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      onChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
            {label}
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {sublabel}
          </p>
        </div>
        {logoData && (
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
            <Check size={10} className="stroke-[3]" /> Personalizada
          </span>
        )}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[140px] select-none ${
          isDragOver
            ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/30 scale-[1.01]'
            : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/svg+xml, image/jpeg, image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              processFile(e.target.files[0]);
            }
          }}
        />

        {logoData ? (
          <div className="w-full flex flex-col items-center gap-3">
            {/* Box de Preview da Logo com contraste apropriado */}
            <div
              className={`w-full h-20 rounded-xl flex items-center justify-center p-3 border shadow-2xs relative overflow-hidden ${
                previewBg === 'dark'
                  ? 'bg-[#0B132B] border-slate-700/80'
                  : 'bg-white border-slate-200/90'
              }`}
            >
              <img
                src={logoData}
                alt={label}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Upload size={12} /> Substituir
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={12} /> Remover
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-2">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 border ${
                previewBg === 'dark'
                  ? 'bg-[#0B132B] border-slate-700 text-slate-300'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <JheLogo className="h-6 w-auto" variant={fallbackVariant} />
            </div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Upload size={13} className="text-[#0E284E] dark:text-sky-400" />
              <span>Clique ou arraste a imagem aqui</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              PNG, SVG, JPG ou WEBP (máx. 5MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Aba Principal: Aparência & Identidade Visual
 */
export default function AparenciaIdentidadeTab() {
  const { config, salvarAparencia } = useConfiguracoes();
  const { themePreference, setThemePreference, theme } = useTheme();

  // Estado local do formulário de identidade visual
  const [formConfig, setFormConfig] = useState({
    titulo_sistema: config.titulo_sistema || 'Organograma Corporativo',
    subtitulo_sistema: config.subtitulo_sistema || 'JHE Consultores Associados',
    tag_texto: config.tag_texto !== undefined && config.tag_texto !== null ? config.tag_texto : 'Governança',
    tag_ativa: config.tag_ativa !== undefined ? Boolean(config.tag_ativa) : true,
    logo_clara: config.logo_clara || null,
    logo_escura: config.logo_escura || null,
    cor_primaria: config.cor_primaria || '#0E284E',
    cor_secundaria: config.cor_secundaria || '#0284C7',
    cor_fundo_canvas: config.cor_fundo_canvas || '#F8FAFC'
  });

  const formData = formConfig;
  const setFormData = setFormConfig;

  const [previewThemeMode, setPreviewThemeMode] = useState('light');
  const [isSaving, setIsSaving] = useState(false);

  // Sincroniza formulário apenas quando os valores do config mudarem externamente
  useEffect(() => {
    if (config) {
      setFormConfig({
        titulo_sistema: config.titulo_sistema || 'Organograma Corporativo',
        subtitulo_sistema: config.subtitulo_sistema || 'JHE Consultores Associados',
        tag_texto: config.tag_texto !== undefined && config.tag_texto !== null ? config.tag_texto : 'Governança',
        tag_ativa: config.tag_ativa !== undefined ? Boolean(config.tag_ativa) : true,
        logo_clara: config.logo_clara || null,
        logo_escura: config.logo_escura || null,
        cor_primaria: config.cor_primaria || '#0E284E',
        cor_secundaria: config.cor_secundaria || '#0284C7',
        cor_fundo_canvas: config.cor_fundo_canvas || '#F8FAFC'
      });
    }
  }, [
    config.titulo_sistema,
    config.subtitulo_sistema,
    config.tag_texto,
    config.tag_ativa,
    config.logo_clara,
    config.logo_escura,
    config.cor_primaria,
    config.cor_secundaria,
    config.cor_fundo_canvas
  ]);

  // Salva no banco de dados
  const handleSalvar = async () => {
    try {
      setIsSaving(true);
      await salvarAparencia({
        titulo_sistema: formConfig.titulo_sistema,
        subtitulo_sistema: formConfig.subtitulo_sistema,
        tag_texto: formConfig.tag_texto,
        tag_ativa: Boolean(formConfig.tag_ativa),
        logo_clara: formConfig.logo_clara,
        logo_escura: formConfig.logo_escura,
        cor_primaria: formConfig.cor_primaria,
        cor_secundaria: formConfig.cor_secundaria,
        cor_fundo_canvas: formConfig.cor_fundo_canvas
      });

      Swal.fire({
        icon: 'success',
        title: 'Identidade Visual Atualizada!',
        text: 'As alterações foram salvas no banco de dados e refletidas no cabeçalho imediatamente.',
        timer: 1800,
        showConfirmButton: false,
        confirmButtonColor: '#0E284E'
      });
    } catch (err) {
      console.error('Erro ao salvar aparência:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao salvar',
        text: err.response?.data?.mensagem || err.message || 'Falha ao salvar configurações.',
        confirmButtonColor: '#0E284E'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Restaura os padrões de fábrica JHE Engenharia
  const handleRestaurarPadroes = () => {
    Swal.fire({
      title: 'Restaurar Padrão JHE?',
      text: 'Os títulos e logotipos voltarão à configuração oficial institucional.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, restaurar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0E284E',
      cancelButtonColor: '#64748B'
    }).then((result) => {
      if (result.isConfirmed) {
        setFormConfig({
          titulo_sistema: 'Organograma Corporativo',
          subtitulo_sistema: 'JHE Consultores Associados',
          tag_texto: 'Governança',
          tag_ativa: true,
          logo_clara: null,
          logo_escura: null,
          cor_primaria: '#0E284E',
          cor_secundaria: '#0284C7',
          cor_fundo_canvas: '#F8FAFC'
        });
      }
    });
  };

  const isDarkModePreview = previewThemeMode === 'dark';
  const logoPreviewAtiva = isDarkModePreview
    ? formData.logo_escura || formData.logo_clara
    : formData.logo_clara || formData.logo_escura;

  return (
    <div className="p-8 space-y-7 flex-1 overflow-y-auto">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Aparência & Identidade
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personalize os logotipos, títulos institucionais e temas do sistema com persistência em banco.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRestaurarPadroes}
            title="Restaurar padrão institucional JHE"
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={14} /> Restaurar Padrões
          </button>

          <button
            type="button"
            onClick={handleSalvar}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0E284E] hover:bg-[#163b70] transition flex items-center gap-1.5 shadow-md shadow-[#0E284E]/20 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 1. PRÉ-VISUALIZAÇÃO EM TEMPO REAL DO HEADER / TOPBAR */}
      <div className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-[#0E284E] dark:text-sky-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Pré-Visualização do Cabeçalho em Tempo Real
            </h3>
          </div>

          {/* Toggle de Simulação Claro / Escuro */}
          <div className="flex items-center p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setPreviewThemeMode('light')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                previewThemeMode === 'light'
                  ? 'bg-amber-50 text-amber-900 border border-amber-200/60 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Sun size={12} /> Modo Claro
            </button>
            <button
              type="button"
              onClick={() => setPreviewThemeMode('dark')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                previewThemeMode === 'dark'
                  ? 'bg-slate-900 text-sky-300 border border-slate-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Moon size={12} /> Modo Escuro
            </button>
          </div>
        </div>

        {/* Header Simulado */}
        <div
          className={`h-16 px-6 rounded-2xl flex items-center justify-between border transition-colors shadow-sm overflow-hidden ${
            isDarkModePreview
              ? 'bg-[#0E284E] border-slate-700 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Logo */}
            <div className="flex items-center shrink-0">
              {logoPreviewAtiva ? (
                <img
                  src={logoPreviewAtiva}
                  alt={formConfig.titulo_sistema}
                  className="h-9 w-auto max-w-[150px] object-contain"
                />
              ) : (
                <JheLogo
                  className="h-9 w-auto"
                  variant={isDarkModePreview ? 'dark' : 'default'}
                />
              )}
            </div>

            <div
              className={`h-7 w-px hidden sm:block ${
                isDarkModePreview ? 'bg-slate-700' : 'bg-slate-200'
              }`}
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  className={`text-sm font-bold tracking-tight truncate ${
                    isDarkModePreview ? 'text-white' : 'text-[#0E284E]'
                  }`}
                >
                  {formConfig.titulo_sistema || 'Organograma Corporativo'}
                </h1>

                {formConfig.tag_ativa && formConfig.tag_texto && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${
                      isDarkModePreview
                        ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {formConfig.tag_texto}
                  </span>
                )}
              </div>
              <p
                className={`text-xs font-medium truncate ${
                  isDarkModePreview ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {formData.subtitulo_sistema || 'JHE Consultores Associados'}
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-semibold px-2 py-1 rounded-lg uppercase tracking-wider hidden md:block ${
              isDarkModePreview
                ? 'bg-slate-800/80 text-slate-400'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            Header Preview
          </span>
        </div>
      </div>

      {/* 2. UPLOADS DE LOGOTIPO (CLARA E ESCURA) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-[#0E284E] dark:text-sky-400" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Logotipos Institucionais da Empresa
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Logo Clara */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60">
            <LogoDropzone
              label="Logotipo Padrão / Fundo Claro"
              sublabel="Exibida nos modos de visualização claros e cabeçalhos brancos."
              logoData={formData.logo_clara}
              onChange={(base64) => setFormData((prev) => ({ ...prev, logo_clara: base64 }))}
              onRemove={() => setFormData((prev) => ({ ...prev, logo_clara: null }))}
              previewBg="light"
              fallbackVariant="default"
            />
          </div>

          {/* Logo Escura */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60">
            <LogoDropzone
              label="Logotipo Dark / Fundo Escuro"
              sublabel="Exibida no modo noturno, Deep Navy e superfícies escuras."
              logoData={formData.logo_escura}
              onChange={(base64) => setFormData((prev) => ({ ...prev, logo_escura: base64 }))}
              onRemove={() => setFormData((prev) => ({ ...prev, logo_escura: null }))}
              previewBg="dark"
              fallbackVariant="dark"
            />
          </div>
        </div>
      </div>

      {/* 3. TÍTULOS E RAZÃO SOCIAL */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Type size={16} className="text-[#0E284E] dark:text-sky-400" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Títulos & Textos Institucionais
          </h3>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Título Principal do Sistema
              </label>
              <input
                type="text"
                value={formData.titulo_sistema}
                onChange={(e) => setFormData((prev) => ({ ...prev, titulo_sistema: e.target.value }))}
                placeholder="Ex: Organograma Corporativo"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E284E] dark:focus:ring-sky-500 transition-all font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Nome visível no cabeçalho superior e cabeçalhos de exportação.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Subtítulo / Razão Social
              </label>
              <input
                type="text"
                value={formData.subtitulo_sistema}
                onChange={(e) => setFormData((prev) => ({ ...prev, subtitulo_sistema: e.target.value }))}
                placeholder="Ex: JHE Consultores Associados"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E284E] dark:focus:ring-sky-500 transition-all font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Nome da empresa ou escopo corporativo exibido abaixo do título.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CONTROLE DA TAG / PÍLULA (EX: "GOVERNANÇA") */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-[#0E284E] dark:text-sky-400" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Tag / Pílula de Destaque no Cabeçalho
          </h3>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Exibir Tag no Cabeçalho
                </span>
                {formConfig.tag_ativa && formConfig.tag_texto && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60">
                    {formConfig.tag_texto}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Liga ou desliga a pílula destacada ao lado do título (ex: "Governança", "Estrutura 2026", "Institucional").
              </p>
            </div>

            {/* Switch do Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={formConfig.tag_ativa}
              onClick={() => setFormConfig({ ...formConfig, tag_ativa: !formConfig.tag_ativa })}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer p-0.5 flex items-center shrink-0 ${
                formConfig.tag_ativa ? 'bg-amber-500 shadow-sm' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <span
                className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                  formConfig.tag_ativa ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Texto da Tag
            </label>
            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                name="tag_texto"
                value={formConfig.tag_texto || ''}
                onChange={(e) => setFormConfig({ ...formConfig, tag_texto: e.target.value })}
                placeholder="Ex: Governança ou Estrutura 2026"
                disabled={!formConfig.tag_ativa}
                className={`flex-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-semibold ${
                  !formConfig.tag_ativa ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
                }`}
              />
            </div>
            {!formConfig.tag_ativa && (
              <span className="text-[10px] text-slate-400 mt-1 block">
                Ative o switch acima para exibir esta tag no cabeçalho.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 5. MODO DE EXIBIÇÃO DO TEMA & CORES CORPORATIVAS */}
      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Modo de Exibição do Tema
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Preferências de luminosidade do canvas e da interface visual.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setThemePreference('light')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
              themePreference === 'light'
                ? 'border-[#0E284E] dark:border-sky-400 bg-sky-50/60 dark:bg-sky-950/40 text-[#0E284E] dark:text-sky-300 ring-2 ring-[#0E284E]/20 dark:ring-sky-400/20 shadow-xs'
                : 'border-slate-200/80 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/40'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Sun size={17} />
            </div>
            <div>
              <div className="text-xs font-bold">Claro (Light)</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Ambiente luminoso</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setThemePreference('dark')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
              themePreference === 'dark'
                ? 'border-[#0E284E] dark:border-sky-400 bg-sky-50/60 dark:bg-sky-950/40 text-[#0E284E] dark:text-sky-300 ring-2 ring-[#0E284E]/20 dark:ring-sky-400/20 shadow-xs'
                : 'border-slate-200/80 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/40'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-sky-300 flex items-center justify-center shrink-0">
              <Moon size={17} />
            </div>
            <div>
              <div className="text-xs font-bold">Escuro (Dark)</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Deep Navy & Grafite</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setThemePreference('system')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
              themePreference === 'system'
                ? 'border-[#0E284E] dark:border-sky-400 bg-sky-50/60 dark:bg-sky-950/40 text-[#0E284E] dark:text-sky-300 ring-2 ring-[#0E284E]/20 dark:ring-sky-400/20 shadow-xs'
                : 'border-slate-200/80 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/40'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
              <Laptop size={17} />
            </div>
            <div>
              <div className="text-xs font-bold">Sistema (Auto)</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Segue SO / Navegador</div>
            </div>
          </button>
        </div>
      </div>

      {/* GUIA DE CORES INSTITUCIONAIS (APENAS VISUAL / REFERÊNCIA) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Paleta de Cores Institucionais & Destaques
          </h3>
        </div>

        <div className="p-4 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3.5 select-none">
          
          {/* Cor Primária */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                Cor Primária (Identidade Principal)
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Navy Institucional aplicado em botões principais, cabeçalhos executivos e destaques.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#0E284E] shadow-2xs" />
                <span className="w-5 h-5 rounded-full bg-[#1E3A8A] opacity-80" />
                <span className="w-5 h-5 rounded-full bg-[#0F172A] opacity-60" />
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                #0E284E
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200/60 dark:border-slate-800" />

          {/* Cor Secundária */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                Cor Secundária (Acentos & Realces)
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Azul Tecnologia para linhas conectoras ativas, pílulas e indicadores.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#0284C7] shadow-2xs" />
                <span className="w-5 h-5 rounded-full bg-[#0EA5E9] opacity-80" />
                <span className="w-5 h-5 rounded-full bg-[#38BDF8] opacity-60" />
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                #0284C7
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200/60 dark:border-slate-800" />

          {/* Superfície do Fundo */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                Superfície de Fundo do Organograma
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Tonalidade suave corporativa aplicada na tela de desenho (Slate Suave).
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F8FAFC] border border-slate-300 shadow-2xs" />
              <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                #F8FAFC
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
