import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function FirstAccessPasswordModal({ isOpen, onPasswordChanged }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const passwordsMatch = novaSenha.length > 0 && novaSenha === confirmarSenha;
  const isLengthValid = novaSenha.length >= 6;
  const canSubmit = isLengthValid && passwordsMatch && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/primeiro-acesso', { nova_senha: novaSenha });
      if (data.sucesso) {
        onPasswordChanged();
      } else {
        setError(data.mensagem || 'Falha ao atualizar senha.');
      }
    } catch (err) {
      setError(err.response?.data?.mensagem || 'Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {/* Faixa decorativa JHE */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#0E284E] via-[#61CBE8] to-[#B4783C]" />

        <div className="p-8">
          {/* Ícone de Cadeado de Segurança */}
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 bg-sky-50 dark:bg-slate-800 border border-sky-100 dark:border-slate-700 flex items-center justify-center text-[#0E284E] dark:text-[#61CBE8]">
            <Lock className="w-7 h-7" />
          </div>

          <div className="text-center mb-6">
            <span className="text-[10px] font-bold text-[#B4783C] uppercase tracking-widest">
              SEGURANÇA CORPORATIVA
            </span>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
              Definir Nova Senha
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Por motivos de governança, você precisa cadastrar uma senha pessoal definitiva para o seu primeiro acesso.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Nova Senha */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Nova Senha <span className="text-rose-600 font-extrabold ml-0.5">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#61CBE8]/40 focus:border-[#61CBE8] outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Campo Confirmar Nova Senha */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Confirmar Nova Senha <span className="text-rose-600 font-extrabold ml-0.5">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#61CBE8]/40 focus:border-[#61CBE8] outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Requisitos visuais em tempo real */}
            <div className="space-y-1.5 pt-1 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  size={14}
                  className={isLengthValid ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}
                />
                <span>Mínimo de 6 caracteres</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  size={14}
                  className={passwordsMatch ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}
                />
                <span>Senhas coincidem</span>
              </div>
            </div>

            {/* Botão de Submissão */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full mt-2 py-3 rounded-xl font-semibold text-xs text-white uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-md ${
                canSubmit
                  ? 'bg-[#0E284E] hover:bg-[#194775] cursor-pointer'
                  : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500'
              }`}
            >
              {loading ? (
                <span>Salvando nova senha...</span>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Salvar Nova Senha</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
