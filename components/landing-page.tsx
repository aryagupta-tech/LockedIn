"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck2,
  CheckCircle2,
  Code2,
  Github,
  Lock,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users2,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const gateSteps = [
  { label: "Connect GitHub + LeetCode", icon: Github, desc: "Link your coding profiles" },
  { label: "Upload resume (PDF)", icon: UploadCloud, desc: "AI parses your experience" },
  { label: "AI + human benchmark", icon: Zap, desc: "Multi-signal scoring" },
  { label: "Unlock instant access", icon: CheckCircle2, desc: "Welcome to the inner circle" }
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
  const [scoreProgress, setScoreProgress] = useState(0);
  const [connected, setConnected] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  useEffect(() => {
    if (!isScoring) return;
    if (scoreProgress >= 94) {
      setIsScoring(false);
      return;
    }
    const timer = setTimeout(() => {
      setScoreProgress((prev) => Math.min(prev + 8, 94));
    }, 180);
    return () => clearTimeout(timer);
  }, [isScoring, scoreProgress]);

  return (
    <main className="relative overflow-x-hidden text-zinc-100">
      <Navbar />
      <Hero />

      {/* --- How It Works --- */}
      <div className="section-divider" />
      <section id="how" className="section-shell py-28">
        <AnimatedSection>
          <motion.div variants={fadeUp} className="mb-14 max-w-3xl">
            <Badge className="mb-5">How It Works</Badge>
            <h2 className="font-[var(--font-geist)] text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              A focused entry flow for
              <span className="text-gradient-gold"> serious builders.</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-zinc-400">
              Thresholds: 1,000+ GitHub contributions (last 2 years) OR Codeforces 2100+ OR LeetCode
              2,000+ OR a strong AI resume score.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gateSteps.map((step, i) => (
              <motion.div key={step.label} variants={fadeUp}>
                <Card className="card-glow group h-full border-white/[0.06] hover:border-white/[0.12]">
                  <CardHeader>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon/20 to-neon/5 text-neon transition-colors group-hover:from-neon/30 group-hover:to-neon/10">
                        <step.icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold tracking-widest text-zinc-500">0{i + 1}</span>
                    </div>
                    <CardTitle className="text-base font-semibold text-white">{step.label}</CardTitle>
                    <p className="mt-1 text-sm text-zinc-500">{step.desc}</p>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp}>
            <Card className="animated-border mt-10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-neon/[0.04] via-transparent to-blue-500/[0.03]" />
              <CardHeader className="relative">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon/10 text-neon">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">Try the Gate</CardTitle>
                    <CardDescription className="text-zinc-400">Mock the full review flow in under a minute.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="animate-pulseGlow">
                      Launch Simulator <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>LockedIn Gate Simulator</DialogTitle>
                      <DialogDescription>
                        Simulate identity proof, resume upload, and AI benchmark scoring.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-6 space-y-4">
                      <Button
                        type="button"
                        variant={connected ? "outline" : "default"}
                        className="w-full"
                        onClick={() => setConnected(true)}
                      >
                        <Github className="mr-2 h-4 w-4" />
                        {connected ? "GitHub connected" : "Connect GitHub"}
                      </Button>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/10 p-4 text-sm text-zinc-400 transition-colors hover:border-neon/30 hover:text-zinc-300">
                        <input
                          className="hidden"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setUploadName(e.target.files?.[0]?.name ?? null)}
                        />
                        <UploadCloud className="h-4 w-4 text-neon/70" />
                        {uploadName ?? "Upload resume (PDF)"}
                      </label>
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => {
                          setScoreProgress(0);
                          setIsScoring(true);
                        }}
                        disabled={!connected || !uploadName || isScoring}
                      >
                        {isScoring ? "Scoring..." : "Run AI + human benchmark"}
                      </Button>
                      <div className="space-y-2">
                        <Progress value={scoreProgress} />
                        <p className="text-xs text-zinc-500">
                          Live score: <span className="font-mono text-zinc-300">{scoreProgress}</span>/100
                        </p>
                      </div>
                      {scoreProgress >= 94 && (
                        <div className="rounded-xl border border-neon/30 bg-neon/[0.08] p-4 text-sm text-neon-light">
                          <CheckCircle2 className="mb-1 inline h-4 w-4 text-neon" /> Congratulations, you&apos;re locked in.
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
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
            <h3 className="font-[var(--font-geist)] text-3xl font-semibold text-white sm:text-5xl">
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
                title="Private communities by skill"
                desc="System Design, UI Craft, Startup Grind, ML Ops, Growth Engineering, and more."
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <FeatureCard
                icon={CalendarCheck2}
                title="Elite events and live AMAs"
                desc="Weekly sessions with operators, builders, and product leaders worth listening to."
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <FeatureCard
                icon={Briefcase}
                title="High-signal job board"
                desc="Only vetted companies that pass the same gate can post opportunities."
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
            <h3 className="font-[var(--font-geist)] text-3xl font-semibold text-white sm:text-5xl">
              Elite club protocol
            </h3>
          </motion.div>
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Verified operators only",
                desc: "Every profile is benchmarked before entry. No pass, no access.",
                gradient: "from-blue-500/20 to-blue-500/5"
              },
              {
                icon: Lock,
                title: "Privacy by default",
                desc: "New members stay private until they choose visibility and discoverability.",
                gradient: "from-purple-500/20 to-purple-500/5"
              },
              {
                icon: Sparkles,
                title: "Signal is status",
                desc: "Reputation is earned by shipping, mentoring, and building with consistency.",
                gradient: "from-neon/20 to-neon/5"
              }
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp}>
                <Card className="card-glow group h-full border-white/[0.06] hover:border-white/[0.12]">
                  <CardHeader>
                    <div className={`mb-3 w-fit rounded-xl bg-gradient-to-br ${item.gradient} p-2.5 transition-all group-hover:scale-105`}>
                      <item.icon className="h-5 w-5 text-white/80" />
                    </div>
                    <CardTitle className="text-xl text-white">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-relaxed text-zinc-400">{item.desc}</p>
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
        scrolled
          ? "border-b border-white/[0.06] bg-[rgba(6,9,22,0.8)] shadow-[0_4px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="section-shell flex h-16 items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 font-[var(--font-geist)] text-lg font-semibold text-white">
          <BrandMark /> LockedIn
        </a>
        <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <a href="#how" className="transition-colors hover:text-white">How it Works</a>
          <a href="/login" className="transition-colors hover:text-white">Sign In</a>
          <Button size="sm" asChild>
            <a href="/register">Get Started</a>
          </Button>
        </nav>
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
          <Badge className="mb-8 border-white/10 bg-white/[0.05] text-zinc-300">
            <Sparkles className="mr-1.5 h-3 w-3 text-neon" /> Curated network for high-signal builders
          </Badge>
          <h1 className="font-[var(--font-geist)] text-5xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Build with people who
            <br />
            <span className="text-gradient-gold">actually ship.</span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl"
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
      <div className="absolute right-[15%] top-[30%] h-56 w-56 animate-float-slow rounded-full bg-neon/[0.05] blur-[80px]" />
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
    <Card className="card-glow group h-full border-white/[0.06] hover:border-white/[0.12]">
      <CardHeader>
        <div className="mb-4 w-fit rounded-xl bg-gradient-to-br from-neon/20 to-neon/5 p-2.5 text-neon transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-lg text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="leading-relaxed text-zinc-400">{desc}</p>
      </CardContent>
    </Card>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  const links = ["Privacy", "Terms", "Careers", "Contact", "X"];

  return (
    <footer className="border-t border-white/[0.06] py-12">
      <div className="section-shell flex flex-col items-start justify-between gap-6 text-sm text-zinc-500 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5 text-zinc-300">
          <BrandMark /> <span className="font-[var(--font-geist)] font-semibold">LockedIn</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          {links.map((link) => (
            <a key={link} href="#" className="transition-colors hover:text-zinc-200">
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ---------- Brand Mark ---------- */

function BrandMark() {
  return (
    <span className="relative inline-flex h-6 w-6 items-center justify-center">
      <span className="absolute inset-0 rounded-[9px] bg-gradient-to-br from-[#7b9dff] via-[#6e78ff] to-[#f3c680] opacity-90" />
      <span className="absolute inset-[1.5px] rounded-[8px] bg-[#080d1e]" />
      <span className="absolute h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#a5d4ff] to-[#f0c670]" />
      <span className="absolute h-3.5 w-3.5 rounded-full border border-white/20" />
    </span>
  );
}
