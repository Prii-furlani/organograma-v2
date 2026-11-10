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
  timeout: 20000,
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

/**
 * Busca a lista de nós do organograma (allNodesFlat) diretamente do banco MySQL
 */
export async function fetchFlatNodesList() {
  const { data } = await api.get('/organograma/arvore');
  const nos = Array.isArray(data) ? data : data?.nos || [];
  let niveis = data?.niveis || [];
  if (!niveis.length) {
    try {
      const resNiveis = await api.get('/organograma/niveis');
      niveis = Array.isArray(resNiveis.data) ? resNiveis.data : resNiveis.data?.niveis || [];
    } catch {
      // fallback
    }
  }
  return {
    nos,
    niveis
  };
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
