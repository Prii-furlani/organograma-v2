import React, { useState, useEffect } from 'react';
import { Network, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import JheLogo from './JheLogo';

/**
 * Componente Executivo Minimalista de Autenticação - JHE Organograma
 *
 * @param {Object} props
 * @param {boolean} [props.isOpen=true] - Controla a visibilidade no modo modal
 * @param {boolean} [props.isModal=true] - Define se exibe como modal com backdrop ou tela cheia
 * @param {Function} [props.onClose] - Callback para fechar o modal
 * @param {Function} [props.onLogin] - Callback customizado ({ email, senha, lembrarDeMim })
 * @param {Function} [props.onBackToPublic] - Callback de retorno ao mapa público
 */
export default function LoginModal({
  isOpen = true,
  isModal = true,
  onClose,
  onLogin,
  onBackToPublic
}) {
  const auth = useAuth() || {};
  const realizarLogin = auth.realizarLogin || auth.login || (async () => ({}));

  // Estados iniciam estritamente vazios sem nenhuma credencial hardcoded
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('jhe_remembered_email') || '';
    } catch {
      return '';
    }
  });
  const [senha, setSenha] = useState('');
  const [lembrarDeMim, setLembrarDeMim] = useState(() => {
    try {
      return Boolean(localStorage.getItem('jhe_remembered_email'));
    } catch {
      return false;
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Limpeza de segurança e reset do formulário ao abrir ou fechar o modal
  useEffect(() => {
    // Remove qualquer chave legada que possa ter salvo senhas indevidamente
    try {
      localStorage.removeItem('jhe_remembered_password');
      localStorage.removeItem('jhe_login_password');
      sessionStorage.removeItem('jhe_remembered_password');
      sessionStorage.removeItem('jhe_login_password');
    } catch (_) {}

    setSenha('');
    setErrorMessage('');
    setShowPassword(false);

    if (isOpen) {
      try {
        const remembered = localStorage.getItem('jhe_remembered_email') || '';
        if (remembered) {
          setEmail(remembered);
          setLembrarDeMim(true);
        } else {
          setEmail('');
          setLembrarDeMim(false);
        }
      } catch {
        setEmail('');
      }
    }
  }, [isOpen]);

  if (isModal && !isOpen) return null;

  const handleBack = () => {
    setSenha('');
    setErrorMessage('');
    setShowPassword(false);
    if (onBackToPublic) {
      onBackToPublic();
    } else if (onClose) {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (lembrarDeMim && email.trim()) {
        localStorage.setItem('jhe_remembered_email', email.trim());
      } else {
        localStorage.removeItem('jhe_remembered_email');
      }

      if (onLogin) {
        await onLogin({ email, senha, lembrarDeMim });
      } else if (realizarLogin) {
        await realizarLogin(email, senha, lembrarDeMim);
      }
      setSenha('');
      if (onClose) onClose();
    } catch (err) {
      const msg =
        err.response?.data?.mensagem ||
        err.message ||
        'Não foi possível autenticar. Verifique suas credenciais.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const containerClasses = isModal
    ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs transition-opacity animate-fadeIn'
    : 'min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 via-slate-100/70 to-slate-200/50';

  return (
    <div className={containerClasses}>
      {/* Card Principal de Autenticação */}
      <div
        className="w-full max-w-[440px] bg-white rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(14,40,78,0.08)] border border-slate-100 transition-all"
        style={{ borderRadius: '28px' }}
      >
        {/* Faixa Decorativa no Topo (3.5px) — Gradiente Azul Marinho para Ciano */}
        <div
          className="h-[3.5px] w-full"
          style={{
            background: 'linear-gradient(90deg, #0E284E 0%, #194775 50%, #61CBE8 100%)'
          }}
        />

        <div className="px-8 pt-10 pb-8">
          {/* Cabeçalho: Logotipo Oficial JHE Engenharia */}
          <div className="flex justify-center mb-4">
            <JheLogo className="h-16 w-auto" variant="default" />
          </div>

          {/* Título Principal */}
          <h2 className="text-xl font-bold tracking-tight text-center text-[#0E284E]">
            Organograma Corporativo
          </h2>

          {/* Subtítulo Institucional */}
          <p className="text-[10px] font-semibold tracking-wider text-slate-400 text-center mt-1 mb-8 uppercase">
            Sistema de Gestão & Governança Institucional
          </p>

          {/* Alerta de Mensagem de Erro */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 bg-rose-50 border border-rose-200/80 text-rose-700 animate-fadeIn"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {/* Formulário de Acesso */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Campo: E-mail / Usuário */}
            <div>
              <label
                htmlFor="login-email"
                className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-2"
              >
                E-mail / Usuário <span className="text-rose-600 font-extrabold ml-0.5">*</span>
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@jhe.com.br"
                className="w-full h-12 px-4 rounded-xl text-sm text-slate-800 placeholder-slate-400 bg-slate-100/70 border border-slate-200/50 focus:bg-white focus:border-sky-300 focus:ring-4 focus:ring-sky-100/60 focus:outline-none transition-all"
              />
            </div>

            {/* Campo: Senha de Acesso */}
            <div>
              <label
                htmlFor="login-password"
                className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-2"
              >
                Senha de Acesso <span className="text-rose-600 font-extrabold ml-0.5">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-4 pr-11 rounded-xl text-sm text-slate-800 placeholder-slate-400 bg-slate-100/70 border border-slate-200/50 focus:bg-white focus:border-sky-300 focus:ring-4 focus:ring-sky-100/60 focus:outline-none transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 p-1 rounded-md text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-700 cursor-pointer transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Opção de Persistência (Checkbox) */}
            <div className="pt-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  id="login-remember"
                  checked={lembrarDeMim}
                  onChange={(e) => setLembrarDeMim(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-300 text-[#0E284E] focus:ring-2 focus:ring-sky-200 cursor-pointer accent-[#0E284E]"
                />
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">
                  Lembrar de mim neste dispositivo
                </span>
              </label>
            </div>

            {/* Botão Principal de Ação */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl text-xs font-semibold tracking-wider uppercase text-white bg-[#0E284E] hover:bg-[#194775] hover:shadow-lg hover:shadow-blue-950/20 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer shadow-sm"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Acessando...</span>
                  </span>
                ) : (
                  <span>Acessar Painel</span>
                )}
              </button>
            </div>
          </form>

          {/* Ação de Retorno (Rodapé) */}
          <button
            type="button"
            onClick={handleBack}
            className="w-full mt-6 text-[11px] font-semibold tracking-wider uppercase text-slate-400 hover:text-slate-700 transition-colors text-center cursor-pointer focus:outline-none"
          >
            ← Voltar ao Mapa Público
          </button>
        </div>
      </div>
    </div>
  );
}
