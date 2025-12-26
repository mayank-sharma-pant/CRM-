import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';

export default function Landing() {
  const { user } = useAuth();
  const [scrollProgress, setScrollProgress] = useState(0);
  const productSectionRef = useRef(null);
  const workflowLineRef = useRef(null);

  // Scroll progress tracking for product section
  useEffect(() => {
    const handleScroll = () => {
      if (productSectionRef.current) {
        const rect = productSectionRef.current.getBoundingClientRect();
        const sectionHeight = rect.height;
        const scrolled = -rect.top;
        const progress = Math.max(0, Math.min(1, scrolled / (sectionHeight * 0.7)));
        setScrollProgress(progress);
      }

      // Workflow line animation
      if (workflowLineRef.current) {
        const rect = workflowLineRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.7) {
          workflowLineRef.current.classList.add('active');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll reveals
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-deep-navy">Local Service CRM</h1>
            <div className="flex items-center space-x-4">
              {user ? (
                <Link to="/dashboard" className="btn btn-primary">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-[#64748B] hover:text-primary-blue font-medium transition-colors">
                    Login
                  </Link>
                  <Link to="/signup" className="btn btn-primary">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Layered Composition */}
      <section className="relative min-h-screen overflow-hidden bg-hero-gradient grid-pattern flex items-center">
        {/* Ambient Background Animation */}
        <div className="absolute inset-0 opacity-50 pointer-events-none" style={{
          background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #EFF6FF 100%)',
          backgroundSize: '200% 200%',
          animation: 'ambientShift 30s ease infinite'
        }} />

        {/* Animated Blobs for Depth */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob pointer-events-none"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000 pointer-events-none"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000 pointer-events-none"></div>

        {/* Floating UI Elements */}
        <div className="z-10">
          <FloatingElements />
        </div>

        {/* Main Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Text Content */}
            <div className="space-y-8">
              <h2 className="hero-headline headline-reveal">
                <span className="text-gradient-animate">Manage Local Leads.</span><br />
                Close Faster.<br />
                Stay Organized.
              </h2>
              <p className="hero-subheadline scroll-reveal delay-200 text-lg md:text-xl">
                A simple CRM built for local service businesses that don't have time for complex tools.
                Track every lead, never miss a follow-up, and watch your business grow.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 scroll-reveal delay-400">
                {!user && (
                  <>
                    <Link to="/signup" className="btn-hero-primary relative overflow-hidden group">
                      <span className="relative z-10">Start Free Trial</span>
                      <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>
                    </Link>
                    <button className="btn-hero-secondary">
                      See How It Works
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right - Main Dashboard Preview */}
            <div className="perspective-1000">
              <div className="dashboard-preview delay-600 relative">
                {/* Glow behind dashboard */}
                <div className="absolute -inset-4 bg-primary-blue/20 blur-2xl -z-10 rounded-[2rem]"></div>
                <MainDashboard />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain / Reality Check Section */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            <PainStatement
              direction="left"
              title="Your leads are scattered everywhere."
              description="WhatsApp, Excel, sticky notes... You're losing deals because you can't find that one conversation from last week."
              delay="delay-100"
              icon="🧩"
            />
            <PainStatement
              direction="right"
              title="Missed follow-ups = Lost money."
              description="That customer who said 'call me next week'? You forgot. And they hired someone else. Stop leaving money on the table."
              delay="delay-200"
              icon="💸"
            />
            <PainStatement
              direction="left"
              title="You're flying blind on growth."
              description="Are Facebook leads better than referrals? Which services are most profitable? You have no idea what's actually converting."
              delay="delay-300"
              icon="🕶️"
            />
          </div>
        </div>
      </section>

      {/* Product-in-Action Section - Scroll Driven */}
      <section ref={productSectionRef} className="py-32 bg-soft-blue relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left - Progressive Text */}
            <div className="lg:sticky lg:top-32 space-y-12">
              <div className="scroll-reveal">
                <h3 className="section-headline mb-4">
                  See your entire pipeline. Always.
                </h3>
                <p className="section-intro">
                  Track every lead from first call to final payment. No more guessing.
                </p>
              </div>

              <ScrollStep
                active={scrollProgress >= 0}
                number="01"
                title="New lead comes in"
                description="Capture it in 30 seconds. Name, service, source. Done."
              />
              <ScrollStep
                active={scrollProgress >= 0.25}
                number="02"
                title="Status updates automatically"
                description="Mark as contacted, quoted, or won with one tap."
              />
              <ScrollStep
                active={scrollProgress >= 0.5}
                number="03"
                title="Never miss a follow-up"
                description="Set reminders. Get notified. Close more deals."
              />
              <ScrollStep
                active={scrollProgress >= 0.75}
                number="04"
                title="Track everything"
                description="See your conversion rate, revenue, and what's working."
              />
            </div>

            {/* Right - Interactive UI Demo */}
            <div className="lg:sticky lg:top-32">
              <ProductDemo scrollProgress={scrollProgress} />
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section - Vertical Narrative */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 scroll-reveal">
            <h3 className="section-headline mb-4">Simple workflow. Real results.</h3>
            <p className="section-intro">Three steps to never lose a lead again.</p>
          </div>

          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-0 md:left-1/2 top-0 w-1 h-full bg-[#E2E8F0] -translate-x-1/2">
              <div ref={workflowLineRef} className="progress-line w-full bg-primary-blue origin-top" />
            </div>

            <div className="space-y-24">
              <WorkflowStep
                number="1"
                title="Capture Leads"
                description="Add leads from calls, emails, or walk-ins. Takes 30 seconds. No training needed."
                side="left"
              />
              <WorkflowStep
                number="2"
                title="Organize & Follow Up"
                description="Set reminders, update status, add notes. Your CRM keeps you on track so you don't have to remember everything."
                side="right"
              />
              <WorkflowStep
                number="3"
                title="Close & Track"
                description="Mark deals as won, see your conversion rate, and understand what's driving revenue."
                side="left"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Credibility Section */}
      <section className="py-24 bg-soft-blue">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="scroll-reveal">
              <h3 className="section-headline mb-6">
                Built for real service businesses.
              </h3>
              <div className="space-y-4 text-lg text-[#64748B]">
                <p>
                  Not a bloated enterprise tool. Not a generic template.
                </p>
                <p>
                  This is a CRM designed specifically for plumbers, electricians, contractors,
                  freelancers, and local service providers who need results, not complexity.
                </p>
                <p className="font-semibold text-[#0F172A]">
                  Simple. Fast. Affordable.
                </p>
              </div>
            </div>
            <div className="scroll-reveal delay-200">
              <div className="bg-white rounded-xl shadow-2xl p-8 border border-soft">
                <div className="space-y-6">
                  <CredibilityItem icon="⚡" text="Set up in under 5 minutes" />
                  <CredibilityItem icon="📊" text="See results in the first week" />
                  <CredibilityItem icon="💰" text="Affordable pricing for small businesses" />
                  <CredibilityItem icon="🔒" text="Your data stays yours, always" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Bold Ending */}
      <section className="py-32 bg-navy-gradient relative overflow-hidden">
        {/* Subtle gradient animation */}
        <div className="absolute inset-0 opacity-30" style={{
          background: 'linear-gradient(135deg, #0D1B2A 0%, #1e3a5f 50%, #0D1B2A 100%)',
          backgroundSize: '200% 200%',
          animation: 'ambientShift 20s ease infinite'
        }} />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center scroll-reveal">
          <h3 className="text-[48px] md:text-[56px] font-bold text-white mb-6 leading-tight">
            Stop losing leads.<br />Start closing them today.
          </h3>
          <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
            Join local service businesses who are finally in control of their pipeline.
          </p>
          {!user && (
            <Link
              to="/signup"
              className="btn-cta-final inline-block"
              style={{ animation: 'glowPulse 2s ease-in-out' }}
            >
              Get Started Free
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-soft py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-muted">
            © 2024 Local Service CRM. Built for real businesses.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Floating UI Elements Component
function FloatingElements() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden mx-auto max-w-7xl">
      {/* Lead Card - Moved top-left away from text */}
      <div className="floating-element float-1 top-[10%] left-[-5%] lg:left-[-2%] opacity-40 md:opacity-50 transform scale-75 md:scale-90">
        <div className="bg-white rounded-lg shadow-xl p-4 w-64 border border-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">Sarah Johnson</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">New</span>
          </div>
          <p className="text-xs text-muted">Kitchen Renovation</p>
        </div>
      </div>

      {/* Status Badge - Moved top-right away from dashboard */}
      <div className="floating-element float-2 top-[15%] right-[-5%] lg:right-[0%] opacity-50 md:opacity-60 transform scale-75 md:scale-90">
        <div className="bg-white rounded-full shadow-lg px-4 py-2 border border-soft">
          <span className="text-sm font-medium text-accent-teal">✓ Contacted</span>
        </div>
      </div>

      {/* Reminder Chip - Moved bottom-left */}
      <div className="floating-element float-3 bottom-[20%] left-[-2%] lg:left-[2%] opacity-40 md:opacity-50 transform scale-75 md:scale-90">
        <div className="bg-white rounded-lg shadow-lg p-3 border border-soft">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🔔</span>
            <span className="text-sm font-medium">Follow-up: 2 PM</span>
          </div>
        </div>
      </div>

      {/* Notification Toast - Moved bottom-right */}
      <div className="floating-element float-4 bottom-[10%] right-[-2%] lg:right-[2%] opacity-40 md:opacity-50 transform scale-75 md:scale-90">
        <div className="bg-white rounded-lg shadow-xl p-4 w-56 border border-soft">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 text-sm">✓</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Deal Closed!</p>
              <p className="text-xs text-muted">Mike Chen - $2,400</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Card - Hidden on mobile, far left on desktop */}
      <div className="hidden lg:block floating-element float-5 top-[40%] left-[-8%] opacity-30 md:opacity-40 transform scale-75">
        <div className="bg-white rounded-lg shadow-lg p-4 border border-soft">
          <p className="text-xs text-muted mb-2">This Week</p>
          <div className="flex items-end space-x-1">
            <div className="w-6 h-8 bg-primary-blue rounded"></div>
            <div className="w-6 h-12 bg-primary-blue rounded"></div>
            <div className="w-6 h-10 bg-primary-blue rounded"></div>
            <div className="w-6 h-16 bg-primary-blue rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Component
function MainDashboard() {
  return (
    <div className="bg-white rounded-xl shadow-2xl p-6 border border-soft transform tilt-slight glow-blue">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-soft">
          <h4 className="font-bold text-lg text-deep-navy">Pipeline Overview</h4>
          <span className="text-sm text-accent-teal font-medium">12 Active Leads</span>
        </div>

        {/* Lead Cards */}
        <DashboardLeadCard
          name="Emma Davis"
          service="Electrical Work"
          status="Follow-up"
          statusColor="bg-amber-100 text-amber-700"
          value="$1,200"
        />
        <DashboardLeadCard
          name="James Wilson"
          service="Plumbing Repair"
          status="Quoted"
          statusColor="bg-purple-100 text-purple-700"
          value="$850"
        />
        <DashboardLeadCard
          name="Lisa Martinez"
          service="HVAC Service"
          status="New"
          statusColor="bg-blue-100 text-blue-700"
          value="$3,500"
        />
      </div>
    </div>
  );
}

function DashboardLeadCard({ name, service, status, statusColor, value }) {
  return (
    <div className="p-4 border border-soft rounded-lg hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h5 className="font-semibold text-deep-navy">{name}</h5>
          <p className="text-sm text-muted">{service}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {status}
        </span>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-sm font-bold text-primary-blue">{value}</span>
        <span className="text-xs text-muted">3 days ago</span>
      </div>
    </div>
  );
}

// Pain Statement Component
function PainStatement({ direction, title, description, delay, icon }) {
  const animationClass = direction === 'left' ? 'slide-in-left' : 'slide-in-right';
  const bgColor = direction === 'left' ? 'bg-white' : 'bg-gray-50';

  return (
    <div className={`scroll-reveal ${animationClass} ${delay} max-w-4xl mx-auto`}>
      <div className={`${bgColor} rounded-2xl shadow-lg border border-gray-100 p-8 md:p-10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group`}>
        <div className="flex flex-col md:flex-row items-center md:space-x-8 text-center md:text-left">
          <div className="mb-6 md:mb-0 transform group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-4xl shadow-inner border border-blue-100">
              {icon}
            </div>
          </div>
          <div>
            <h4 className="text-[26px] md:text-[32px] font-bold text-deep-navy mb-4 leading-tight">
              {title}
            </h4>
            <p className="text-lg text-muted leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Scroll Step Component
function ScrollStep({ active, number, title, description }) {
  return (
    <div className={`transition-all duration-400 ${active ? 'opacity-100' : 'opacity-30'}`}>
      <div className="flex items-start space-x-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 transition-all duration-400 ${active ? 'bg-primary-blue text-white scale-110' : 'bg-gray-200 text-gray-400'
          }`}>
          {number}
        </div>
        <div>
          <h4 className="text-xl font-bold text-deep-navy mb-2">{title}</h4>
          <p className="text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}

// Product Demo Component - Scroll Driven
function ProductDemo({ scrollProgress }) {
  const step = Math.floor(scrollProgress * 4);

  return (
    <div className="bg-white rounded-xl shadow-2xl p-6 border border-soft sticky top-32">
      <div className="space-y-4">
        {/* Step 0: New lead appears */}
        <div className={`transition-all duration-500 ${step >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className={`p-4 rounded-lg border-2 transition-all duration-500 ${step >= 1 ? 'border-accent-teal' : 'border-primary-blue'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h5 className="font-semibold text-deep-navy">Alex Thompson</h5>
                <p className="text-sm text-muted">Bathroom Remodel</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-500 ${step >= 1 ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'
                }`}>
                {step >= 1 ? 'Contacted' : 'New'}
              </span>
            </div>

            {/* Step 2: Reminder appears */}
            {step >= 2 && (
              <div className="mt-3 animate-[badgeSlideIn_0.4s_ease-out]">
                <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium inline-block">
                  🔔 Follow-up: Tomorrow 10 AM
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Activity log */}
        {step >= 3 && (
          <div className="border-t border-soft pt-4 animate-[fadeInUp_0.5s_ease-out]">
            <p className="text-xs font-semibold text-muted mb-3">RECENT ACTIVITY</p>
            <div className="space-y-2">
              <ActivityLog text="Status updated to Contacted" time="Just now" />
              <ActivityLog text="Follow-up reminder set" time="Just now" />
              <ActivityLog text="Lead created" time="2 min ago" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityLog({ text, time }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-deep-navy">✓ {text}</span>
      <span className="text-muted text-xs">{time}</span>
    </div>
  );
}

// Workflow Step Component
function WorkflowStep({ number, title, description, side }) {
  return (
    <div className={`scroll-reveal flex items-center ${side === 'right' ? 'md:flex-row-reverse' : ''}`}>
      <div className={`flex-1 ${side === 'right' ? 'md:text-right md:pr-16' : 'md:pl-16'}`}>
        <div className="bg-white rounded-xl shadow-lg p-8 border border-soft lift-on-hover">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary-blue text-white rounded-full flex items-center justify-center font-bold text-xl">
              {number}
            </div>
            <h4 className="text-2xl font-bold text-deep-navy">{title}</h4>
          </div>
          <p className="text-lg text-muted leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

// Credibility Item Component
function CredibilityItem({ icon, text }) {
  return (
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-soft-blue rounded-full flex items-center justify-center text-2xl flex-shrink-0">
        {icon}
      </div>
      <p className="text-lg font-medium text-deep-navy">{text}</p>
    </div>
  );
}
