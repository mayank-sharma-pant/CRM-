'use client';

import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence, useMotionValueEvent } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
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

// ===============================================
// MOTION SYSTEM (HIERARCHY & PHYSICS)
// ===============================================

const ANIM = {
  // Heavy / Cinematic (Hero Only)
  hero: {
    visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    hidden: { opacity: 0, y: 20, scale: 0.98, filter: "blur(4px)" },
  },
  // Sharp / Technical (Product Sections)
  technical: {
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 1, 0.5, 1] } },
    hidden: { opacity: 0, y: 30 },
  },
  // Calm / Stable (Trust Sections)
  calm: {
    visible: { opacity: 1, transition: { duration: 0.8 } },
    hidden: { opacity: 0 },
  }
};

const VIEWPORT_CONFIG = { once: true, margin: "-10% 0px -10% 0px" }; // Triggers earlier

// ===============================================
// NEXT-GEN COMPONENT LOGIC
// ===============================================

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-600 dark:selection:text-indigo-400 overflow-x-hidden flex flex-col md:flex-row">

      {/* 0. SIDEBAR MOCK (APP FEEL) */}
      <Sidebar user={user} />
      <MobileHeader user={user} />

      <main className="flex-1 w-full relative md:pl-64">
        {/* 1. CINEMATIC HERO (Condensed) */}
        <HeroSection />

        {/* 2. EXPERIENCE TRANSFORMATION (Visual Anchor) */}
        <TransformationSection />

        {/* 3. SCROLLYTELLING: PRODUCT IN ACTION (Tightened) */}
        <ProductScrollyTelling />

        {/* 4. CORE CAPABILITIES (Dense Grid) */}
        <CoreCapabilities />

        {/* 4.5. INTEGRATIONS MARQUEE (New) */}
        <IntegrationsSection />

        {/* 5. DIFFERENTIATION (Opinionated) */}
        <DifferentiationSection />

        {/* 5.5. TESTIMONIALS (Social Proof) */}
        <TestimonialsSection />

        {/* 6. TRUST (Calm) */}
        <TrustSection />

        {/* 7. FINAL CTA */}
        <FinalCTA />

        <Footer />
      </main>
    </div>
  );
}

// ===============================================
// SECTION COMPONENTS
// ===============================================

function Sidebar({ user }) {
  return (
    <motion.aside
      initial={{ x: -100 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
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
          <Link href="/signup" className="flex items-center justify-center w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
            Get Started
          </Link>
        ) : (
          <Link href="/dashboard" className="flex items-center justify-center w-full bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all">
            Dashboard
          </Link>
        )}
      </div>
    </motion.aside>
  );
}

function MobileHeader({ user }) {
  return (
    <div className="md:hidden flex items-center justify-between p-6 bg-white/80 dark:bg-[#0B1120]/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="flex items-center gap-3 font-bold text-slate-900 dark:text-white">
        <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center text-white">
          <LayoutDashboard size={18} strokeWidth={3} />
        </div>
        <span className="tracking-tight text-lg">CRM.pro</span>
      </div>
      <ThemeToggle />
    </div>
  );
}

