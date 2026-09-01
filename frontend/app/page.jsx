'use client';

import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { VARIANTS, VIEWPORT } from '../lib/motion';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  IndianRupee,
  LayoutDashboard,
  MessageCircle,
  Languages,
  Mail,
} from 'lucide-react';

const STAGES = ['New', 'Quoted', 'Paid'];

const SAMPLE_BOARD = [
  [
    { title: 'Website form', detail: 'AC repair · Andheri', amount: '₹8,400' },
    { title: 'WhatsApp', detail: 'Clinic follow-up', amount: '₹2,200' },
  ],
  [
    { title: 'Quote sent', detail: 'Wedding shoot', amount: '₹42,000' },
    { title: 'Site visit', detail: 'Shop fit-out', amount: '₹18,500' },
  ],
  [{ title: 'Invoice paid', detail: 'Annual AMC', amount: '₹36,000' }],
];

const LOOP = [
  { n: '01', title: 'Capture', body: 'Website form, widget, email, or WhatsApp lands as a lead with source and history.' },
  { n: '02', title: 'Follow up', body: 'Cadence reminders and Gmail or Outlook from the record so the next step is not memory.' },
  { n: '03', title: 'Quote', body: 'Price from a book, GST lines, and a customer link to accept the quote.' },
  { n: '04', title: 'Get paid', body: 'Quote becomes a sales order, then a GST invoice the customer can pay on Razorpay.' },
];

const FEATURES = [
  {
    title: 'Pipeline that matches the job',
    description: 'Leads and deals on one board. Due today, rotting, and next-activity nags so open work does not go quiet.',
    icon: LayoutDashboard,
  },
  {
    title: 'WhatsApp in the same trail',
    description: 'Send templates, log inbound replies, and run reminder cadences without a second inbox.',
    icon: MessageCircle,
  },
  {
    title: 'GST invoices that customers pay',
    description: 'CGST/SGST or IGST on the invoice, PDF download, and a portal pay link when Razorpay is connected.',
    icon: IndianRupee,
  },
  {
    title: 'Quotes to orders to invoices',
    description: 'Accept a quote, raise a sales order, then invoice and deduct stock — one chain, not three spreadsheets.',
    icon: FileText,
  },
  {
    title: 'Mailbox and calendar',
    description: 'Send and log Gmail or Outlook on the record. Push meetings to Google or Microsoft Calendar. Public booking page.',
    icon: Mail,
  },
  {
    title: 'Hindi on the sales loop',
    description: 'Switch the board, leads, and invoices to Hindi in the sidebar. English stays the default.',
    icon: Languages,
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit="exit"
      variants={VARIANTS.page}
      className="landing min-h-screen bg-page font-sans"
    >
      <Navbar user={user} />
      <main>
        <HeroSection />
        <LogoStrip />
        <JobLoop />
        <HowItWorks />
        <Features />
        <FinalCTA user={user} />
      </main>
      <Footer />
    </motion.div>
  );
}

function BrandMark() {
  return (
    <span className="landing-mark" aria-hidden="true">
      P
    </span>
  );
}

function Navbar({ user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-page/90 backdrop-blur-sm border-b border-border">
      <nav className="container-editorial flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 text-primary font-semibold text-lg tracking-tight">
          <BrandMark />
          <span className="landing-display">Perioxia CRM</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="#loop" className="text-secondary hover:text-primary text-sm font-medium transition-colors">
            The loop
          </Link>
          <Link href="#how-it-works" className="text-secondary hover:text-primary text-sm font-medium transition-colors">
            How it works
          </Link>
          <Link href="#features" className="text-secondary hover:text-primary text-sm font-medium transition-colors">
            Features
          </Link>
        </div>

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
                className="landing-cta text-sm font-medium bg-primary text-page px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
              >
                Start trial
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="landing-cta text-sm font-medium bg-primary text-page px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
            >
              Dashboard
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-secondary hover:text-primary"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-surface border-b border-border px-6 py-4 space-y-4"
        >
          <Link href="#loop" className="block text-secondary hover:text-primary text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>The loop</Link>
          <Link href="#how-it-works" className="block text-secondary hover:text-primary text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>How it works</Link>
          <Link href="#features" className="block text-secondary hover:text-primary text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Features</Link>
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-sm text-muted">Theme</span>
            <ThemeToggle />
          </div>
          <div className="space-y-2">
            {!user ? (
              <>
                <Link href="/login" className="block text-sm font-medium text-secondary py-2">Sign in</Link>
                <Link href="/signup" className="block text-sm font-medium bg-primary text-page px-4 py-2 rounded-md text-center">Start trial</Link>
              </>
            ) : (
              <Link href="/login" className="block text-sm font-medium bg-primary text-page px-4 py-2 rounded-md text-center">Dashboard</Link>
            )}
          </div>
        </motion.div>
      )}
    </header>
  );
}

