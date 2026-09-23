'use client';

import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useId, useState } from 'react';
import { Plus } from 'lucide-react';

const TAXABLE = 8400;
const GST_HALF = Math.round(TAXABLE * 0.09);
const TOTAL = TAXABLE + GST_HALF * 2;

function inr(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

const COPIES = [
  { id: 'job', label: 'Job' },
  { id: 'quote', label: 'Quote' },
  { id: 'invoice', label: 'Invoice' },
];

const MOVES = [
  {
    title: 'Capture',
    body: 'A website form, widget, email, or WhatsApp message lands as a lead, with its source and history attached.',
  },
  {
    title: 'Follow up',
    body: 'Cadence reminders, and Gmail or Outlook sent from the record, so the next step is not something you have to remember.',
  },
  {
    title: 'Quote',
    body: 'Price it from a book, write the GST lines, and send a link the customer uses to accept.',
  },
  {
    title: 'Get paid',
    body: 'The accepted quote becomes a sales order, then a GST invoice they can pay on Razorpay.',
  },
];

const FILE_ROWS = [
  ['Source', 'WhatsApp inbound', ''],
  ['Follow-up', 'Day 1 cadence', ''],
  ['Quote', 'Parts + labour', inr(TAXABLE)],
  ['CGST 9%', 'Maharashtra', inr(GST_HALF)],
  ['SGST 9%', 'Same state', inr(GST_HALF)],
  ['Invoice', 'INV-0142', inr(TOTAL)],
  ['Collected', 'Razorpay', inr(TOTAL)],
];

const TRADES = [
  {
    title: 'Contractors',
    body: 'A WhatsApp inquiry becomes a deal with a follow-up date. The quote is accepted, and the GST invoice goes out the same afternoon.',
  },
  {
    title: 'Clinics and shops',
    body: 'Walk-ins and form fills land on one board. The floor team can switch the sales screens to Hindi.',
  },
  {
    title: 'Agencies',
    body: 'Mailbox on the record, a shared booking page, and a pipeline that does not live in a founder’s head.',
  },
];

const CAPABILITIES = [
  {
    title: 'Pipeline',
    body: 'Leads and deals on one board, with due-today, rotting, and next-activity nags so open work does not go quiet.',
  },
  {
    title: 'WhatsApp',
    body: 'Send templates, log inbound replies, and run reminder cadences from the lead. No second inbox.',
  },
  {
    title: 'GST invoices',
    body: 'CGST/SGST or IGST on the invoice, a PDF download, and a pay link when Razorpay is connected.',
  },
  {
    title: 'Quote to cash',
    body: 'Accept a quote, raise a sales order, then invoice and deduct stock. One chain.',
  },
  {
    title: 'Mailbox',
    body: 'Send and log Gmail or Outlook on the record. Push meetings to Google or Microsoft Calendar. Public booking page.',
  },
  {
    title: 'Hindi',
    body: 'Switch the board, leads, and invoices to Hindi from the sidebar. English stays the default.',
  },
];

const INCLUDED = [
  'Unlimited leads, deals, and pipeline stages',
  'WhatsApp templates, inbound logging, and cadences',
  'Quotes, sales orders, and GST invoices',
  'Gmail or Outlook, and a shared booking page',
  'Hindi on the sales screens',
  'Razorpay payment links when you connect an account',
];

const FAQS = [
  {
    q: 'Do I need a GST number to use this?',
    a: 'No. You can run leads, quotes, and the pipeline without one. Add your GSTIN when you are ready to raise GST invoices — CGST/SGST or IGST lines follow the customer’s state.',
  },
  {
    q: 'Does WhatsApp need a separate business account?',
    a: 'You connect your existing WhatsApp Business number. Templates, inbound replies, and reminder cadences run from the same lead record.',
  },
  {
    q: 'Can I switch parts of the CRM to Hindi?',
    a: 'Yes. The board, leads, and invoices can be switched to Hindi from the sidebar, per person. English stays the default until someone switches.',
  },
  {
    q: 'What happens after the 14-day trial?',
    a: 'Start a paid plan and the pipeline stays as it is, or export your leads and invoices. Nothing is charged until you pick a plan.',
  },
  {
    q: 'Is Razorpay required to send invoices?',
    a: 'No. You can send a GST invoice as a PDF without it. Connect Razorpay when you want the customer to pay from the same link.',
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="landing min-h-screen bg-page font-sans">
      <Navbar user={user} />
      <main>
        <Hero user={user} />
        <div className="landing-perf" aria-hidden="true" />
        <Moves />
        <Record />
        <Trades />
        <Capabilities />
        <Pricing user={user} />
        <FAQ />
        <Close user={user} />
      </main>
      <Footer />
    </div>
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
    <header className={`landing-nav fixed top-0 left-0 right-0 z-50 ${scrolled ? 'is-scrolled' : ''}`}>
      <nav className="container-editorial flex items-center justify-between h-14 md:h-16">
        <Link href="/" className="landing-brand">
          <span className="brand-mark">P</span>
          <span className="landing-brand-name">Perioxia</span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          <Link href="#product" className="landing-nav-link">Product</Link>
          <Link href="#features" className="landing-nav-link">Features</Link>
          <Link href="#pricing" className="landing-nav-link">Pricing</Link>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {!user ? (
            <>
              <Link href="/login" className="landing-text-link">Sign in</Link>
              <Link href="/signup" className="landing-btn">Start trial</Link>
            </>
          ) : (
            <Link href="/login" className="landing-btn">Dashboard</Link>
          )}
        </div>

        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="landing-nav-burger"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="landing-menu md:hidden">
          <Link href="#product" onClick={() => setMobileMenuOpen(false)}>Product</Link>
          <Link href="#features" onClick={() => setMobileMenuOpen(false)}>Features</Link>
          <Link href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
          <div className="landing-menu-actions">
            {!user ? (
              <>
                <Link href="/login" className="landing-text-link">Sign in</Link>
                <Link href="/signup" className="landing-btn">Start trial</Link>
              </>
            ) : (
              <Link href="/login" className="landing-btn">Dashboard</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Hero({ user }) {
  return (
    <section className="landing-hero">
      <div className="container-editorial landing-hero-layout">
        <div className="landing-hero-copy">
          <p className="landing-kicker">Job file · clinics, contractors, shops, agencies</p>
          <h1 className="hero-title">
            A WhatsApp ping
            <br />
            becomes a paid
            <br />
            <span>GST invoice.</span>
          </h1>
          <p className="hero-sub">
            The lead, the quote, the tax lines, and the Razorpay link stay on one job. Fourteen days on the full product.
          </p>
          <div className="landing-hero-actions">
            <Link href={user ? '/login' : '/signup'} className="landing-btn landing-btn--lg">
              {user ? 'Open dashboard' : 'Start 14-day trial'}
            </Link>
            {!user && (
              <Link href="/login" className="landing-text-link">Sign in</Link>
            )}
          </div>
          <p className="hero-note">No card · Cancel any time · Hindi on the sales screens</p>
        </div>
        <Triplicate />
      </div>
    </section>
  );
}

function Triplicate() {
  const baseId = useId();
  const reduceMotion = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [userChose, setUserChose] = useState(false);

  useEffect(() => {
    if (reduceMotion || userChose) return undefined;
    const timers = [
      setTimeout(() => setActive(1), 1700),
      setTimeout(() => setActive(2), 3400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduceMotion, userChose]);

  function choose(index) {
    setUserChose(true);
    setActive(index);
  }

  return (
    <div className="triplicate">
      <div className="triplicate-side">
        <div role="tablist" aria-label="Sample job copies" className="triplicate-tabs">
          {COPIES.map((copy, index) => (
            <button
              key={copy.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${copy.id}`}
              aria-selected={active === index}
              aria-controls={`${baseId}-${copy.id}`}
              tabIndex={active === index ? 0 : -1}
              className={`triplicate-tab triplicate-tab--${copy.id}`}
              onClick={() => choose(index)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
                event.preventDefault();
                const dir = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
                const next = (active + dir + COPIES.length) % COPIES.length;
                choose(next);
                document.getElementById(`${baseId}-tab-${COPIES[next].id}`)?.focus();
              }}
            >
              {copy.label}
            </button>
          ))}
        </div>
        <p className="triplicate-caption">Sample job · flip the copies</p>
      </div>

      <div className="triplicate-stage">
        <article
          id={`${baseId}-job`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-job`}
          aria-hidden={active !== 0}
          className={`sheet sheet--job ${depthClass(0, active)}`}
        >
          <JobSheet />
        </article>
        <article
          id={`${baseId}-quote`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-quote`}
          aria-hidden={active !== 1}
          className={`sheet sheet--quote ${depthClass(1, active)}`}
        >
          <QuoteSheet />
        </article>
        <article
          id={`${baseId}-invoice`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-invoice`}
          aria-hidden={active !== 2}
          className={`sheet sheet--invoice ${depthClass(2, active)}`}
        >
          <InvoiceSheet />
        </article>
      </div>
    </div>
  );
}

function depthClass(index, active) {
  const depth = (index - active + COPIES.length) % COPIES.length;
  if (depth === 0) return 'is-front';
  if (depth === 1) return 'is-mid';
  return 'is-back';
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduce(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  return reduce;
}

function JobSheet() {
  return (
    <>
      <p className="slip-kicker">Original</p>
      <h2 className="slip-no">JOB-0142</h2>
      <p className="slip-who">Mehta Air · Andheri</p>
      <p className="slip-bubble">AC not cooling. 2BHK in Andheri. Can you come today?</p>
      <p className="slip-from">WhatsApp · 11:42 · R. Mehta</p>
      <p className="slip-next"><span>Next</span> Quote parts and labour</p>
    </>
  );
}

function QuoteSheet() {
  return (
    <>
      <p className="slip-kicker">Duplicate</p>
      <h2 className="slip-no">QUO-0142</h2>
      <p className="slip-who">AC repair · Andheri</p>
      <ul className="slip-lines">
        <li><span>Parts + labour</span><span>{inr(TAXABLE)}</span></li>
        <li><span>CGST 9%</span><span>{inr(GST_HALF)}</span></li>
        <li><span>SGST 9%</span><span>{inr(GST_HALF)}</span></li>
      </ul>
      <p className="slip-total"><span>Quote total</span><span>{inr(TOTAL)}</span></p>
      <p className="slip-from">Sent · valid 7 days · accept link on the quote</p>
    </>
  );
}

function InvoiceSheet() {
  return (
    <>
      <p className="slip-kicker">Triplicate · tax invoice</p>
      <h2 className="slip-no">INV-0142</h2>
      <p className="slip-who">GSTIN 27AAAAA0000A1Z5</p>
      <ul className="slip-lines">
        <li><span>Parts + labour</span><span>{inr(TAXABLE)}</span></li>
        <li><span>CGST 9%</span><span>{inr(GST_HALF)}</span></li>
        <li><span>SGST 9%</span><span>{inr(GST_HALF)}</span></li>
      </ul>
      <p className="slip-total"><span>Total collected</span><span>{inr(TOTAL)}</span></p>
      <p className="slip-from">Razorpay · UPI · Paid</p>
      <p className="stamp" aria-hidden="true">Paid</p>
    </>
  );
}

function Moves() {
  return (
    <section id="product" className="landing-section">
      <div className="container-editorial">
        <h2 className="landing-display landing-display--md">Four stops. Same job.</h2>
        <div className="landing-moves">
          {MOVES.map((step) => (
            <article key={step.title} className="landing-move">
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Record() {
  return (
    <section className="landing-section landing-section--tight">
      <div className="container-editorial">
        <div className="landing-record-head">
          <h2 className="landing-display landing-display--md">The whole job, filed.</h2>
          <p>Spreadsheets drop the WhatsApp lead. A big CRM buries the tax lines. This is the path a local service job actually takes.</p>
        </div>
        <div className="landing-file">
          <div className="landing-file-head">
            <span>JOB-0142</span>
            <span>Mehta Air · Andheri</span>
          </div>
          <table>
            <caption className="sr-only">Sample job from WhatsApp ping to collected GST invoice</caption>
            <tbody>
              {FILE_ROWS.map(([label, detail, amount]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{detail}</td>
                  <td>{amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Trades() {
  return (
    <section className="landing-section">
      <div className="container-editorial">
        <p className="landing-kicker">Who it is for</p>
        <div className="landing-trades">
          {TRADES.map((trade) => (
            <article key={trade.title} className="landing-trade">
              <h2>{trade.title}</h2>
              <p>{trade.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Capabilities() {
  return (
    <section id="features" className="landing-section">
      <div className="container-editorial">
        <div className="landing-split-head">
          <h2 className="landing-display landing-display--md">On the trial, from day one.</h2>
          <p>No feature gates for fourteen days. Run one real job through it, then decide.</p>
        </div>
        <div className="landing-caps">
          {CAPABILITIES.map((item) => (
            <article key={item.title} className="landing-cap">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ user }) {
  return (
    <section id="pricing" className="landing-section">
      <div className="container-editorial landing-price-layout">
        <div>
          <h2 className="landing-display landing-display--md">One plan. The whole book.</h2>
          <p className="landing-lede">
            Start free. Pick a paid plan only after a real job has gone from ping to paid invoice.
          </p>
        </div>
        <div className="price-sheet">
          <div className="price-sheet-holes" aria-hidden="true">
            <span /><span /><span /><span /><span /><span />
          </div>
          <p className="price-sheet-mark" aria-hidden="true">Duplicate</p>
          <p className="slip-kicker">Trial copy</p>
          <p className="price-sheet-amount">
            <span>₹0</span>
            <span>for 14 days</span>
          </p>
          <ul>
            {INCLUDED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link href={user ? '/login' : '/signup'} className="landing-btn landing-btn--lg">
            {user ? 'Open dashboard' : 'Start 14-day trial'}
          </Link>
          <p className="price-sheet-note">No card required</p>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="landing-section landing-section--tight">
      <div className="container-editorial landing-faq-layout">
        <h2 className="landing-display landing-display--md">Before you start.</h2>
        <div className="landing-faq">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.q} className="landing-faq-item">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <Plus size={16} aria-hidden="true" className={isOpen ? 'is-open' : ''} />
                </button>
                <div className={`landing-faq-panel ${isOpen ? 'is-open' : ''}`}>
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Close({ user }) {
  return (
    <section className="landing-close-wrap">
      <div className="container-editorial landing-close">
        <h2 className="landing-display">Run the next job on this desk.</h2>
        <div>
          <Link href={user ? '/login' : '/signup'} className="landing-btn landing-btn--lg">
            {user ? 'Open dashboard' : 'Start 14-day trial'}
          </Link>
          {!user && (
            <Link href="/login" className="landing-text-link">Sign in</Link>
          )}
          <p>Fourteen days. Leads, quotes, GST invoices, WhatsApp, and Razorpay if you connect it.</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="landing-footer">
      <div className="container-editorial">
        <div className="landing-footer-top">
          <div>
            <Link href="/" className="landing-brand">
              <span className="brand-mark">P</span>
              <span className="landing-brand-name">Perioxia</span>
            </Link>
            <p>CRM for local service businesses: leads, quotes, GST invoices, and payment.</p>
          </div>
          <nav>
            <Link href="#product">Product</Link>
            <Link href="#features">Features</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/signup">Start trial</Link>
          </nav>
        </div>
        <p className="landing-footer-meta">© 2026 Perioxia CRM. All rights reserved.</p>
      </div>
    </footer>
  );
}
