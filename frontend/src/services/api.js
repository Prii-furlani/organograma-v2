import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
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