function HeroSection() {
  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="container-editorial grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-12 lg:gap-16 items-center">
        <motion.div variants={VARIANTS.container} initial="hidden" animate="show">
          <motion.p variants={VARIANTS.fadeUp} className="caption mb-5">
            For clinics, contractors, agencies, and shops
          </motion.p>
          <motion.h1 variants={VARIANTS.fadeUp} className="headline-xl mb-6 text-primary">
            From WhatsApp ping
            <br />
            to GST paid.
          </motion.h1>
          <motion.p variants={VARIANTS.fadeUp} className="body-lg max-w-xl mb-8 text-secondary">
            Capture the lead, quote it, invoice with GST, and collect on Razorpay —
            without a suite you will never finish setting up.
          </motion.p>
          <motion.div variants={VARIANTS.fadeUp} className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup"
              className="landing-cta inline-flex items-center justify-center gap-2 bg-primary text-page px-6 py-3 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Start 14-day trial
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border border-border text-primary px-6 py-3 rounded-md text-sm font-medium hover:bg-surface-elevated transition-colors"
            >
              Sign in
            </Link>
          </motion.div>
          <motion.p variants={VARIANTS.fadeUp} className="mt-6 text-sm text-muted">
            No credit card · Cancel anytime · Hindi on the sales screens
          </motion.p>
        </motion.div>
        <PipelinePreview />
      </div>
    </section>
  );
}

