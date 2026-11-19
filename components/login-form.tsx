"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, MessageCircle, Moon, ShieldCheck, Sun } from "lucide-react";

const DEMO_EMAIL = "gavanghd@gmail.com";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { setDarkMode(localStorage.getItem("chathub-theme") === "dark"); }, []);
  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      localStorage.setItem("chathub-theme", next ? "dark" : "light");
      return next;
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Email hoặc mật khẩu không chính xác."); return; }
      router.replace("/dashboard"); router.refresh();
    } catch { setError("Không thể kết nối. Vui lòng thử lại."); }
    finally { setLoading(false); }
  }

  const pageTheme = darkMode ? "bg-slate-950 text-slate-100" : "bg-[#F8FAFC] text-slate-900";
  return <main className={`flex min-h-screen flex-col px-4 transition-colors duration-300 sm:px-6 ${pageTheme}`}>
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between py-5 sm:py-7"><a href="/login" className="inline-flex items-center gap-2.5" aria-label="ChatHub — trang đăng nhập"><span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#2B54C3] text-white shadow-sm"><MessageCircle className="h-5 w-5 fill-white" strokeWidth={2.2}/><span className="absolute flex gap-0.5"><i className="h-1 w-1 rounded-full bg-[#2B54C3]"/><i className="h-1 w-1 rounded-full bg-[#2B54C3]"/><i className="h-1 w-1 rounded-full bg-[#2B54C3]"/></span></span><span className="text-[21px] font-bold tracking-tight">Chat<span className="text-[#2B54C3]">Hub</span><span className="text-[#2B54C3]">.</span></span></a><button type="button" onClick={toggleTheme} className={`flex h-10 w-10 items-center justify-center rounded-xl border transition hover:border-[#2B54C3] ${darkMode ? "border-slate-700 bg-slate-900 text-amber-300" : "border-slate-200 bg-white text-slate-600"}`} aria-label={darkMode ? "Bật giao diện sáng" : "Bật giao diện tối"}>{darkMode ? <Moon className="h-[18px] w-[18px]"/> : <Sun className="h-[18px] w-[18px]"/>}</button></header>
    <section className="flex flex-1 items-center justify-center py-8 sm:py-10"><div className={`w-full max-w-md rounded-2xl border p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-8 ${darkMode ? "border-slate-800 bg-slate-900 shadow-black/20" : "border-slate-200 bg-white"}`}><p className="text-xs font-bold tracking-[0.2em] text-[#2B54C3]">CHÀO MỪNG TRỞ LẠI</p><h1 className={`mt-3 text-3xl font-bold tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>Đăng nhập</h1><p className={`mt-2 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Tiếp tục vào không gian làm việc nội bộ.</p><div className="mt-6 flex gap-3 rounded-xl border border-[#E6C994] bg-[#FDF6E7] p-3.5 text-sm leading-5 text-[#73521C]" role="note"><Eye className="mt-0.5 h-[18px] w-[18px] shrink-0"/><p>Đây là bản demo: tài khoản dùng thử đã điền sẵn, bạn chỉ cần bấm đăng nhập. Mọi thao tác thêm, sửa, xoá đều bị khoá.</p></div><form onSubmit={submit} className="mt-6 space-y-4"><div><label htmlFor="email" className={`mb-1.5 block text-sm font-medium ${darkMode ? "text-slate-200" : "text-slate-700"}`}>Email</label><input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className={`h-12 w-full rounded-xl border px-3.5 text-sm outline-none transition focus:border-[#2B54C3] focus:ring-4 focus:ring-blue-500/10 ${darkMode ? "border-slate-700 bg-slate-800 text-white" : "border-slate-200 bg-slate-50 text-slate-900"}`}/></div><div><label htmlFor="password" className={`mb-1.5 block text-sm font-medium ${darkMode ? "text-slate-200" : "text-slate-700"}`}>Mật khẩu</label><div className="relative"><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={`h-12 w-full rounded-xl border px-3.5 pr-12 text-sm outline-none transition focus:border-[#2B54C3] focus:ring-4 focus:ring-blue-500/10 ${darkMode ? "border-slate-700 bg-slate-800 text-white" : "border-slate-200 bg-slate-50 text-slate-900"}`}/><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <EyeOff className="h-[18px] w-[18px]"/> : <Eye className="h-[18px] w-[18px]"/>}</button></div><div className="mt-2 text-right"><a href="mailto:support@cmsnt.co?subject=Qu%C3%AAn%20m%E1%BA%ADt%20kh%E1%BA%A9u" className="text-sm font-medium text-[#2B54C3]">Quên mật khẩu?</a></div></div>{error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}<button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2B54C3] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2348AA] disabled:cursor-wait disabled:opacity-70">{loading ? "Đang đăng nhập…" : "Đăng nhập"}<ArrowRight className="h-[18px] w-[18px]"/></button></form></div></section>
    <footer className={`mx-auto w-full max-w-7xl pb-6 text-center text-xs sm:pb-7 ${darkMode ? "text-slate-400" : "text-slate-500"}`}><p className="flex items-center justify-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500"/>Kết nối an toàn tới không gian làm việc của bạn</p><p className="mt-2">Developed by <span className="font-bold text-[#2B54C3]">CMSNT.CO</span></p></footer>
  </main>;
}
