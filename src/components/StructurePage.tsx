import { Folder, File, Code2, Layers, Database, ShieldCheck, Terminal, Server } from 'lucide-react';

export default function StructurePage() {
  return (
    <div className="bg-brand-cream min-h-[calc(100vh-68px)] py-8 md:py-12 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full transition-colors duration-200">
      {/* Header Banner */}
      <div className="mb-8 p-6 sm:p-8 bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy">
                System Architecture &amp; File Structure
              </h1>
              <p className="text-xs sm:text-sm text-brand-ink2 font-medium mt-1">
                Full-Stack React 18 (Vite) + Express (Node.js) + MongoDB Mongoose production architecture.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Full-Stack Verified
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Directory Explorer Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0D1B2A] dark:bg-[#0B111A] text-[#E8E4DC] p-6 sm:p-8 rounded-2xl border border-brand-gold/25 shadow-xl font-mono text-xs sm:text-sm leading-relaxed overflow-hidden">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-brand-gold font-bold">
              <Terminal className="w-4 h-4" />
              <span>root / jkkniu-retriever /</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
              TypeScript ES2022
            </span>
          </div>

          <div className="pl-2 sm:pl-4 border-l border-white/15 flex flex-col gap-4 font-mono">
            {/* Server Directory */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Folder className="w-4 h-4 fill-amber-400/20" />
                <span>/server/</span>
                <span className="text-[10px] text-slate-400 font-normal">Backend REST API &amp; Auth</span>
              </div>
              <div className="pl-6 border-l border-white/10 space-y-1 text-slate-300 text-xs">
                <div className="flex items-center gap-2">
                  <File className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-amber-200">server.ts</span>
                  <span className="text-slate-400 text-[11px]">— Express bootstrapper &amp; middleware</span>
                </div>
                <div className="flex items-center gap-2">
                  <File className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-amber-200">db.ts</span>
                  <span className="text-slate-400 text-[11px]">— High-speed cache and data sync layer</span>
                </div>
                <div className="flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-amber-400/80" />
                  <span className="text-slate-200 font-semibold">/routes/</span>
                  <span className="text-slate-400 text-[11px]">— Auth, Items, Chat, Admin endpoints</span>
                </div>
                <div className="flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-amber-400/80" />
                  <span className="text-slate-200 font-semibold">/utils/</span>
                  <span className="text-slate-400 text-[11px]">— Nodemailer Gmail SMTP &amp; verification</span>
                </div>
              </div>
            </div>

            {/* Client Src Directory */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Folder className="w-4 h-4 fill-amber-400/20" />
                <span>/src/</span>
                <span className="text-[10px] text-slate-400 font-normal">React Frontend UI &amp; State</span>
              </div>
              <div className="pl-6 border-l border-white/10 space-y-1 text-slate-300 text-xs">
                <div className="flex items-center gap-2">
                  <File className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-amber-200">App.tsx</span>
                  <span className="text-slate-400 text-[11px]">— Main routing, state coordinator &amp; alerts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-amber-400/80" />
                  <span className="text-slate-200 font-semibold">/components/</span>
                  <span className="text-slate-400 text-[11px]">— Modular views (Browse, Post, Dashboard, Admin)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-amber-400/80" />
                  <span className="text-slate-200 font-semibold">/utils/</span>
                  <span className="text-slate-400 text-[11px]">— AI matchers, date formatters, validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <File className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-amber-200">types.ts</span>
                  <span className="text-slate-400 text-[11px]">— Unified TypeScript data contracts</span>
                </div>
              </div>
            </div>

            {/* Environment & Config */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Folder className="w-4 h-4 fill-slate-400/20" />
                <span>/config/</span>
              </div>
              <div className="pl-6 border-l border-white/10 space-y-1 text-slate-400 text-xs">
                <div className="flex items-center gap-2">
                  <File className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-200 font-semibold">.env</span>
                  <span className="text-slate-400 text-[11px]">— SMTP secrets, MongoDB URI, Port 3000</span>
                </div>
                <div className="flex items-center gap-2">
                  <File className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-300">package.json</span>
                  <span className="text-slate-400 text-[11px]">— Production scripts &amp; dependencies</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Highlights & Specifications */}
        <div className="space-y-4">
          <div className="p-5 bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Server className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-sm font-bold text-brand-navy">Server Layer</h2>
            </div>
            <p className="text-xs text-brand-ink2 font-medium leading-relaxed">
              Express 4.x running on port 3000 with custom middleware routing, token authorization, and automated MongoDB syncing.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Database className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-sm font-bold text-brand-navy">Database &amp; Models</h2>
            </div>
            <p className="text-xs text-brand-ink2 font-medium leading-relaxed">
              Resilient data layer with failover support, Mongoose schemas for Users, Lost &amp; Found Items, Claims, and Messages.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-sm font-bold text-brand-navy">Email Verification</h2>
            </div>
            <p className="text-xs text-brand-ink2 font-medium leading-relaxed">
              Nodemailer verified SMTP with Google App Passwords for real-time 6-digit OTP delivery to student inboxes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