function HeroSection() {
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 1000], [0, 150]); // Reduced parallax distance

  return (
    <section className="relative pt-40 pb-20 px-6 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-white dark:bg-[#020617] -z-20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(79,70,229,0.15),rgba(0,0,0,0))] -z-10" />

      <div className="max-w-7xl mx-auto flex flex-col items-center text-center">

        {/* Status Pill */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 backdrop-blur text-sm font-medium text-slate-600 dark:text-slate-400 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          v2.4 System Online
        </motion.div>

        {/* Headline - "Heavy" Reveal */}
        <h1 className="text-6xl md:text-9xl font-bold tracking-tighter text-slate-900 dark:text-white leading-[0.9] mb-8">
          <span className="block overflow-hidden">
            <motion.span
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="block"
            >
              SYSTEM
            </motion.span>
          </span>
          <span className="block overflow-hidden text-indigo-600 dark:text-indigo-500">
            <motion.span
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="block"
            >
              ONLINE ALPHA.
            </motion.span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
        >
          The operating system for modern service businesses. <br />
          Stop managing. Start executing.
        </motion.p>

        {/* Heavy UI Reveal - Instant Physics */}
        <motion.div
          style={{ y: yParallax }}
          initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
          animate={{ opacity: 1, scale: 1, rotateX: 10 }}
          transition={{ delay: 0.6, duration: 1.2, ease: "circOut" }}
          className="mt-16 w-full max-w-6xl perspective-2000"
        >
          <div className="relative rounded-2xl bg-slate-950 border border-slate-800 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden aspect-[21/9] ring-1 ring-white/10 group">
            {/* Active UI Mockup */}
            <div className="absolute inset-0 bg-[#0B1120] flex p-1">
              {/* Sidebar */}
              {/* Sidebar */}
              <div className="w-24 md:w-64 bg-[#020617] border-r border-slate-800 flex flex-col p-4 gap-2 shrink-0">
                <div className="flex items-center gap-3 px-3 py-2 text-indigo-400 bg-indigo-500/10 rounded-lg mb-2">
                  <LayoutDashboard size={16} />
                  <span className="font-bold text-xs hidden md:block">Dashboard</span>
                </div>
                {[
                  { icon: <Users size={16} />, label: "Leads" },
                  { icon: <Clock size={16} />, label: "Follow-ups" },
                  { icon: <BarChart3 size={16} />, label: "Reports" },
                  { icon: <Terminal size={16} />, label: "Settings" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-300 rounded-lg transition-colors">
                    {item.icon}
                    <span className="font-medium text-xs hidden md:block">{item.label}</span>
                  </div>
                ))}
              </div>
              {/* Main Content */}
              <div className="flex-1 p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                <div className="grid grid-cols-3 gap-6 h-full">
                  <div className="col-span-2 space-y-6">
                    <div className="h-32 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-6 relative overflow-hidden">
                      <div className="text-sm font-mono text-indigo-400 mb-1">REVENUE VELOCITY</div>
                      <div className="text-4xl font-bold text-white">$42,850.00</div>
                      <Activity className="absolute bottom-6 right-6 text-indigo-500 opacity-50" size={48} />
                    </div>
                    <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl relative overflow-hidden flex items-end px-6 gap-2 pb-0 pt-12">
                      {[30, 50, 45, 75, 55, 90, 60, 95, 80].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.8 + (i * 0.05), duration: 0.8 }}
                          className="flex-1 bg-indigo-600 opacity-80 rounded-t"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-full bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex gap-3 items-center border-b border-slate-800/50 pb-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800" />
                          <div className="space-y-1">
                            <div className="h-2 w-24 bg-slate-800 rounded" />
                            <div className="h-1.5 w-16 bg-slate-800 rounded opacity-50" />
                          </div>
                        </div>
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
        {/* Left: Chaos */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={ANIM.technical}
        >
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8 text-slate-500">
            You are drowning in <span className="text-slate-400 line-through decoration-slate-600">chaos</span>.
          </h2>
          <div className="space-y-6 opacity-50">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500"><Clock /></div>
              <div>
                <div className="font-bold text-slate-300">Missed Follow-ups</div>
                <div className="text-sm text-slate-500">"Did I call John back?"</div>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500"><Users /></div>
              <div>
                <div className="font-bold text-slate-300">Leads Slipping</div>
                <div className="text-sm text-slate-500">Spreadsheets don't remind you.</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right: Clarity */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={ANIM.technical}
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

// 3. SCROLLYTELLING ENGINE - TIGHTENED (No huge gaps)
function ProductScrollyTelling() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const [activeStep, setActiveStep] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // Adjusted thresholds for tighter feel
    if (latest < 0.25 && activeStep !== 0) setActiveStep(0);
    else if (latest >= 0.25 && latest < 0.6 && activeStep !== 1) setActiveStep(1);
    else if (latest >= 0.6 && activeStep !== 2) setActiveStep(2);
  });

  // Height reduced to 130vh for faster pacing
  return (
    <section ref={containerRef} className="h-[130vh] bg-slate-50 dark:bg-[#0B1120] relative">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

          {/* NARRATIVE SIDE */}
          <div className="space-y-12">
            <Step
              isActive={activeStep === 0}
              title="01. Capture"
              desc="Leads land instantly. Your phone buzzes. You know their name, service type, and budget before you even pick up."
            />
            <Step
              isActive={activeStep === 1}
              title="02. Execute"
              desc="Click to quote. Click to schedule. The system moves the lead through the pipeline for you. Zero data entry."
            />
            <Step
              isActive={activeStep === 2}
              title="03. Scale"
              desc="Watch the dashboard. See conversion rates rise. Spot bottlenecks instantly. This is what control feels like."
            />
          </div>

          {/* VISUAL ENGINE SIDE */}
          <div className="relative h-[500px] bg-white dark:bg-[#020617] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex">
            {/* Sidebar (Added as requested) */}
            <div className="w-16 md:w-48 bg-slate-50 dark:bg-[#0F172A] border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 gap-2 shrink-0">
              <div className="flex items-center gap-3 px-3 py-2 text-slate-400 mb-2">
                <LayoutDashboard size={16} />
                <span className="font-bold text-xs opacity-50 hidden md:block">Dashboard</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <Users size={16} />
                <span className="font-bold text-xs hidden md:block">Leads</span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse hidden md:block" />
              </div>
              {["Follow-ups", "Reports", "Settings"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 text-slate-400 opacity-50">
                  <div className="w-4 h-4 rounded bg-current opacity-20" />
                  <span className="font-medium text-xs hidden md:block">{item}</span>
                </div>
              ))}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-8 flex flex-col relative overflow-hidden">
              {/* Dynamic Header */}
              <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <Users size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">LEAD PROFILE</div>
                    <div className="font-bold text-slate-900 dark:text-white text-lg">Sarah Johnson</div>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-500 ${activeStep === 0 ? "bg-blue-100 text-blue-700" :
                  activeStep === 1 ? "bg-amber-100 text-amber-700" :
                    "bg-emerald-100 text-emerald-700"
                  }`}>
                  {activeStep === 0 ? "NEW LEAD" : activeStep === 1 ? "IN PROGRESS" : "WON DEAL"}
                </div>
              </div>

              {/* Dynamic Body */}
              <div className="flex-1 space-y-6 relative">
                {/* Step 1: Capture */}
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 transition-all duration-500 ${activeStep >= 0 ? 'opacity-100 translate-x-0' : 'opacity-50 translate-x-4'}`}
                >
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-blue-500">INQUIRY RECEIVED</span>
                    <span className="text-xs text-slate-400">Just now</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">"Hi, looking for a quote on a master bath remodel. Available Tuesdays."</p>
                </motion.div>

                {/* Step 2: Action - Only shows activeStep >= 1 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: activeStep >= 1 ? 1 : 0.2, scale: activeStep >= 1 ? 1 : 0.95 }}
                  className="p-4 rounded-xl border border-amber-200/20 bg-amber-50/10 dark:bg-amber-900/10"
                >
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-amber-500">ESTIMATE SENT</span>
                    <div className="flex gap-2">
                      {activeStep >= 1 && <CheckCircle2 size={14} className="text-amber-500" />}
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded overflow-hidden">
                    <motion.div
                      className="h-full bg-amber-500"
                      initial={{ width: 0 }}
                      animate={{ width: activeStep >= 1 ? "60%" : "0%" }}
                    />
                  </div>
                </motion.div>

                {/* Step 3: Result - Only shows activeStep >= 2 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: activeStep >= 2 ? 1 : 0, y: activeStep >= 2 ? 0 : 20 }}
                  className="bg-emerald-500 text-white p-6 rounded-xl shadow-lg shadow-emerald-500/30 text-center"
                >
                  <div className="text-4xl font-bold mb-1">$12,400</div>
                  <div className="text-xs font-medium opacity-90 uppercase tracking-widest">Revenue Collected</div>
                </motion.div>

                {/* Connecting Line */}
                <div className="absolute left-6 top-16 bottom-16 w-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ isActive, title, desc }) {
  return (
    <div className={`transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-30 scale-95'}`}>
      <h3 className={`text-4xl font-bold mb-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-700'}`}>{title}</h3>
      <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">{desc}</p>
    </div>
  );
}

