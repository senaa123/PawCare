"use client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";

export function useAuth() {
  const router = useRouter();
  const { token, user, setAuth, setUser, clearAuth } = useAuthStore();

  const isAuthenticated = !!token;

  async function fetchUser() {
    try {
      const { data } = await authApi.me();
      setUser(data);
      return data;
    } catch {
      clearAuth();
      router.push("/login");
    }
  }

  function logout() {
    clearAuth();
    router.push("/login");
  }

  return { user, token, isAuthenticated, logout, fetchUser };
}