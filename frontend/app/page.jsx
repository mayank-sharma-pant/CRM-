'use client';

import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  Plus,
} from 'lucide-react';

const DEAL_LINES = [
  { label: 'Inbound · WhatsApp', detail: 'AC repair, Andheri', amount: '—' },
  { label: 'Follow-up sent', detail: 'Day 1 cadence', amount: '—' },
  { label: 'Quote accepted', detail: 'Parts + labour, GST incl.', amount: '₹8,400' },
  { label: 'Sales order', detail: 'SO-0142', amount: '₹8,400' },
  { label: 'CGST @ 9%', detail: '', amount: '₹680' },
  { label: 'SGST @ 9%', detail: '', amount: '₹680' },
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

const FACTS = [
  { value: 'Pipeline', label: 'Leads and deals on one board' },
  { value: 'WhatsApp', label: 'Templates and inbound on the record' },
  { value: 'GST', label: 'CGST, SGST, or IGST on the invoice' },
  { value: 'Hindi', label: 'Toggle on the sales screens' },
];

const USE_CASES = [
  {
    title: 'Contractors',
    body: 'A WhatsApp inquiry becomes a deal with a follow-up date. Quote accepted, GST invoice out the same afternoon.',
  },
  {
    title: 'Clinics and shops',
    body: 'Walk-ins and form fills land on one board. Hindi on the sales screens if the floor team wants it.',
  },
  {
    title: 'Agencies',
    body: 'Mailbox on the record, a shared booking page, and a pipeline that does not live in a founder’s head.',
  },
];

const FAQS = [
  {
    q: 'Do I need a GST number to use this?',
    a: 'No. You can run leads, quotes, and the pipeline without one. Add your GSTIN whenever you are ready to raise GST-compliant invoices — CGST/SGST or IGST lines apply automatically based on the customer state.',
  },
  {
    q: 'Does WhatsApp need a separate business account?',
    a: 'You connect your existing WhatsApp Business number. Templates, inbound replies, and reminder cadences run from the same lead record — no second inbox to check.',
  },
  {
    q: 'Can I switch parts of the CRM to Hindi?',
    a: 'Yes. The board, leads, and invoices can be switched to Hindi from the sidebar per user. English stays the default for anyone who has not switched.',
  },
  {
    q: 'What happens after the 14-day trial?',
    a: 'You can start a paid plan to keep your data and pipeline exactly as it is, or export your leads and invoices. No auto-charge without you picking a plan first.',
  },
  {
    q: 'Is Razorpay required to send invoices?',
    a: 'No. You can send GST invoices as a PDF without it. Connect Razorpay when you want customers to pay the invoice online from the same link.',
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
        <FactsBar />
        <JobLoop />
        <HowItWorks />
        <Features />
        <UseCases />
        <Pricing user={user} />
        <FAQ />
        <FinalCTA user={user} />
      </main>
      <Footer />
    </motion.div>
  );
}

function Navbar({ user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`landing-nav fixed top-0 left-0 right-0 z-50 bg-page/90 backdrop-blur-sm border-b border-transparent ${scrolled ? 'is-scrolled border-border' : ''}`}
    >
      <nav className="container-editorial flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5 text-primary">
          <span className="brand-mark">P</span>
          <span className="font-display text-[15px] font-semibold tracking-tight">Perioxia</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="#product" className="landing-nav-link text-secondary hover:text-primary text-sm font-medium transition-colors">
            Product
          </Link>
          <Link href="#features" className="landing-nav-link text-secondary hover:text-primary text-sm font-medium transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="landing-nav-link text-secondary hover:text-primary text-sm font-medium transition-colors">
            Pricing
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {!user ? (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-secondary hover:text-primary transition-colors px-3 py-2"
              >
                Sign in
              </Link>
              <Link href="/signup" className="landing-btn">
                Start trial
              </Link>
            </>
          ) : (
            <Link href="/login" className="landing-btn">
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
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-surface border-b border-border px-6 py-4 space-y-4"
        >
          <Link href="#product" className="block text-secondary hover:text-primary text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Product</Link>
          <Link href="#features" className="block text-secondary hover:text-primary text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Features</Link>
          <Link href="#pricing" className="block text-secondary hover:text-primary text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-sm text-muted">Theme</span>
            <ThemeToggle />
          </div>
          <div className="space-y-2">
            {!user ? (
              <>
                <Link href="/login" className="block text-sm font-medium text-secondary py-2">Sign in</Link>
                <Link href="/signup" className="landing-btn w-full text-center">Start trial</Link>
              </>
            ) : (
              <Link href="/login" className="landing-btn w-full text-center">Dashboard</Link>
            )}
          </div>
        </motion.div>
      )}
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      <div className="landing-hero-glow" aria-hidden="true" />
      <div className="container-editorial relative">
        <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-12 lg:gap-16 items-center">
          <motion.div variants={VARIANTS.container} initial="hidden" animate="show">
            <motion.p variants={VARIANTS.fadeUp} className="caption mb-5 flex items-center gap-2.5">
              <span className="landing-eyebrow-rule" aria-hidden="true" />
              For clinics, contractors, agencies, and shops
            </motion.p>
            <motion.h1 variants={VARIANTS.fadeUp} className="headline-xl text-primary mb-6">
              From WhatsApp
              <br />
              ping to GST paid.
            </motion.h1>
            <motion.p variants={VARIANTS.fadeUp} className="body-lg max-w-xl mb-8 text-secondary">
              Capture the lead, quote it, invoice with GST, and collect on Razorpay —
              without a suite you will never finish setting up.
            </motion.p>
            <motion.div variants={VARIANTS.fadeUp} className="flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="landing-btn inline-flex items-center justify-center gap-2">
                Start 14-day trial
                <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="landing-btn-ghost inline-flex items-center justify-center">
                Sign in
              </Link>
            </motion.div>
            <motion.p variants={VARIANTS.fadeUp} className="mt-6 text-sm text-muted">
              No credit card · Cancel anytime · Hindi on the sales screens
            </motion.p>
          </motion.div>
          <DeskPreview />
        </div>
      </div>
    </section>
  );
}

