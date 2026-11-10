/**
 * ============================================================================
 * JHE ORGANOGRAMA CORPORATIVO - CLIENTE HTTP E INTEGRAÇÃO DE API
 * ----------------------------------------------------------------------------
 * Arquivo: api.js
 * Módulo: Comunicação de Rede / Axios Client / Autenticação JWT
 * Função Principal: Configura a instância Axios com resolução dinâmica de URL
 * (Vercel Prod, Render Backend e Localhost Dev), injeção automática de token JWT
 * e tratamento transparente de 401 e cold-start.
 *
 * ----------------------------------------------------------------------------
 * GUIA RÁPIDO DE MANUTENÇÃO (ONDE EDITAR SE...):
 * • Alterar URL base ou fallback do Render: Linha ~35 (resolveApiBaseUrl)
 * • Configurar timeout (cold-start resiliente): Linha ~55 (timeout: 60000)
 * • Ajustar interceptor de autenticação JWT: Linha ~65 (api.interceptors.request)
 * • Tratar expiração de sessão / token inválido: Linha ~75 (api.interceptors.response)
 * • Funções de consulta de dados da árvore: Linhas ~100-150 (fetchFlatNodesList)
 * ============================================================================
 */

import axios from 'axios';

/**
 * Resolve a URL Base da API do Organograma com suporte robusto a múltiplos ambientes:
 * 1. Consome `import.meta.env.VITE_API_BASE_URL` se estiver definida.
 * 2. Em produção (ex: Vercel), caso a variável não tenha sido configurada, realiza
 *    fallback automático para a API oficial no Render: 'https://jhe-organograma-api.onrender.com/api'.
 * 3. Em desenvolvimento local, realiza fallback para '/api' (proxy do Vite apontando para localhost:3001).
 * 4. Trata e remove barras trailing duplicadas ('//') e garante que a URL termine com '/api'.
 */
function resolveApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

  let targetUrl = envUrl;
  if (!targetUrl) {
    targetUrl = import.meta.env.PROD
      ? 'https://jhe-organograma-api.onrender.com/api'
      : '/api';
  }

  // Remove barras no final para prevenir duplicidade de barras nas rotas
  targetUrl = targetUrl.replace(/\/+$/, '');

  // Se for uma URL absoluta HTTP(S) que não termina com /api, anexa '/api'
  if (/^https?:\/\//i.test(targetUrl) && !/\/api$/i.test(targetUrl)) {
    targetUrl = `${targetUrl}/api`;
  }

  return targetUrl;
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 60000, // 60s para suportar cold-start resiliente de instâncias Render
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para injetar o token JWT automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jhe_org_token') || sessionStorage.getItem('jhe_org_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de resposta: gerencia expiração de token (401) sem quebrar o acesso público
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      try {
        localStorage.removeItem('jhe_org_token');
        localStorage.removeItem('jhe_org_user');
        sessionStorage.removeItem('jhe_org_token');
        sessionStorage.removeItem('jhe_org_user');
      } catch (_) {}
    }
    return Promise.reject(error);
  }
);

/**
 * Busca a lista de nós do organograma (allNodesFlat) diretamente do banco MySQL
 * com suporte resiliente a reconexão automática e cold-start da API no Render.
 *
 * @param {number} maxRetries Número máximo de tentativas (padrão: 3)
 * @param {Function} onProgress Callback para atualizar status na interface (mensagem)
 */
export async function fetchFlatNodesList(maxRetries = 3, onProgress = null) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    try {
      if (attempt > 0 && typeof onProgress === 'function') {
        onProgress(`Conectando à API na nuvem... (Tentativa ${attempt + 1}/${maxRetries + 1})`);
      }

      const { data } = await api.get('/organograma/arvore');
      const nos = Array.isArray(data) ? data : data?.nos || [];
      let niveis = data?.niveis || [];

      if (!niveis.length) {
        try {
          const resNiveis = await api.get('/organograma/niveis');
          niveis = Array.isArray(resNiveis.data) ? resNiveis.data : resNiveis.data?.niveis || [];
        } catch {
          // Mantém níveis padrão se rota secundária falhar
        }
      }

      return {
        nos,
        niveis
      };
    } catch (error) {
      lastError = error;
      attempt++;

      if (attempt <= maxRetries) {
        const delay = Math.min(attempt * 2500, 6000); // 2.5s, 5s, 6s
        if (typeof onProgress === 'function') {
          onProgress(`Aguardando inicialização do servidor Render (${attempt}/${maxRetries})...`);
        }
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  throw lastError || new Error('Falha ao obter estrutura organizacional da API.');
}

/**
 * Busca os 10 níveis hierárquicos institucionais da JHE Engenharia
 */
export async function fetchNiveisHierarquicos() {
  const { data } = await api.get('/organograma/niveis');
  return data?.niveis || [];
}

/**
 * Cria um novo nó no organograma (POST /api/organograma/nos)
 */
export async function createNode(payload) {
  const { data } = await api.post('/organograma/nos', payload);
  return data;
}

/**
 * Atualiza um nó existente no organograma (PUT /api/organograma/nos/:id)
 */
export async function updateNode(id, payload) {
  const { data } = await api.put(`/organograma/nos/${id}`, payload);
  return data;
}

/**
 * Remove um nó e seus subordinados (DELETE /api/organograma/nos/:id)
 */
export async function deleteNode(id) {
  const { data } = await api.delete(`/organograma/nos/${id}`);
  return data;
}

/**
 * Movimenta um nó para novo nó pai com reordenação (PATCH /api/organograma/nos/:id/mover)
 */
export async function moveNode(id, payload) {
  const { data } = await api.patch(`/organograma/nos/${id}/mover`, payload);
  return data;
}

/**
 * Sincroniza em lote os níveis hierárquicos institucionais (PUT /api/organograma/niveis)
 */
export async function saveNiveisHierarquicos(niveis) {
  const { data } = await api.put('/organograma/niveis', { niveis });
  return data;
}

/**
 * Busca as configurações ativas de aparência e identidade do sistema (GET /api/configuracoes/aparencia)
 */
export async function fetchConfiguracoesAparencia() {
  const { data } = await api.get('/configuracoes/aparencia');
  return data?.configuracoes || null;
}

/**
 * Salva e persiste títulos, tag e logotipos do sistema (PUT /api/configuracoes/aparencia)
 */
export async function saveConfiguracoesAparencia(payload) {
  const { data } = await api.put('/configuracoes/aparencia', payload);
  return data?.configuracoes || data;
}

/**
 * Busca políticas de governança e conformidade (GET /api/configuracoes/governanca)
 */
export async function fetchConfiguracoesGovernanca() {
  const { data } = await api.get('/configuracoes/governanca');
  return data?.configuracoes || null;
}

/**
 * Salva e persiste políticas de governança e conformidade (PUT /api/configuracoes/governanca)
 */
export async function saveConfiguracoesGovernanca(payload) {
  const { data } = await api.put('/configuracoes/governanca', payload);
  return data?.configuracoes || data;
}

export default api;
