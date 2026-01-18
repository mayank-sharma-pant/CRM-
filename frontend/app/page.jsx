'use client';

import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useState, useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import { VARIANTS, TRANSITIONS } from '../lib/motion';
import {
  BarChart3,
  Zap,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Users,
  Clock,
  ChevronRight,
  Terminal,
  Activity
} from 'lucide-react';

const VIEWPORT = { once: true, margin: "-10%" };

export default function Landing() {
  const { user } = useAuth();

  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit="exit"
      variants={VARIANTS.page}
      className="min-h-screen bg-page text-primary font-sans selection:bg-indigo-500/30 selection:text-indigo-600 dark:selection:text-indigo-400 overflow-x-hidden flex flex-col md:flex-row"
    >
      <Sidebar user={user} />
      <MobileHeader user={user} />

      <main className="flex-1 w-full relative md:pl-64">
        <HeroSection />
        <TransformationSection />
        <ProductScrollyTelling />
        <CoreCapabilities />
        <IntegrationsSection />
        <DifferentiationSection />
        <TestimonialsSection />
        <TrustSection />
        <FinalCTA />
        <Footer />
      </main>
    </motion.div>
  );
}

// ===============================================
// SECTION COMPONENTS
// ===============================================

function Sidebar({ user }) {
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ ...TRANSITIONS.heavy, delay: 0.2 }}
      className="fixed top-0 left-0 bottom-0 w-64 bg-white/80 dark:bg-[#0B1120]/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col z-50 p-6"
    >
      <div className="flex items-center gap-3 font-bold text-slate-900 dark:text-white mb-12">
        <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <LayoutDashboard size={18} strokeWidth={3} />
        </div>
        <span className="tracking-tight text-lg">CRM.pro</span>
      </div>

      <nav className="flex-1 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg font-medium text-sm">
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>
        {[
          { icon: <Users size={18} />, label: "Leads" },
          { icon: <Clock size={18} />, label: "Follow-ups" },
          { icon: <BarChart3 size={18} />, label: "Reports" },
          { icon: <Terminal size={18} />, label: "Settings" }
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer group">
            {item.icon}
            <span className="font-medium text-sm">{item.label}</span>
            <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Theme</span>
          <ThemeToggle />
        </div>
        {!user ? (
          <>
            <Link href="/login" className="flex items-center justify-center w-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="flex items-center justify-center w-full bg-slate-900 dark:bg-slate-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
              Get Started
            </Link>
          </>
        ) : (
          <Link href="/login" className="flex items-center justify-center w-full bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all">
            Dashboard
          </Link>
        )}
      </div>
    </motion.aside>
  );
}