function DeskPreview() {
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(reduceMotion ? DEAL_LINES.length : 1);
  const [paid, setPaid] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) return undefined;
    let step = 1;
    let holdTimer;
    const id = setInterval(() => {
      step += 1;
      if (step <= DEAL_LINES.length) {
        setCount(step);
      } else if (step === DEAL_LINES.length + 1) {
        setPaid(true);
      } else {
        clearInterval(id);
        holdTimer = setTimeout(() => {
          setPaid(false);
          setCount(1);
          step = 1;
        }, 2200);
      }
    }, 550);
    return () => {
      clearInterval(id);
      clearTimeout(holdTimer);
    };
  }, [reduceMotion]);

  const total = 8400 + 680 + 680;
  const stage = paid ? 'Won' : count >= 3 ? 'Quoted' : 'New';

  return (
    <motion.div
      variants={VARIANTS.fadeUp}
      initial="hidden"
      animate="show"
      className="landing-desk"
      aria-label="Illustrative deal record, not a live account"
    >
      <div className="landing-desk-bar">
        <span className="flex items-center gap-2 min-w-0">
          <span className="brand-mark !w-5 !h-5 !text-[10px]">P</span>
          <span className="truncate font-display text-[13px] font-semibold">Mehta Air · INV-0142</span>
        </span>
        <span className="landing-desk-stage">{stage}</span>
      </div>
      <div className="landing-desk-meta">
        <p className="text-sm font-medium text-primary">AC repair, Andheri</p>
        <p className="text-xs text-muted mt-0.5">WhatsApp inbound · GSTIN 27AAAAA0000A1Z5</p>
      </div>
      <div className="landing-desk-lines">
        {DEAL_LINES.slice(0, count).map((line) => (
          <motion.div
            key={line.label}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="landing-desk-row"
          >
            <span>
              {line.label}
              {line.detail ? <span className="block text-[0.68rem] text-muted">{line.detail}</span> : null}
            </span>
            <span className="amt tabular-nums font-mono">{line.amount}</span>
          </motion.div>
        ))}
      </div>
      {count >= DEAL_LINES.length && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="landing-desk-total tabular-nums"
        >
          <span>Total due</span>
          <span className="font-mono">₹{total.toLocaleString('en-IN')}</span>
        </motion.div>
      )}
      <div className="landing-desk-foot">
        {paid ? (
          <motion.span
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="landing-paid"
          >
            Paid
          </motion.span>
        ) : (
          <span className="text-xs text-muted">Waiting on payment</span>
        )}
      </div>
    </motion.div>
  );
}

