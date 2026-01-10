import { useState, useEffect, useRef } from 'react';
import { DEBOUNCE } from '@/lib/constants';

/**
 * Hook para debouncing de valores
 * Otimizado para Safari - garante cleanup correto mesmo em desmontagens rápidas
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos (padrão: 300ms - DEBOUNCE.SEARCH)
 * @returns Valor debounced
 */
export function useDebounce<T>(value: T, delay: number = DEBOUNCE.SEARCH): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Limpar timeout anterior (importante para Safari)
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      // Só atualizar se o componente ainda estiver montado (evita warnings no Safari)
      if (isMountedRef.current) {
        setDebouncedValue(value);
      }
    }, delay);

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, delay]);

  return debouncedValue;
}
