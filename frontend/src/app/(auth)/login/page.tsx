"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import type { AxiosError } from "axios";

const schema = z.object({
  email:    z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw]         = useState(false);
  const [serverErr, setServerErr]   = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerErr("");
    try {
      const { data: tokens } = await authApi.login(data.email, data.password);

      // ✅ Store token before /auth/me so the interceptor can attach it
      localStorage.setItem("access_token", tokens.access_token);

      const { data: user } = await authApi.me();
      setAuth(tokens.access_token, user);
      router.push("/dashboard");
    } catch (err) {
      const e = err as AxiosError<{ detail: string }>;
      localStorage.removeItem("access_token"); // clean up on any failure
      setServerErr(e.response?.data?.detail ?? "Incorrect email or password.");
    }
  }

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-3xl font-bold text-text">Sign in</h2>
      <p className="text-text-muted mt-1 mb-8">Welcome back — your cats are waiting 🐱</p>

      {serverErr && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm">
          {serverErr}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Email */}
        <div>
          <label className="label">Email address</label>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={cn("input-field", errors.email && "input-error")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className={cn("input-field pr-12", errors.password && "input-error")}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light hover:text-text-muted transition-colors"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-2 py-3"
        >
          {isSubmitting ? (
            <><Loader2 size={18} className="animate-spin" /> Signing in…</>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-text-muted text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-pawblue-dark font-semibold hover:underline">
          Create one free
        </Link>
      </p>
    </div>
  );
}