function IntegrationsSection() {
  return (
    <section className="py-12 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1120] overflow-hidden whitespace-nowrap">
      <div className="flex gap-12 items-center">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 20, ease: "linear", repeat: Infinity }}
          className="flex gap-12 items-center"
        >
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-12 text-xl font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest select-none">
              <span>Stripe</span>
              <span>•</span>
              <span>Slack</span>
              <span>•</span>
              <span>HubSpot</span>
              <span>•</span>
              <span>QuickBooks</span>
              <span>•</span>
              <span>Zapier</span>
              <span>•</span>
              <span>Gmail</span>
              <span>•</span>
              <span>Outlook</span>
              <span>•</span>
              <span>Salesforce</span>
              <span>•</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <h2 className="text-4xl font-bold mb-12 text-slate-900 dark:text-white">Real results. <br /><span className="text-indigo-500">Real revenue.</span></h2>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { q: "We fired our admin assistant. The software does it all now.", a: "Mike T.", r: "HVAC Owner", flow: "Saved $45k/yr" },
          { q: "I finally know where my leads are coming from. Marketing ROI up 300%.", a: "Sarah J.", r: "Agency Director", flow: "3x ROI" },
          { q: "Setup took 15 minutes. It just works. No fluff.", a: "David B.", r: "Plumber", flow: "Instant Setup" }
        ].map((t, i) => (
          <motion.div
            key={i}
            initial="hidden"
            whileInView="visible"
            whileHover={{ y: -5 }}
            viewport={VIEWPORT_CONFIG}
            variants={{
              visible: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } },
              hidden: { opacity: 0, y: 20 }
            }}
            className="p-8 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm"
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={ANIM.technical}
          className="col-span-2 md:col-span-4 mb-4"
        >
          <h2 className="text-sm font-bold tracking-widest text-indigo-500 uppercase mb-2">Command Center</h2>
          <h3 className="text-4xl font-bold text-slate-900 dark:text-white">Full visibility. Total control.</h3>
        </motion.div>

        {features.map((f, i) => (
          <motion.div
            key={i}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_CONFIG}
            variants={{
              visible: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } },
              hidden: { opacity: 0, y: 30 }
            }}
            className={`${f.col} p-8 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-colors group cursor-default shadow-sm hover:shadow-xl`}
          >
            <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-indigo-500 transition-colors mb-6">{f.icon}</div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{f.title}</h4>
            <div className="h-1 w-12 bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500 transition-all rounded-full" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function DifferentiationSection() {
  return (
    <section className="py-12 bg-slate-950 text-white border-t border-slate-800">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={ANIM.technical}
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

function TrustSection() {
  return (
    <section className="py-12 bg-slate-50 dark:bg-[#020617] border-y border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12 text-center md:text-left">
        {[
          { icon: <ShieldCheck />, title: "SOC-2 Ready", desc: "Bank-grade encryption standard." },
          { icon: <Zap />, title: "100ms Latency", desc: "Built on edge infrastructure for speed." },
          { icon: <Terminal />, title: "Developer API", desc: "Full access to your data programmatically." }
        ].map((item, i) => (
          <motion.div
            key={i}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_CONFIG}
            variants={{
              visible: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } },
              hidden: { opacity: 0, y: 20 }
            }}
            className="space-y-4"
          >
            <div className="text-indigo-600 dark:text-indigo-500 mx-auto md:mx-0">{item.icon}</div>
            <h3 className="font-bold text-slate-900 dark:text-white">{item.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-24 bg-white dark:bg-[#0B1120] text-center">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={ANIM.technical}
        className="max-w-3xl mx-auto px-6 space-y-8"
      >
        <h2 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tighter">
          Ready to professionalize?
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup" className="h-16 px-10 rounded-lg bg-indigo-600 text-white text-lg font-bold flex items-center gap-2 shadow-2xl hover:scale-105 transition-all">
            Start Free Trial <ArrowRight size={20} />
          </Link>
        </div>
        <p className="text-xs font-mono uppercase tracking-widest text-slate-500">No Credit Card • Cancel Anytime</p>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 bg-slate-50 dark:bg-[#020617] border-t border-slate-200 dark:border-slate-800 text-center text-slate-500 text-sm">
      <p>© 2024 CRM.pro. Engineered for performance.</p>
    </footer>
  );
}
