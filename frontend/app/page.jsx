'use client';

import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useState, useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import { VARIANTS, TRANSITIONS, VIEWPORT } from '../lib/motion';
import {
  BarChart3,
  Zap,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Users,
  Clock,
} from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();

  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit="exit"
      variants={VARIANTS.page}
      className="min-h-screen bg-page font-sans"
    >
      <Navbar user={user} />
      <main>
        <HeroSection />
        <LogoStrip />
        <ProblemSolution />
        <HowItWorks />
        <Features />
        <FinalCTA user={user} />
      </main>
      <Footer />
    </motion.div>
  );
}

// ===============================================
// NAVIGATION
// ===============================================

function Navbar({ user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-page/90 backdrop-blur-sm border-b border-border">
      <nav className="container-editorial flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-primary font-semibold text-lg tracking-tight">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <LayoutDashboard size={16} className="text-page" strokeWidth={2.5} />
          </div>
          <span>Perioxia CRM</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-secondary hover:text-primary text-sm font-medium transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="text-secondary hover:text-primary text-sm font-medium transition-colors">
            How it Works
          </Link>
        </div>

        {/* Auth Buttons & Theme Toggle */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <div className="w-px h-6 bg-border mx-2" />
          {!user ? (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-secondary hover:text-primary transition-colors px-4 py-2"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium bg-primary text-page px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
              >
                Get Started
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium bg-primary text-page px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
            >
              Dashboard
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-stone-600 hover:text-stone-900"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-surface border-b border-border px-6 py-4 space-y-4"
        >
          <Link href="#features" className="block text-stone-600 hover:text-stone-900 text-sm font-medium">Features</Link>
          <Link href="#how-it-works" className="block text-stone-600 hover:text-stone-900 text-sm font-medium">How it Works</Link>
          <div className="pt-4 border-t border-border space-y-2">
            {!user ? (
              <>
                <Link href="/login" className="block text-sm font-medium text-stone-600 py-2">Sign in</Link>
                <Link href="/signup" className="block text-sm font-medium bg-stone-900 text-white px-4 py-2 rounded-md text-center">Get Started</Link>
              </>
            ) : (
              <Link href="/login" className="block text-sm font-medium bg-stone-900 text-white px-4 py-2 rounded-md text-center">Dashboard</Link>
            )}
          </div>
        </motion.div>
      )}
    </header>
  );
}

// ===============================================
// HERO SECTION
// ===============================================

function HeroSection() {
  return (
    <section className="pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="container-editorial">
        <motion.div
          variants={VARIANTS.container}
          initial="hidden"
          animate="show"
          className="max-w-3xl"
        >
          {/* Eyebrow */}
          <motion.p
            variants={VARIANTS.fadeUp}
            className="caption mb-6"
          >
            CRM for Local Service Businesses
          </motion.p>

          {/* Main Headline */}
          <motion.h1
            variants={VARIANTS.fadeUp}
            className="headline-xl mb-6 text-primary"
          >
            Stop losing leads.
            <br />
            <span className="text-muted">Start closing deals.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={VARIANTS.fadeUp}
            className="body-lg max-w-xl mb-10 text-secondary"
          >
            A CRM for service businesses: capture leads, send quotes, follow up
            on a cadence, and collect payment—without a bloated suite.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={VARIANTS.fadeUp}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-primary text-page px-6 py-3 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border border-border text-primary px-6 py-3 rounded-md text-sm font-medium hover:bg-surface-elevated transition-colors"
            >
              Sign in
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.p
            variants={VARIANTS.fadeUp}
            className="mt-8 text-sm text-muted"
          >
            No credit card required · Free 14-day trial · Cancel anytime
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

// ===============================================
// LOGO STRIP
// ===============================================

function LogoStrip() {
  const integrations = ['Gmail', 'Outlook', 'Google Calendar', 'WhatsApp', 'Razorpay'];

  return (
    <section className="py-12 border-y border-border bg-surface-elevated">
      <div className="container-editorial">
        <p className="text-center text-sm text-muted mb-6">Connects to tools you can use today</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {integrations.map((name) => (
            <span key={name} className="text-muted font-medium text-sm tracking-wide">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===============================================
// PROBLEM → SOLUTION
// ===============================================

function ProblemSolution() {
  return (
    <section className="section-spacing-lg">
      <div className="container-editorial">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
          {/* Problem */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT}
            variants={VARIANTS.fadeUp}
          >
            <p className="caption mb-4 text-muted">The Problem</p>
            <h2 className="headline-lg mb-6 text-muted">
              <span className="line-through decoration-muted">Spreadsheets, sticky notes, and missed calls.</span>
            </h2>
            <ul className="space-y-4">
              {[
                'Leads slip through the cracks',
                'No idea which jobs are profitable',
                'Hours wasted on manual follow-ups',
                'Payments get delayed or forgotten'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Solution */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT}
            variants={VARIANTS.fadeUp}
          >
            <p className="caption mb-4">The Solution</p>
            <h2 className="headline-lg mb-6">
              One system for your entire operation.
            </h2>
            <ul className="space-y-4">
              {[
                'Website forms and WhatsApp log into one pipeline',
                'Deals, quotes, and invoices in the same record trail',
                'Cadence reminders so follow-ups are not left to memory',
                'Reports on pipeline and invoiced totals'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-stone-600">
                  <CheckCircle2 size={18} className="text-green-600 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ===============================================
// HOW IT WORKS
// ===============================================

function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Capture',
      description: 'Leads come in from a website form, email, or WhatsApp. Each inquiry is stored with source and history.'
    },
    {
      number: '02',
      title: 'Track',
      description: 'See every lead in your pipeline. Know exactly where each job stands—from estimate to completion.'
    },
    {
      number: '03',
      title: 'Close',
      description: 'Send quotes, collect payment from the customer portal, and run reminder cadences for open follow-ups.'
    }
  ];

  return (
    <section id="how-it-works" className="section-spacing-lg bg-surface-elevated">
      <div className="container-editorial">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={VARIANTS.container}
        >
          <motion.p variants={VARIANTS.fadeUp} className="caption mb-4">How It Works</motion.p>
          <motion.h2 variants={VARIANTS.fadeUp} className="headline-lg mb-16 max-w-xl">
            From lead to payment in three steps.
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                variants={VARIANTS.fadeUp}
                className="relative"
              >
                <span className="text-6xl font-bold text-muted/20 mb-4 block">{step.number}</span>
                <h3 className="headline-md mb-3 text-primary">{step.title}</h3>
                <p className="body-md text-secondary">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ===============================================
// FEATURES
// ===============================================

function Features() {
  const features = [
    {
      title: 'Lead Pipeline',
      description: 'Visual pipeline to track every lead from first contact to closed deal.',
      icon: LayoutDashboard,
    },
    {
      title: 'Automated Follow-ups',
      description: 'Never forget to follow up. Set reminders and let the system do the work.',
      icon: Zap,
    },
    {
      title: 'Task Management',
      description: 'Assign tasks, set deadlines, and keep your team accountable.',
      icon: Clock,
    },
    {
      title: 'Team Dashboard',
      description: "See who's doing what. Track performance and identify bottlenecks.",
      icon: Users,
    },
    {
      title: 'Revenue Reports',
      description: 'See pipeline value and invoiced totals without a separate spreadsheet.',
      icon: BarChart3,
    },
    {
      title: 'Client Database',
      description: 'All your customers in one place with full history and notes.',
      icon: Users,
    },
  ];

  return (
    <section id="features" className="section-spacing-lg">
      <div className="container-editorial">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={VARIANTS.container}
        >
          <motion.p variants={VARIANTS.fadeUp} className="caption mb-4">Features</motion.p>
          <motion.h2 variants={VARIANTS.fadeUp} className="headline-lg mb-16 max-w-xl">
            Everything you need. Nothing you don't.
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={VARIANTS.fadeUp}
                className="p-6 border border-border rounded-lg bg-surface"
              >
                <feature.icon size={24} className="text-stone-400 mb-4" strokeWidth={1.5} />
                <h3 className="font-semibold text-stone-900 mb-2">{feature.title}</h3>
                <p className="body-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ===============================================
// FINAL CTA
// ===============================================

function FinalCTA({ user }) {
  return (
    <section className="section-spacing-lg">
      <div className="container-narrow text-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={VARIANTS.container}
        >
          <motion.h2 variants={VARIANTS.fadeUp} className="headline-lg mb-6">
            Ready to take control of your business?
          </motion.h2>
          <motion.p variants={VARIANTS.fadeUp} className="body-lg mb-10 max-w-lg mx-auto">
            Start a 14-day trial. Capture leads, send quotes, and get paid.
          </motion.p>
          <motion.div variants={VARIANTS.fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-primary text-page px-8 py-4 rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              Start Free Trial
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border border-border text-primary px-8 py-4 rounded-md font-medium hover:bg-surface-elevated transition-colors"
            >
              Sign in
            </Link>
          </motion.div>
          <motion.p variants={VARIANTS.fadeUp} className="mt-6 text-sm text-muted">
            No credit card required
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

// ===============================================
// FOOTER
// ===============================================

function Footer() {
  return (
    <footer className="border-t border-border py-16">
      <div className="container-editorial">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-12">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2 text-stone-900 font-semibold text-lg tracking-tight mb-4">
              <div className="w-8 h-8 bg-stone-900 rounded flex items-center justify-center">
                <LayoutDashboard size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <span>Perioxia CRM</span>
            </Link>
            <p className="text-sm text-stone-500">
              CRM for local service businesses: leads, quotes, follow-ups, and payment.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="#features" className="text-stone-500 hover:text-stone-900 transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-stone-500 hover:text-stone-900 transition-colors">
              How it Works
            </Link>
            <Link href="/login" className="text-stone-500 hover:text-stone-900 transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="text-stone-500 hover:text-stone-900 transition-colors">
              Start trial
            </Link>
          </nav>
        </div>
        <div className="pt-8 border-t border-border">
          <p className="text-sm text-stone-400">© 2026 Perioxia CRM. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
