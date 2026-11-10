import React, { createContext, useContext, useState } from 'react';
import api from '../services/api';

const defaultAuthFallback = {
  usuario: null,
  isAuthenticated: false,
  canManage: false,
  realizarLogin: async () => ({ sucesso: false }),
  realizarLogout: () => {},
  atualizarPrimeiroAcessoConcluido: () => {}
};

const AuthContext = createContext(defaultAuthFallback);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const saved = localStorage.getItem('jhe_org_user') || sessionStorage.getItem('jhe_org_user');
    return saved ? JSON.parse(saved) : null;
  });

  const isAuthenticated = Boolean(usuario && usuario.role_global);
  const canManage = isAuthenticated && ['admin', 'diretor', 'coordenador'].includes(usuario.role_global);

  const realizarLogin = async (email, senha, lembrarDeMim = true) => {
    console.log('[LOGIN SUBMIT] Enviando:', { email });
    const response = await api.post('/auth/login', { email, senha });
    const { data } = response;
    console.log('[LOGIN RESPONSE]', response.status, data);

    if (data.sucesso) {
      const targetStorage = lembrarDeMim ? localStorage : sessionStorage;
      const alternateStorage = lembrarDeMim ? sessionStorage : localStorage;

      alternateStorage.removeItem('jhe_org_token');
      alternateStorage.removeItem('jhe_org_user');

      targetStorage.setItem('jhe_org_token', data.token);
      targetStorage.setItem('jhe_org_user', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
    }
    return { ...data, status: response.status };
  };

  const realizarLogout = () => {
    localStorage.removeItem('jhe_org_token');
    localStorage.removeItem('jhe_org_user');
    sessionStorage.removeItem('jhe_org_token');
    sessionStorage.removeItem('jhe_org_user');
    setUsuario(null);
  };

  const atualizarPrimeiroAcessoConcluido = () => {
    setUsuario((prev) => {
      if (!prev) return null;
      const updated = { ...prev, primeiro_acesso: false };
      if (localStorage.getItem('jhe_org_user')) {
        localStorage.setItem('jhe_org_user', JSON.stringify(updated));
      }
      if (sessionStorage.getItem('jhe_org_user')) {
        sessionStorage.setItem('jhe_org_user', JSON.stringify(updated));
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        isAuthenticated,
        canManage,
        realizarLogin,
        realizarLogout,
        atualizarPrimeiroAcessoConcluido
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context || defaultAuthFallback;
}
