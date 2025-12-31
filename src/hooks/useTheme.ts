import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

/**
 * Hook para gerenciar o tema (light/dark/system)
 *
 * 🎨 DARK MODE: Gerencia preferência de tema com persistência
 * - Salva preferência no localStorage
 * - Detecta preferência do sistema (prefers-color-scheme)
 * - Aplica classe "dark" no documento
 * - Transição suave entre temas
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Ler preferência salva ou usar "system" como padrão
    const saved = localStorage.getItem("theme") as Theme | null;
    return saved || "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = window.document.documentElement;

    // Remover classes anteriores
    root.classList.remove("light", "dark");

    let effectiveTheme: "light" | "dark";

    if (theme === "system") {
      // Detectar preferência do sistema
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      effectiveTheme = systemTheme;
    } else {
      effectiveTheme = theme;
    }

    // Aplicar tema
    root.classList.add(effectiveTheme);
    setResolvedTheme(effectiveTheme);

    // Adicionar transição suave
    root.style.setProperty("color-scheme", effectiveTheme);
  }, [theme]);

  useEffect(() => {
    // Listener para mudanças na preferência do sistema
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        const systemTheme = mediaQuery.matches ? "dark" : "light";
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(systemTheme);
        setResolvedTheme(systemTheme);
      }
    };

    // Adicionar listener
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme]);

  const setThemeWithPersist = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return {
    theme,
    resolvedTheme,
    setTheme: setThemeWithPersist,
  };
}