function MobileHeader({ user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-[#0B1120]/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-3 font-bold text-slate-900 dark:text-white">
          <div className="w-8 h-8 bg-slate-900 dark:bg-slate-700 rounded-lg flex items-center justify-center text-white">
            <LayoutDashboard size={18} strokeWidth={3} />
          </div>
          <span className="tracking-tight text-lg">CRM.pro</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[73px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl z-40 p-6">
          <nav className="space-y-2">
            {!user ? (
              <>
                <Link
                  href="/login"
                  className="block px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="block px-4 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-medium text-center hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </>
            ) : (
              <Link
                href="/sales/dashboard"
                className="block px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

function HeroSection() {
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 1000], [0, 150]);

  return (
    <section className="relative pt-40 pb-20 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-white dark:bg-[#020617] -z-20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(79,70,229,0.15),rgba(0,0,0,0))] -z-10" />

      <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div
          variants={VARIANTS.header}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 backdrop-blur text-sm font-medium text-slate-600 dark:text-slate-400 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          v2.4 System Online
        </motion.div>

        <h1 className="text-6xl md:text-9xl font-bold tracking-tighter text-slate-900 dark:text-white leading-[0.9] mb-8">
          <span className="block overflow-hidden">
            <motion.span
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              transition={{ ...TRANSITIONS.heavy, delay: 0.1 }}
              className="block"
            >
              SYSTEM
            </motion.span>
          </span>
          <span className="block overflow-hidden text-indigo-600 dark:text-indigo-500">
            <motion.span
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              transition={{ ...TRANSITIONS.heavy, delay: 0.25 }}
              className="block"
            >
              ONLINE ALPHA.
            </motion.span>
          </span>
        </h1>

        <motion.p
          variants={VARIANTS.card}
          className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
        >
          The operating system for modern service businesses. <br />
          Stop managing. Start executing.
        </motion.p>

        <motion.div
          style={{ y: yParallax }}
          initial={{ opacity: 0, scale: 0.95, rotateX: 10 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ ...TRANSITIONS.heavy, delay: 0.5 }}
          className="mt-16 w-full max-w-6xl perspective-2000"
        >
          <div className="relative rounded-2xl bg-slate-950 border border-slate-800 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden aspect-[21/9] ring-1 ring-white/10 group">
            {/* UI Mockup Content */}
            <div className="absolute inset-0 bg-[#0B1120] flex p-1">
              <div className="w-24 md:w-64 bg-[#020617] border-r border-slate-800 flex flex-col p-4 gap-2 shrink-0">
                <div className="flex items-center gap-3 px-3 py-2 text-indigo-400 bg-indigo-500/10 rounded-lg mb-2">
                  <LayoutDashboard size={16} />
                  <span className="font-bold text-xs hidden md:block">Dashboard</span>
                </div>
                {[{ icon: <Users size={16} /> }, { icon: <Clock size={16} /> }, { icon: <BarChart3 size={16} /> }].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 text-slate-500 rounded-lg">
                    {item.icon}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-8 relative overflow-hidden">
                <div className="grid grid-cols-3 gap-6 h-full">
                  <div className="col-span-2 space-y-6">
                    <div className="h-32 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-6 relative">
                      <div className="text-4xl font-bold text-white">$42,850.00</div>
                    </div>
                    <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl flex items-end px-6 gap-2 pb-0 pt-12">
                      {[30, 50, 45, 75, 55, 90, 60, 95, 80].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          viewport={{ once: true }}
                          transition={{ ...TRANSITIONS.fast, delay: 0.8 + (i * 0.05) }}
                          className="flex-1 bg-indigo-600 opacity-80 rounded-t"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TransformationSection() {
  return (
    <section className="py-24 bg-slate-900 text-white relative border-y border-slate-800 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={VARIANTS.card}
        >
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8 text-slate-500">
            You are drowning in <span className="text-slate-400 line-through decoration-slate-600">chaos</span>.
          </h2>
          <div className="space-y-6 opacity-50">
            <div className="flex gap-4 items-center">
              <Clock className="text-slate-500" />
              <div className="font-bold text-slate-300">Missed Follow-ups</div>
            </div>
            <div className="flex gap-4 items-center">
              <Users className="text-slate-500" />
              <div className="font-bold text-slate-300">Leads Slipping</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={VARIANTS.card}
          className="relative"
        >
          <div className="absolute -left-10 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500" />
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8 text-white">
            We build <span className="text-indigo-500">clarity</span>.
          </h2>
          <p className="text-xl text-slate-300 leading-relaxed">
            Turn your business into a machine. Every lead tracked. Every dollar accounted for. No guessing.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function ProductScrollyTelling() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const [activeStep, setActiveStep] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.25 && activeStep !== 0) setActiveStep(0);
    else if (latest >= 0.25 && latest < 0.6 && activeStep !== 1) setActiveStep(1);
    else if (latest >= 0.6 && activeStep !== 2) setActiveStep(2);
  });

  return (
    <section ref={containerRef} className="h-[130vh] bg-slate-50 dark:bg-[#0B1120] relative">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-12">
            {[0, 1, 2].map((step) => (
              <div key={step} className={`transition-all duration-500 ${activeStep === step ? 'opacity-100 scale-100' : 'opacity-30 scale-95'}`}>
                <h3 className={`text-4xl font-bold mb-4 ${activeStep === step ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-700'}`}>
                  {step === 0 ? "01. Capture" : step === 1 ? "02. Execute" : "03. Scale"}
                </h3>
                <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
                  {step === 0 ? "Leads land instantly. Know their details before you pick up." :
                    step === 1 ? "Click to quote. System moves the lead throughout pipeline." :
                      "Watch the dashboard. Spot bottlenecks. Total control."}
                </p>
              </div>
            ))}
          </div>

          <div className="relative h-[500px] bg-white dark:bg-[#020617] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex">
            {/* Scrollytelling Visuals Logic Preserved */}
            <div className="flex-1 p-8 flex flex-col relative">
              <div className="absolute top-0 right-0 p-8">
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-500 ${activeStep === 0 ? "bg-blue-100 text-blue-700" : activeStep === 1 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {activeStep === 0 ? "NEW LEAD" : activeStep === 1 ? "IN PROGRESS" : "WON DEAL"}
                </div>
              </div>
              <div className="mt-20 space-y-6">
                <motion.div animate={{ opacity: 1, x: 0 }} className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 transition-all duration-500 ${activeStep >= 0 ? 'opacity-100 translate-x-0' : 'opacity-50 translate-x-4'}`}>
                  <div className="text-xs font-bold text-blue-500 mb-1">INQUIRY</div>
                  <p className="text-sm dark:text-slate-300">"Looking for a quote on a master bath."</p>
                </motion.div>
                <motion.div animate={{ opacity: activeStep >= 1 ? 1 : 0.2, scale: activeStep >= 1 ? 1 : 0.95 }} className="p-4 rounded-xl border border-amber-200/20 bg-amber-50/10 dark:bg-amber-900/10 transition-all duration-500">
                  <div className="text-xs font-bold text-amber-500 mb-1">ESTIMATE</div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded overflow-hidden">
                    <motion.div className="h-full bg-amber-500" initial={{ width: 0 }} animate={{ width: activeStep >= 1 ? "60%" : "0%" }} />
                  </div>
                </motion.div>
                <motion.div animate={{ opacity: activeStep >= 2 ? 1 : 0, y: activeStep >= 2 ? 0 : 20 }} className="bg-emerald-600 text-white p-6 rounded-xl shadow-lg text-center transition-all duration-500">
                  <div className="text-3xl font-bold">$12,400</div>
                  <div className="text-xs font-medium uppercase tracking-widest opacity-90">Revenue Collected</div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CoreCapabilities() {
  const features = [
    { title: "Pipeline", icon: <LayoutDashboard />, col: "col-span-2" },
    { title: "Automations", icon: <Zap />, col: "col-span-1" },
    { title: "Reports", icon: <BarChart3 />, col: "col-span-1" },
    { title: "Team", icon: <Users />, col: "col-span-2" }
  ];

  return (
    <section className="py-12 px-6 max-w-7xl mx-auto">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
        variants={VARIANTS.container}
        className="grid grid-cols-2 md:grid-cols-4 gap-6"
      >
        <motion.div variants={VARIANTS.header} className="col-span-2 md:col-span-4 mb-4">
          <h2 className="text-sm font-bold tracking-widest text-indigo-500 uppercase mb-2">Command Center</h2>
          <h3 className="text-4xl font-bold text-slate-900 dark:text-white">Full visibility. Total control.</h3>
        </motion.div>

        {features.map((f, i) => (
          <motion.div
            key={i}
            variants={VARIANTS.card}
            whileHover={{ y: -5, transition: TRANSITIONS.fast }}
            className={`${f.col} p-8 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-colors group cursor-default shadow-sm hover:shadow-xl`}
          >
            <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-indigo-500 transition-colors mb-6">{f.icon}</div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{f.title}</h4>
            <div className="h-1 w-12 bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500 transition-all rounded-full" />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function IntegrationsSection() {
  return (
    <section className="py-12 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1120] overflow-hidden whitespace-nowrap">
      <div className="flex gap-12 items-center">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, ease: "linear", repeat: Infinity }}
          className="flex gap-12 items-center"
        >
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-12 text-xl font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest select-none">
              <span>Stripe</span><span>•</span><span>Slack</span><span>•</span><span>HubSpot</span><span>•</span><span>QuickBooks</span><span>•</span><span>Zapier</span><span>•</span><span>Gmail</span><span>•</span><span>Outlook</span><span>•</span><span>Salesforce</span><span>•</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function DifferentiationSection() {
  return (
    <section className="py-12 bg-slate-950 text-white border-t border-slate-800">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
        variants={VARIANTS.card}
        className="max-w-4xl mx-auto px-6 text-center space-y-12"
      >
        <h2 className="text-5xl md:text-7xl font-bold tracking-tighter">
          Stop paying for <br /> <span className="text-slate-600">bloatware</span>.
        </h2>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Enterprise CRMs are slow, expensive, and require a PhD to configure.
          We built this for speed. It opens instantly. It works immediately.
        </p>
      </motion.div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <h2 className="text-4xl font-bold mb-12 text-slate-900 dark:text-white">Real results. <br /><span className="text-indigo-500">Real revenue.</span></h2>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
        variants={VARIANTS.container}
        className="grid md:grid-cols-3 gap-6"
      >
        {[
          { q: "We fired our admin assistant. The software does it all now.", a: "Mike T.", r: "HVAC Owner", flow: "Saved $45k/yr" },
          { q: "I finally know where my leads are coming from. Marketing ROI up 300%.", a: "Sarah J.", r: "Agency Director", flow: "3x ROI" },
          { q: "Setup took 15 minutes. It just works. No fluff.", a: "David B.", r: "Plumber", flow: "Instant Setup" }
        ].map((t, i) => (
          <motion.div
            key={i}
            variants={VARIANTS.card}
            whileHover={{ y: -5 }}
            className="p-8 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-indigo-500 mb-4"><Zap size={24} /></div>
            <p className="text-lg text-slate-700 dark:text-slate-300 mb-6">"{t.q}"</p>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">{t.a}</div>
              <div className="text-sm text-slate-500">{t.r}</div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-500">
              <Activity size={14} /> {t.flow}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="py-12 bg-slate-50 dark:bg-[#020617] border-y border-slate-200 dark:border-slate-800">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
        variants={VARIANTS.container}
        className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12 text-center md:text-left"
      >
        {[
          { icon: <ShieldCheck />, title: "SOC-2 Ready", desc: "Bank-grade encryption standard." },
          { icon: <Zap />, title: "100ms Latency", desc: "Built on edge infrastructure for speed." },
          { icon: <Terminal />, title: "Developer API", desc: "Full access to your data programmatically." }
        ].map((item, i) => (
          <motion.div key={i} variants={VARIANTS.row} className="space-y-4">
            <div className="text-indigo-600 dark:text-indigo-500 mx-auto md:mx-0">{item.icon}</div>
            <h3 className="font-bold text-slate-900 dark:text-white">{item.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-24 bg-white dark:bg-[#0B1120] text-center">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
        variants={VARIANTS.card}
        className="max-w-3xl mx-auto px-6 space-y-8"
      >
        <h2 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tighter">
          Ready to professionalize?
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup" className="h-14 sm:h-16 px-8 sm:px-10 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-base sm:text-lg font-bold flex items-center gap-2 shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
            Start Free Trial <ArrowRight size={20} />
          </Link>
          <Link href="/login" className="h-14 sm:h-16 px-8 sm:px-10 rounded-lg border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white text-base sm:text-lg font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            Sign in
          </Link>
        </div>
        <p className="text-xs font-mono uppercase tracking-widest text-slate-500">No Credit Card • Cancel Anytime</p>
      </motion.div>
    </section>
  );
}

function Footer() {
  const footerLinks = {
    Product: ['Features', 'Integrations', 'Pricing', 'Changelog'],
    Company: ['About', 'Careers', 'Blog', 'Contact'],
    Legal: ['Privacy', 'Terms', 'Security', 'Status']
  };

  return (
    <footer className="bg-slate-50 dark:bg-[#020617] border-t border-slate-200 dark:border-slate-800 pt-20 pb-12 text-sm">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
        variants={VARIANTS.container}
        className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-12 gap-12 mb-16"
      >
        <motion.div variants={VARIANTS.row} className="col-span-2 md:col-span-4 space-y-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900 dark:text-white">
            <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Zap size={18} fill="currentColor" />
            </span>
            CRM<span className="text-slate-400">.pro</span>
          </div>
          <p className="text-slate-500 max-w-xs">
            The only CRM engineered for speed. <br />
            Stop waiting for your software.
          </p>
        </motion.div>

        {Object.entries(footerLinks).map(([title, links], i) => (
          <motion.div variants={VARIANTS.row} key={title} className="col-span-1 md:col-span-2 space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-white">{title}</h4>
            <ul className="space-y-2">
              {links.map(link => (
                <li key={link}>
                  <Link href="#" className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}

        <motion.div variants={VARIANTS.row} className="col-span-2 md:col-span-2 space-y-4">
          <h4 className="font-bold text-slate-900 dark:text-white">Subscribe</h4>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </motion.div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400">
        <p>© 2024 CRM.pro. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-slate-600 dark:hover:text-slate-200"><Activity size={16} /></Link>
          <Link href="#" className="hover:text-slate-600 dark:hover:text-slate-200"><ShieldCheck size={16} /></Link>
        </div>
      </div>
    </footer>
  );
}
