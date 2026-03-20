"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Award,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Github,
  ShieldCheck,
  Sparkles,
  Users2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { LockedInMark } from "@/components/brand/locked-in-mark";

const gateSteps = [
  { label: "Link GitHub + handles", icon: Github, desc: "Connect GitHub and add Codeforces / LeetCode" },
  { label: "Submit application", icon: ClipboardCheck, desc: "Verification steps + the handles we score" },
  { label: "Automated signal check", icon: BarChart3, desc: "Thresholds on your public GitHub, Codeforces, and LeetCode activity" },
  { label: "Unlock access", icon: CheckCircle2, desc: "Meet the bar and join the network" }
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } }
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

function AnimatedSection({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  return (
    <main className="relative overflow-x-hidden bg-app-bg text-app-fg">
      <Navbar />
      <Hero />

      {/* --- How It Works --- */}
      <div className="section-divider" />
      <section id="how" className="section-shell py-28">
        <AnimatedSection>
          <motion.div variants={fadeUp} className="mb-14 max-w-3xl">
            <Badge className="mb-5">How It Works</Badge>
            <h2 className="font-[var(--font-geist)] text-3xl font-semibold tracking-tight text-app-fg sm:text-5xl">
              A focused entry flow for
              <span className="text-gradient-gold"> serious builders.</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-app-fg-muted">
              Pass any one: 250+ GitHub contributions OR Codeforces 900+ rating OR 100+ LeetCode
              problems solved.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gateSteps.map((step, i) => (
              <motion.div key={step.label} variants={fadeUp}>
                <Card className="card-glow group h-full">
                  <CardHeader>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[color-mix(in_srgb,var(--app-accent)_22%,transparent)] to-[color-mix(in_srgb,var(--app-accent-soft)_12%,transparent)] text-[var(--app-accent)] transition-colors group-hover:from-[color-mix(in_srgb,var(--app-accent)_32%,transparent)] group-hover:to-[color-mix(in_srgb,var(--app-accent-soft)_18%,transparent)]">
                        <step.icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold tracking-widest text-app-fg-muted">0{i + 1}</span>
                    </div>
                    <CardTitle className="text-base font-semibold text-app-fg">{step.label}</CardTitle>
                    <p className="mt-1 text-sm text-app-fg-muted">{step.desc}</p>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp}>
            <Card className="animated-border card-glow mt-10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[color-mix(in_srgb,var(--app-accent)_10%,transparent)] via-transparent to-blue-500/[0.06] dark:from-neon/[0.04] dark:to-blue-500/[0.03]" />
              <CardHeader className="relative">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--app-accent-soft)_25%,transparent)] text-[var(--app-accent)] dark:bg-neon/10 dark:text-neon">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-app-fg">Apply to join</CardTitle>
                    <CardDescription className="text-app-fg-muted">
                      Create an account, complete verification, and submit your application. We score public GitHub,
                      Codeforces, and LeetCode signals.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative flex flex-wrap gap-3">
                <Button className="animate-pulseGlow" asChild>
                  <a href="/register">Get started</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/login">Sign in</a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* --- Features --- */}
      <div className="section-divider" />
      <section className="section-shell py-28">
        <AnimatedSection>
          <motion.div variants={fadeUp} className="mb-14 max-w-3xl">
            <Badge className="mb-5">Inside LockedIn</Badge>
            <h3 className="font-[var(--font-geist)] text-3xl font-semibold text-app-fg sm:text-5xl">
              What happens after
              <span className="text-gradient-blue"> you get in</span>
            </h3>
          </motion.div>
          <div className="grid gap-5 md:grid-cols-2">
            <motion.div variants={fadeUp}>
              <FeatureCard
                icon={Code2}
                title="Share real work, not humblebrags"
                desc="Post repos, experiments, launch breakdowns, and hard lessons from shipping."
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <FeatureCard
                icon={Users2}
                title="Topic communities"
                desc="Create or join groups with moderated join requests—your space for focused discussion."
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <FeatureCard
                icon={Award}
                title="Builder levels & badges"
                desc="Level up from real activity: posts, code snippets, comments, follows, and showing up week after week—visible on your profile."
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <FeatureCard
                icon={Bell}
                title="Notifications that matter"
                desc="Likes, comments, follows, and application updates—so you never miss the signal."
              />
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* --- Inner Circle --- */}
      <div className="section-divider" />
      <section className="section-shell py-28">
        <AnimatedSection>
          <motion.div variants={fadeUp} className="mb-14 max-w-3xl">
            <Badge className="mb-5">Inner Circle</Badge>
            <h3 className="font-[var(--font-geist)] text-3xl font-semibold text-app-fg sm:text-5xl">
              Elite club protocol
            </h3>
          </motion.div>
          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
            {[
              {
                icon: ShieldCheck,
                title: "Verified operators only",
                desc: "Every profile is benchmarked before entry. No pass, no access.",
                gradient: "from-blue-500/20 to-blue-500/5"
              },
              {
                icon: Sparkles,
                title: "Signal is status",
                desc: "Builder level, XP, and badges reflect what you actually ship—posts with code, threads you join, and consistency over time.",
                gradient: "from-neon/20 to-neon/5"
              }
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp}>
                <Card className="card-glow group h-full">
                  <CardHeader>
                    <div className={`mb-3 w-fit rounded-xl bg-gradient-to-br ${item.gradient} p-2.5 transition-all group-hover:scale-105`}>
                      <item.icon className="h-5 w-5 text-app-fg/85" />
                    </div>
                    <CardTitle className="text-xl text-app-fg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-relaxed text-app-fg-muted">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      <Footer />
    </main>
  );
}

