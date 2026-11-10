import { useEffect, useRef } from 'react';

const DEFAULT_IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora (60 minutos)
const DEFAULT_THROTTLE_MS = 1000; // 1 segundo de throttle

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'click',
  'keydown',
  'scroll',
  'touchstart',
  'wheel'
];

/**
 * Hook de Logout Automático por Inatividade (Idle Session Timeout).
 * Monitora eventos globais na janela apenas quando `isAuthenticated` é verdadeiro,
 * aplicando throttle de 1 segundo para evitar recriações excessivas de timer.
 *
 * @param {Object|Function} optionsOrCallback Objeto `{ isAuthenticated, onIdle, timeoutMs, throttleMs }` ou função `onIdle`
 * @param {number} [positionalTimeoutMs] Tempo limite em ms (padrão: 3.600.000ms / 1h)
 * @param {boolean} [positionalIsAuthenticated] Se o monitoramento deve estar ativo
 */
export function useIdleTimeout(
  optionsOrCallback,
  positionalTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
  positionalIsAuthenticated = true
) {
  const isObjectConfig =
    typeof optionsOrCallback === 'object' && optionsOrCallback !== null;

  const isAuthenticated = isObjectConfig
    ? Boolean(optionsOrCallback.isAuthenticated)
    : Boolean(positionalIsAuthenticated);

  const onIdle = isObjectConfig ? optionsOrCallback.onIdle : optionsOrCallback;

  const timeoutMs = isObjectConfig
    ? optionsOrCallback.timeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS
    : positionalTimeoutMs;

  const throttleMs = isObjectConfig
    ? optionsOrCallback.throttleMs ?? DEFAULT_THROTTLE_MS
    : DEFAULT_THROTTLE_MS;

  const onIdleRef = useRef(onIdle);
  const timerIdRef = useRef(null);
  const lastActivityRef = useRef(0);

  // Mantém a referência da callback sempre atualizada sem reiniciar o listener
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    // Desativado no modo público/deslogado
    if (!isAuthenticated) {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
      return undefined;
    }

    const startOrResetTimer = () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
      timerIdRef.current = window.setTimeout(() => {
        if (typeof onIdleRef.current === 'function') {
          onIdleRef.current();
        }
      }, timeoutMs);
    };

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < throttleMs) {
        return;
      }
      lastActivityRef.current = now;
      startOrResetTimer();
    };

    // Inicia a contagem regressiva ao autenticar
    lastActivityRef.current = Date.now();
    startOrResetTimer();

    const listenerOptions = { passive: true };
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, listenerOptions);
    });

    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity, listenerOptions);
      });
    };
  }, [isAuthenticated, timeoutMs, throttleMs]);
}

export default useIdleTimeout;
