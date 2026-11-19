"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Moon, ShieldCheck, Sun } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

const LOGIN_EMAIL = "gavanghd@gmail.com";
const LOGIN_PASSWORD = "123456";
const AUTH_COOKIE = "chathub-auth";

export default function LoginPage() {
  const { settings } = useSettings();
  const systemName = typeof settings.general?.systemName === "string" && settings.general.systemName.trim()
    ? settings.general.systemName
    : "ChatHub";
  const [email, setEmail] = useState(LOGIN_EMAIL);
  const [password, setPassword] = useState(LOGIN_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("chathub-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = storedTheme ? storedTheme === "dark" : prefersDark;
    setDarkMode(shouldUseDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);

    if (document.cookie.split("; ").some((cookie) => cookie.startsWith(`${AUTH_COOKIE}=true`))) {
      window.location.replace("/inbox");
    }
  }, []);

  function toggleTheme() {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    document.documentElement.classList.toggle("dark", nextMode);
    window.localStorage.setItem("chathub-theme", nextMode ? "dark" : "light");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (email.trim().toLowerCase() !== LOGIN_EMAIL || password !== LOGIN_PASSWORD) {
      setError("Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.");
      return;
    }

    document.cookie = `${AUTH_COOKIE}=true; path=/; max-age=604800; SameSite=Lax`;
    window.localStorage.setItem("chathub-auth", "true");
    window.location.assign("/inbox");
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between">
        <div className="flex items-center" aria-label={systemName}>
          <div className="mr-2.5 flex h-10 w-11 items-center justify-center gap-1 rounded-xl rounded-tr-md bg-[#2B54C3] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">{systemName}</span>
          <span className="-ml-0.5 mb-3 h-1.5 w-1.5 rounded-full bg-[#2B54C3]" />
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-[#2B54C3] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          aria-label={darkMode ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </header>

      <section className="flex min-h-[calc(100vh-5rem)] items-start justify-center pb-10 pt-10 sm:pt-16">
        <div className="w-full max-w-md">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200/90 bg-white px-6 py-7 shadow-[0_12px_40px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 sm:px-8 sm:py-8"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2B54C3]">
              Chào mừng trở lại
            </p>
            <h1 className="mt-2 text-[32px] font-bold leading-tight text-slate-950 dark:text-white">
              Đăng nhập
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Tiếp tục vào không gian làm việc nội bộ.
            </p>

            {error && (
              <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="mt-6">
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2B54C3] focus:ring-4 focus:ring-[#2B54C3]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="mt-5">
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-[#2B54C3] focus:ring-4 focus:ring-[#2B54C3]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button type="button" className="text-sm font-medium text-[#2B54C3] hover:underline">
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2B54C3] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(43,84,195,0.22)] transition hover:bg-[#2448A8] active:scale-[0.99]"
            >
              Đăng nhập
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <footer className="mt-6 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              Kết nối an toàn tới không gian làm việc của bạn
            </p>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Developed by <span className="font-bold text-[#2B54C3]">CMSNT.CO</span>
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