/* ---------- Navbar ---------- */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "app-top-nav" : "bg-transparent"
      }`}
    >
      <div className="section-shell flex h-16 items-center justify-between gap-3">
        <a
          href="#"
          className={`group flex items-center gap-2.5 font-[var(--font-geist)] text-lg font-bold transition-colors ${
            scrolled ? "text-app-fg" : "text-slate-900 dark:text-app-fg"
          }`}
        >
          <LockedInMark size={24} className="transition-transform duration-200 group-hover:scale-105" />{" "}
          <span className="text-brand-logo">LockedIn</span>
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/login"
            className={`text-sm font-medium md:hidden ${
              scrolled ? "text-app-fg-muted hover:text-app-fg" : "text-slate-600 hover:text-slate-900 dark:text-app-fg-muted dark:hover:text-app-fg"
            }`}
          >
            Sign in
          </a>
          <ThemeToggle />
          <nav className="hidden items-center gap-6 text-sm sm:gap-8 md:flex">
            <a
              href="#how"
              className={`transition-colors ${
                scrolled
                  ? "text-app-fg-muted hover:text-app-fg"
                  : "text-slate-600 hover:text-slate-900 dark:text-app-fg-muted dark:hover:text-app-fg"
              }`}
            >
              How it Works
            </a>
            <a
              href="/login"
              className={`transition-colors ${
                scrolled
                  ? "text-app-fg-muted hover:text-app-fg"
                  : "text-slate-600 hover:text-slate-900 dark:text-app-fg-muted dark:hover:text-app-fg"
              }`}
            >
              Sign In
            </a>
            <Button size="sm" asChild>
              <a href="/register">Get Started</a>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] items-center pt-20">
      <div className="hero-aurora" />
      <FloatingOrbs />
      <div className="section-shell relative z-10 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mx-auto max-w-4xl text-center"
        >
          <Badge variant="muted" className="mb-8">
            <Sparkles className="mr-1.5 h-3 w-3 text-[var(--app-accent)] dark:text-neon" /> Curated network for high-signal builders
          </Badge>
          <h1 className="font-[var(--font-geist)] text-5xl font-semibold leading-[1.1] tracking-tight text-app-fg sm:text-6xl lg:text-7xl">
            Build with people who
            <br />
            <span className="text-gradient-gold">actually ship.</span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-app-fg-muted sm:text-xl"
          >
            LockedIn is a private professional network where quality matters more than noise.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Button size="lg" asChild>
              <a href="/register">Get Started</a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="/login">Sign In</a>
            </Button>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Floating Orbs ---------- */

function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute left-[10%] top-[20%] h-72 w-72 animate-float rounded-full bg-blue-500/[0.06] blur-[100px]" />
      <div className="absolute right-[15%] top-[30%] h-56 w-56 animate-float-slow rounded-full bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] blur-[80px] dark:bg-neon/[0.05]" />
      <div className="absolute bottom-[20%] left-[40%] h-64 w-64 animate-float rounded-full bg-purple-500/[0.04] blur-[90px]" />
    </div>
  );
}

/* ---------- Feature Card ---------- */

function FeatureCard({
  icon: Icon,
  title,
  desc
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Card className="card-glow group h-full">
      <CardHeader>
        <div className="mb-4 w-fit rounded-xl bg-gradient-to-br from-[color-mix(in_srgb,var(--app-accent)_22%,transparent)] to-[color-mix(in_srgb,var(--app-accent-soft)_10%,transparent)] p-2.5 text-[var(--app-accent)] transition-transform duration-300 group-hover:scale-110 dark:from-neon/20 dark:to-neon/5 dark:text-neon">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-lg text-app-fg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="leading-relaxed text-app-fg-muted">{desc}</p>
      </CardContent>
    </Card>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  const links = ["Privacy", "Terms", "Careers", "Contact", "X"];

  return (
    <footer className="border-t border-app-border py-12">
      <div className="section-shell flex flex-col items-start justify-between gap-6 text-sm text-app-fg-muted sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5 text-app-fg-secondary">
          <LockedInMark size={24} />{" "}
          <span className="text-brand-logo font-[var(--font-geist)] font-bold">LockedIn</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          {links.map((link) => (
            <a key={link} href="#" className="transition-colors hover:text-app-fg">
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

