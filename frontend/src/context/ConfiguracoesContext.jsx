import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchConfiguracoesAparencia, saveConfiguracoesAparencia } from '../services/api';

const CONFIG_PADRAO = {
  titulo_sistema: 'Organograma Corporativo',
  subtitulo_sistema: 'JHE Consultores Associados',
  tag_texto: 'Governança',
  tag_ativa: true,
  logo_clara: null,
  logo_escura: null,
  logo_clara_url: null,
  logo_escura_url: null,
  cor_primaria: '#0E284E',
  cor_secundaria: '#0284C7',
  cor_fundo_canvas: '#F8FAFC',
  timeout_ativo: true,
  timeout_inatividade_minutos: 60,
  prevencao_ciclos_ativa: true,
  exigir_troca_senha_primeiro_acesso: true,
  senha_temporaria_padrao: 'JHE@2026'
};

const ConfiguracoesContext = createContext(null);

export function ConfiguracoesProvider({ children }) {
  const [config, setConfig] = useState(() => {
    try {
      const cache = localStorage.getItem('jhe_config_aparencia');
      return cache ? JSON.parse(cache) : CONFIG_PADRAO;
    } catch {
      return CONFIG_PADRAO;
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Busca inicial das configurações no boot da aplicação
  const carregarConfiguracoes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchConfiguracoesAparencia();
      if (data) {
        const configNormalizada = {
          titulo_sistema: data.titulo_sistema || CONFIG_PADRAO.titulo_sistema,
          subtitulo_sistema: data.subtitulo_sistema || CONFIG_PADRAO.subtitulo_sistema,
          tag_texto: data.tag_texto || CONFIG_PADRAO.tag_texto,
          tag_ativa: data.tag_ativa !== undefined ? Boolean(data.tag_ativa) : true,
          logo_clara: data.logo_clara || data.logo_clara_url || null,
          logo_escura: data.logo_escura || data.logo_escura_url || null,
          logo_clara_url: data.logo_clara_url || data.logo_clara || null,
          logo_escura_url: data.logo_escura_url || data.logo_escura || null,
          cor_primaria: data.cor_primaria || CONFIG_PADRAO.cor_primaria,
          cor_secundaria: data.cor_secundaria || CONFIG_PADRAO.cor_secundaria,
          cor_fundo_canvas: data.cor_fundo_canvas || CONFIG_PADRAO.cor_fundo_canvas,
          timeout_ativo: data.timeout_ativo !== undefined ? Boolean(data.timeout_ativo) : CONFIG_PADRAO.timeout_ativo,
          timeout_inatividade_minutos: Number(data.timeout_inatividade_minutos) || CONFIG_PADRAO.timeout_inatividade_minutos,
          prevencao_ciclos_ativa: data.prevencao_ciclos_ativa !== undefined ? Boolean(data.prevencao_ciclos_ativa) : CONFIG_PADRAO.prevencao_ciclos_ativa,
          exigir_troca_senha_primeiro_acesso: data.exigir_troca_senha_primeiro_acesso !== undefined ? Boolean(data.exigir_troca_senha_primeiro_acesso) : CONFIG_PADRAO.exigir_troca_senha_primeiro_acesso,
          senha_temporaria_padrao: data.senha_temporaria_padrao || CONFIG_PADRAO.senha_temporaria_padrao
        };
        setConfig(configNormalizada);
        localStorage.setItem('jhe_config_aparencia', JSON.stringify(configNormalizada));
      }
    } catch (err) {
      console.warn('Aviso: usando configurações locais em cache ou fallback padrão:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarConfiguracoes();
  }, [carregarConfiguracoes]);

  // Aplica variáveis CSS globais baseadas nas configurações corporativas
  useEffect(() => {
    const applyColors = () => {
      const isDark =
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark';

      // No modo claro, aplica a tonalidade de fundo do canvas customizada
      if (!isDark && config.cor_fundo_canvas) {
        document.documentElement.style.setProperty('--jhe-canvas-bg', config.cor_fundo_canvas);
      } else {
        document.documentElement.style.removeProperty('--jhe-canvas-bg');
      }

      if (config.cor_primaria) {
        document.documentElement.style.setProperty('--jhe-primary', config.cor_primaria);
      }
      if (config.cor_secundaria) {
        document.documentElement.style.setProperty('--jhe-accent', config.cor_secundaria);
      }
    };

    applyColors();

    const observer = new MutationObserver(applyColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });

    return () => observer.disconnect();
  }, [config.cor_fundo_canvas, config.cor_primaria, config.cor_secundaria]);

  // Salva no banco de dados e sincroniza o estado global instantaneamente sem F5
  const salvarConfiguracoes = useCallback(async (novosDados) => {
    const configFormatada = {
      titulo_sistema: novosDados.titulo_sistema !== undefined ? ((novosDados.titulo_sistema || '').trim() || CONFIG_PADRAO.titulo_sistema) : config.titulo_sistema,
      subtitulo_sistema: novosDados.subtitulo_sistema !== undefined ? ((novosDados.subtitulo_sistema || '').trim() || CONFIG_PADRAO.subtitulo_sistema) : config.subtitulo_sistema,
      tag_texto: novosDados.tag_texto !== undefined
        ? (typeof novosDados.tag_texto === 'string' && novosDados.tag_texto.trim() !== '' ? novosDados.tag_texto.trim() : novosDados.tag_texto)
        : config.tag_texto,
      tag_ativa: novosDados.tag_ativa !== undefined ? Boolean(novosDados.tag_ativa) : Boolean(config.tag_ativa),
      logo_clara: novosDados.logo_clara !== undefined ? novosDados.logo_clara : config.logo_clara,
      logo_escura: novosDados.logo_escura !== undefined ? novosDados.logo_escura : config.logo_escura,
      cor_primaria: novosDados.cor_primaria || config.cor_primaria || CONFIG_PADRAO.cor_primaria,
      cor_secundaria: novosDados.cor_secundaria || config.cor_secundaria || CONFIG_PADRAO.cor_secundaria,
      cor_fundo_canvas: novosDados.cor_fundo_canvas || config.cor_fundo_canvas || CONFIG_PADRAO.cor_fundo_canvas,
      timeout_ativo: novosDados.timeout_ativo !== undefined ? Boolean(novosDados.timeout_ativo) : Boolean(config.timeout_ativo),
      timeout_inatividade_minutos: novosDados.timeout_inatividade_minutos !== undefined ? Number(novosDados.timeout_inatividade_minutos) : (config.timeout_inatividade_minutos || 60),
      prevencao_ciclos_ativa: novosDados.prevencao_ciclos_ativa !== undefined ? Boolean(novosDados.prevencao_ciclos_ativa) : Boolean(config.prevencao_ciclos_ativa),
      exigir_troca_senha_primeiro_acesso: novosDados.exigir_troca_senha_primeiro_acesso !== undefined ? Boolean(novosDados.exigir_troca_senha_primeiro_acesso) : Boolean(config.exigir_troca_senha_primeiro_acesso),
      senha_temporaria_padrao: novosDados.senha_temporaria_padrao !== undefined ? String(novosDados.senha_temporaria_padrao).trim() : (config.senha_temporaria_padrao || 'JHE@2026')
    };

    // Atualização otimista imediata na interface
    setConfig((prev) => ({ ...prev, ...configFormatada }));
    localStorage.setItem('jhe_config_aparencia', JSON.stringify(configFormatada));

    // Persistência no MySQL
    const res = await saveConfiguracoesAparencia(configFormatada);
    if (res) {
      const configSalva = {
        ...configFormatada,
        ...res
      };
      setConfig(configSalva);
      localStorage.setItem('jhe_config_aparencia', JSON.stringify(configSalva));
      return configSalva;
    }
    return configFormatada;
  }, [config]);

  const salvarAparencia = salvarConfiguracoes;
  const salvarGovernanca = salvarConfiguracoes;

  return (
    <ConfiguracoesContext.Provider
      value={{
        config,
        isLoading,
        error,
        recarregarConfiguracoes: carregarConfiguracoes,
        salvarAparencia,
        salvarGovernanca,
        salvarConfiguracoes
      }}
    >
      {children}
    </ConfiguracoesContext.Provider>
  );
}

export function useConfiguracoes() {
  const context = useContext(ConfiguracoesContext);
  if (!context) {
    throw new Error('useConfiguracoes deve ser utilizado dentro de um <ConfiguracoesProvider>');
  }
  return context;
}

// Alias para conformidade com a especificação técnica do cliente
export const useConfiguracoesStore = useConfiguracoes;
