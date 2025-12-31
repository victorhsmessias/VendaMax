import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCurrentUser, useCurrentUserId, useIsAuthenticated, invalidateCurrentUser } from "./useCurrentUser";
import { supabase } from "@/integrations/supabase/client";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Helper para criar wrapper do React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar o usuário autenticado com sucesso", async () => {
    const mockUser = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "usuario@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2025-01-01T00:00:00Z",
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("deve lançar erro quando usuário não está autenticado", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
    expect((result.current.error as Error).message).toContain("não autenticado");
  });

  it("deve lançar erro quando há erro do Supabase", async () => {
    const mockError = {
      message: "Erro de autenticação",
      status: 401,
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: mockError,
    } as any);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
    expect((result.current.error as Error).message).toContain("Erro ao obter usuário");
  });

  it("deve cachear o resultado indefinidamente", async () => {
    const mockUser = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "usuario@example.com",
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    const { result, rerender } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const callCount = vi.mocked(supabase.auth.getUser).mock.calls.length;

    // Re-renderizar não deve fazer nova chamada
    rerender();

    expect(vi.mocked(supabase.auth.getUser).mock.calls.length).toBe(callCount);
  });
});

describe("useCurrentUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar apenas o ID do usuário", async () => {
    const mockUser = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "usuario@example.com",
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    const { result } = renderHook(() => useCurrentUserId(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("deve retornar undefined quando não autenticado", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    const { result } = renderHook(() => useCurrentUserId(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
  });
});

describe("useIsAuthenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar isAuthenticated: true quando usuário está autenticado", async () => {
    const mockUser = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "usuario@example.com",
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    const { result } = renderHook(() => useIsAuthenticated(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
  });

  it("deve retornar isAuthenticated: false quando não autenticado", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    const { result } = renderHook(() => useIsAuthenticated(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
  });

  it("deve retornar isLoading: true durante carregamento", () => {
    vi.mocked(supabase.auth.getUser).mockReturnValue(
      new Promise(() => {}) as any
    );

    const { result } = renderHook(() => useIsAuthenticated(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe("invalidateCurrentUser", () => {
  it("deve invalidar o cache do usuário", () => {
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateCurrentUser(queryClient);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["currentUser"],
    });
  });
});