function LogoStrip() {
  const integrations = ['Gmail', 'Outlook', 'Google Calendar', 'WhatsApp', 'Razorpay'];

  return (
    <section className="py-8 border-y border-border">
      <div className="container-editorial flex flex-col md:flex-row md:items-center gap-4 md:gap-10">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted shrink-0">
          Connects to
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {integrations.map((name) => (
            <span key={name} className="text-sm font-medium text-secondary">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FactsBar() {
  return (
    <section className="section-spacing border-b border-border">
      <div className="container-editorial">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={VARIANTS.container}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6"
        >
          {FACTS.map((fact) => (
            <motion.div key={fact.value} variants={VARIANTS.fadeUp}>
              <p className="font-display text-2xl md:text-3xl font-semibold text-primary tracking-tight">{fact.value}</p>
              <p className="body-sm mt-1.5">{fact.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function JobLoop() {
  return (
    <section id="product" className="section-spacing-lg scroll-mt-24">
      <div className="container-editorial">
        <motion.div initial="hidden" whileInView="show" viewport={VIEWPORT} variants={VARIANTS.container}>
          <motion.p variants={VARIANTS.fadeUp} className="caption mb-4">The job</motion.p>
          <motion.h2 variants={VARIANTS.fadeUp} className="headline-lg mb-4 max-w-2xl">
            Inquiry to paid invoice, in one record.
          </motion.h2>
          <motion.p variants={VARIANTS.fadeUp} className="body-md max-w-2xl mb-12">
            Spreadsheets drop the WhatsApp lead. Big CRMs bury GST. This product is the path a local service job actually takes.
          </motion.p>
          <motion.div variants={VARIANTS.container} className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {LOOP.map((step) => (
              <motion.div key={step.n} variants={VARIANTS.fadeUp} className="landing-stub">
                <span className="landing-stub-num mb-4">{step.n}</span>
                <h3 className="font-display text-lg font-semibold text-primary mb-2">{step.title}</h3>
                <p className="body-sm">{step.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="section-spacing-lg bg-surface-elevated scroll-mt-24">
      <div className="container-editorial">
        <div className="grid md:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border border-border">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT}
            variants={VARIANTS.fadeUp}
            className="bg-surface p-8 md:p-12"
          >
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
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT}
            variants={VARIANTS.fadeUp}
            className="bg-surface p-8 md:p-12 landing-with"
          >
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
    <section id="features" className="section-spacing-lg scroll-mt-24">
      <div className="container-editorial">
        <motion.div initial="hidden" whileInView="show" viewport={VIEWPORT} variants={VARIANTS.container}>
          <motion.p variants={VARIANTS.fadeUp} className="caption mb-4">On day one</motion.p>
          <motion.h2 variants={VARIANTS.fadeUp} className="headline-lg mb-12 max-w-xl">
            What you get on the trial.
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => (
              <motion.div key={feature.title} variants={VARIANTS.fadeUp} className="landing-feature">
                <feature.icon size={18} className="text-accent mb-4" strokeWidth={1.7} />
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

function UseCases() {
  return (
    <section className="section-spacing-lg bg-surface-elevated">
      <div className="container-editorial">
        <motion.div initial="hidden" whileInView="show" viewport={VIEWPORT} variants={VARIANTS.container}>
          <motion.p variants={VARIANTS.fadeUp} className="caption mb-4">Who it is for</motion.p>
          <motion.h2 variants={VARIANTS.fadeUp} className="headline-lg mb-12 max-w-2xl">
            Built for the job that starts on WhatsApp.
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-4">
            {USE_CASES.map((item) => (
              <motion.article key={item.title} variants={VARIANTS.fadeUp} className="landing-feature">
                <h3 className="font-display text-lg font-semibold text-primary mb-2">{item.title}</h3>
                <p className="body-sm">{item.body}</p>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Pricing({ user }) {
  const included = [
    'Unlimited leads, deals, and pipeline stages',
    'WhatsApp templates, inbound logging, and cadences',
    'Quotes, sales orders, and GST invoices',
    'Gmail/Outlook sync and shared calendar booking',
    'Hindi toggle on the sales screens',
    'Razorpay payment links when you connect an account',
  ];

  return (
    <section id="pricing" className="section-spacing-lg scroll-mt-24">
      <div className="container-editorial">
        <motion.div initial="hidden" whileInView="show" viewport={VIEWPORT} variants={VARIANTS.container} className="max-w-3xl mx-auto text-center mb-12">
          <motion.p variants={VARIANTS.fadeUp} className="caption mb-4">Pricing</motion.p>
          <motion.h2 variants={VARIANTS.fadeUp} className="headline-lg mb-4">
            One plan. Everything included.
          </motion.h2>
          <motion.p variants={VARIANTS.fadeUp} className="body-md max-w-xl mx-auto">
            No feature gates during the trial. Start free, decide on a plan once you have run a real job through it.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={VARIANTS.fadeUp}
          className="landing-feature max-w-lg mx-auto p-8 md:p-10"
        >
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-display text-xl font-semibold text-primary">Trial</h3>
            <span className="caption">14 days</span>
          </div>
          <p className="flex items-baseline gap-1 mb-6">
            <span className="font-display text-4xl font-bold text-primary">₹0</span>
            <span className="text-sm text-muted">to start</span>
          </p>
          <ul className="space-y-3 mb-8">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-3 text-secondary text-sm">
                <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href={user ? '/login' : '/signup'}
            className="landing-btn inline-flex items-center justify-center gap-2 w-full"
          >
            {user ? 'Open dashboard' : 'Start 14-day trial'}
            <ArrowRight size={16} />
          </Link>
          <p className="text-center text-sm text-muted mt-4">No credit card required</p>
        </motion.div>
      </div>
    </section>
  );
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="section-spacing-lg bg-surface-elevated">
      <div className="container-editorial max-w-3xl">
        <motion.div initial="hidden" whileInView="show" viewport={VIEWPORT} variants={VARIANTS.container}>
          <motion.p variants={VARIANTS.fadeUp} className="caption mb-4">Questions</motion.p>
          <motion.h2 variants={VARIANTS.fadeUp} className="headline-lg mb-12">
            Before you start the trial.
          </motion.h2>
          <div className="border-t border-border">
            {FAQS.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <motion.div key={item.q} variants={VARIANTS.fadeUp} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-primary">{item.q}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="shrink-0 text-secondary"
                    >
                      <Plus size={18} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="body-sm pb-5 max-w-xl">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
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
          className="landing-close px-8 py-16 md:px-16 md:py-20 text-center"
        >
          <motion.h2 variants={VARIANTS.fadeUp} className="relative headline-lg mb-4">
            Run the next job on a real pipeline.
          </motion.h2>
          <motion.p variants={VARIANTS.fadeUp} className="relative body-lg mb-8 max-w-lg mx-auto opacity-85">
            Fourteen days. Leads, quotes, GST invoices, WhatsApp, and Razorpay — if you connect them.
          </motion.p>
          <motion.div variants={VARIANTS.fadeUp} className="relative flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={user ? '/login' : '/signup'}
              className="landing-btn-invert inline-flex items-center justify-center gap-2"
            >
              {user ? 'Open dashboard' : 'Start free trial'}
              <ArrowRight size={18} />
            </Link>
            {!user && (
              <Link href="/login" className="landing-btn-on-accent inline-flex items-center justify-center">
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
            <Link href="/" className="flex items-center gap-2.5 text-primary mb-4">
              <span className="brand-mark">P</span>
              <span className="font-display text-[15px] font-semibold tracking-tight">Perioxia</span>
            </Link>
            <p className="text-sm text-muted">
              CRM for local service businesses: leads, quotes, GST invoices, and payment.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="#product" className="text-muted hover:text-primary transition-colors">Product</Link>
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