function PipelinePreview() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(1);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const id = setInterval(() => {
      setActive((n) => (n + 1) % STAGES.length);
    }, 2800);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <motion.div
      variants={VARIANTS.fadeUp}
      initial="hidden"
      animate="show"
      className="landing-board"
      aria-label="Sample pipeline. Illustrative jobs, not customer names."
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-elevated">
        <div>
          <p className="text-sm font-semibold text-primary">Sample board</p>
          <p className="text-xs text-muted">Illustrative jobs — not live accounts</p>
        </div>
        <span className="text-xs font-medium text-accent bg-accent-subtle px-2 py-1 rounded">
          {STAGES[active]}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-border">
        {STAGES.map((stage, i) => (
          <div
            key={stage}
            className={`p-3 min-h-[220px] bg-surface ${i === active ? 'ring-1 ring-inset ring-accent' : ''}`}
          >
            <p className="caption mb-3">{stage}</p>
            <div className="space-y-2">
              {SAMPLE_BOARD[i].map((card) => (
                <div
                  key={card.title + card.detail}
                  className={`landing-ticket ${i === active ? 'is-live' : ''}`}
                >
                  <p className="text-sm font-medium text-primary">{card.title}</p>
                  <p className="text-xs text-muted mt-0.5">{card.detail}</p>
                  <p className="text-xs font-semibold tabular-nums text-secondary mt-2">{card.amount}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function LogoStrip() {
  const integrations = ['Gmail', 'Outlook', 'Google Calendar', 'WhatsApp', 'Razorpay'];

  return (
    <section className="py-10 border-y border-border bg-surface-elevated">
      <div className="container-editorial">
        <p className="text-center text-sm text-muted mb-5">Connects to tools you can use today</p>
        <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4">
          {integrations.map((name) => (
            <span
              key={name}
              className="text-sm font-medium text-secondary border border-border bg-surface px-3 py-1.5 rounded-full"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function JobLoop() {
  return (
    <section id="loop" className="section-spacing-lg">
      <div className="container-editorial">
        <motion.div initial="hidden" whileInView="show" viewport={VIEWPORT} variants={VARIANTS.container}>
          <motion.p variants={VARIANTS.fadeUp} className="caption mb-4">The job</motion.p>
          <motion.h2 variants={VARIANTS.fadeUp} className="headline-lg mb-4 max-w-2xl">
            One loop: inquiry → follow-up → quote → paid invoice.
          </motion.h2>
          <motion.p variants={VARIANTS.fadeUp} className="body-md max-w-2xl mb-12">
            Spreadsheets drop the WhatsApp lead. Big CRMs bury GST. This product is the path a local service job actually takes.
          </motion.p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {LOOP.map((step) => (
              <motion.div key={step.n} variants={VARIANTS.fadeUp} className="border-t border-border pt-5">
                <p className="font-mono text-xs text-muted mb-2">{step.n}</p>
                <h3 className="landing-display text-xl font-semibold text-primary mb-2">{step.title}</h3>
                <p className="body-sm">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="section-spacing-lg bg-surface-elevated">
      <div className="container-editorial">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-start">
          <motion.div initial="hidden" whileInView="show" viewport={VIEWPORT} variants={VARIANTS.fadeUp}>
            <p className="caption mb-4">Without this</p>
            <h2 className="headline-lg mb-6 text-muted">
              Missed calls, unpaid invoices, and a sheet nobody updates.
            </h2>
            <ul className="space-y-3">
              {[
                'Leads stay in chat and never become a deal',
                'Quotes go out as PDFs with no accept or pay step',
                'GST is typed by hand on every invoice',
                'Nobody sees which jobs went quiet',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={VIEWPORT} variants={VARIANTS.fadeUp}>
            <p className="caption mb-4">With Perioxia</p>
            <h2 className="headline-lg mb-6">The record is the work.</h2>
            <ul className="space-y-3">
              {[
                'Website forms and WhatsApp log into one pipeline',
                'Deals, quotes, sales orders, and invoices stay linked',
                'Cadence reminders fire so follow-ups are not left to memory',
                'Reports on pipeline and GST invoiced totals',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-secondary">
                  <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
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

function Features() {
  return (
    <section id="features" className="section-spacing-lg">
      <div className="container-editorial">
        <motion.div initial="hidden" whileInView="show" viewport={VIEWPORT} variants={VARIANTS.container}>
          <motion.p variants={VARIANTS.fadeUp} className="caption mb-4">Shipped</motion.p>
          <motion.h2 variants={VARIANTS.fadeUp} className="headline-lg mb-14 max-w-xl">
            What you get on day one of the trial.
          </motion.h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature) => (
              <motion.div
                key={feature.title}
                variants={VARIANTS.fadeUp}
                className="p-6 border border-border rounded-xl bg-surface hover:border-border-strong transition-colors"
              >
                <feature.icon size={22} className="text-accent mb-4" strokeWidth={1.6} />
                <h3 className="font-semibold text-primary mb-2">{feature.title}</h3>
                <p className="body-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FinalCTA({ user }) {
  return (
    <section className="pb-24">
      <div className="container-editorial">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={VARIANTS.container}
          className="rounded-2xl border border-border bg-primary text-page px-8 py-14 md:px-16 text-center"
        >
          <motion.h2 variants={VARIANTS.fadeUp} className="headline-lg mb-4 !text-page">
            Run the next job on a real pipeline.
          </motion.h2>
          <motion.p variants={VARIANTS.fadeUp} className="body-lg mb-8 max-w-lg mx-auto !text-page/80">
            Fourteen days. Leads, quotes, GST invoices, WhatsApp, and Razorpay — if you connect them.
          </motion.p>
          <motion.div variants={VARIANTS.fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={user ? '/login' : '/signup'}
              className="landing-cta inline-flex items-center justify-center gap-2 bg-page text-primary px-8 py-3.5 rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              {user ? 'Open dashboard' : 'Start free trial'}
              <ArrowRight size={18} />
            </Link>
            {!user && (
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 border border-page/30 text-page px-8 py-3.5 rounded-md font-medium hover:bg-page/10 transition-colors"
              >
                Sign in
              </Link>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-16">
      <div className="container-editorial">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-12">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2 text-primary font-semibold text-lg tracking-tight mb-4">
              <BrandMark />
              <span className="landing-display">Perioxia CRM</span>
            </Link>
            <p className="text-sm text-muted">
              CRM for local service businesses: leads, quotes, GST invoices, and payment.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="#loop" className="text-muted hover:text-primary transition-colors">The loop</Link>
            <Link href="#features" className="text-muted hover:text-primary transition-colors">Features</Link>
            <Link href="/privacy" className="text-muted hover:text-primary transition-colors">Privacy</Link>
            <Link href="/login" className="text-muted hover:text-primary transition-colors">Sign in</Link>
            <Link href="/signup" className="text-muted hover:text-primary transition-colors">Start trial</Link>
          </nav>
        </div>
        <div className="pt-8 border-t border-border">
          <p className="text-sm text-muted">© 2026 Perioxia CRM. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
