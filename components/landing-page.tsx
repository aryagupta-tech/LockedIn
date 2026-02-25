"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const gateSteps = [
  { label: "Connect GitHub + LeetCode", icon: Github, desc: "Link your coding profiles" },
  { label: "Upload resume (PDF)", icon: UploadCloud, desc: "AI parses your experience" },
  { label: "AI + human benchmark", icon: Zap, desc: "Multi-signal scoring" },
  { label: "Unlock instant access", icon: CheckCircle2, desc: "Welcome to the inner circle" }
];

const interestOptions = [
  { value: "salary-sharing", label: "Anonymous salary / offer sharing" },
  { value: "project-collab", label: "Private project collabs & co-founder matching" },
  { value: "weekly-digest", label: "Curated weekly digest of what top devs ship" },
  { value: "job-board", label: "Vetted, high-signal job board" },
  { value: "private-communities", label: "Private communities by skill" },
] as const;

const waitlistSchema = z.object({
  name: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["Developer", "Designer", "Creator", "Founder", "Other"]),
  github: z.string().optional(),
  interest: z.enum(
    ["salary-sharing", "project-collab", "weekly-digest", "job-board", "private-communities"],
    { required_error: "Pick what excites you most" }
  ),
  feedback: z.string().max(500).optional(),
});

type WaitlistData = z.infer<typeof waitlistSchema>;

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful }
  } = useForm<WaitlistData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { name: "", email: "", role: undefined, github: "", interest: undefined, feedback: "" }
  });

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

  const onSubmit = async (data: WaitlistData) => {
    setSubmitError(null);
    setWaitlistPosition(null);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error || "Something went wrong.");
        return;
      }
      setWaitlistPosition(json.position);
      reset();
    } catch {
      setSubmitError("Network error. Please try again.");
    }
  };

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

      {/* --- Apply --- */}
      <div className="section-divider" />
      <section id="apply" className="section-shell py-28">
        <AnimatedSection>
          <motion.div variants={fadeUp}>
            <Card className="animated-border relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(100,120,255,0.12),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(214,179,106,0.06),transparent_50%)]" />
              <CardHeader className="relative pb-2">
                <Badge>Apply</Badge>
                <CardTitle className="mt-4 text-3xl text-white sm:text-4xl">
                  Ready to prove you&apos;re
                  <span className="text-gradient-gold"> locked in?</span>
                </CardTitle>
                <CardDescription className="mt-2 text-base text-zinc-400">
                  Zero spam. Ever. First 500 get lifetime Founder badge.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative pt-6">
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Alex Morgan" {...register("name")} />
                    {errors.name && <p className="mt-1.5 text-xs text-red-400/90">{errors.name.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" placeholder="alex@domain.com" {...register("email")} />
                    {errors.email && <p className="mt-1.5 text-xs text-red-400/90">{errors.email.message}</p>}
                  </div>
                  <div>
                    <Label>I&apos;m primarily a...</Label>
                    <Controller
                      control={control}
                      name="role"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Developer">Developer</SelectItem>
                            <SelectItem value="Designer">Designer</SelectItem>
                            <SelectItem value="Creator">Creator</SelectItem>
                            <SelectItem value="Founder">Founder</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.role && <p className="mt-1.5 text-xs text-red-400/90">Choose your primary role</p>}
                  </div>
                  <div>
                    <Label htmlFor="github">GitHub username (optional)</Label>
                    <Input id="github" placeholder="octocat" {...register("github")} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>What would you want most from LockedIn?</Label>
                    <Controller
                      control={control}
                      name="interest"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pick what excites you most" />
                          </SelectTrigger>
                          <SelectContent>
                            {interestOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.interest && <p className="mt-1.5 text-xs text-red-400/90">{errors.interest.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="feedback">Anything else you&apos;d want? (optional)</Label>
                    <textarea
                      id="feedback"
                      placeholder="Tell us what would make LockedIn a must-have for you..."
                      {...register("feedback")}
                      rows={3}
                      className="flex w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 transition-all duration-200 focus-visible:outline-none focus-visible:border-neon/40 focus-visible:ring-1 focus-visible:ring-neon/30 focus-visible:bg-white/[0.05] resize-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Submitting...
                        </span>
                      ) : (
                        <>Submit Application <ArrowRight className="ml-2 h-4 w-4" /></>
                      )}
                    </Button>
                    <p className="mt-2 text-center text-xs text-zinc-500">AI will review in &lt;24h</p>
                    {isSubmitSuccessful && waitlistPosition && (
                      <div className="mt-4 rounded-xl border border-neon/20 bg-neon/[0.06] p-4 text-center">
                        <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-neon">
                          <CheckCircle2 className="h-4 w-4" /> You&apos;re in the waitlist!
                        </p>
                        <p className="mt-1 text-lg font-bold text-white">Position #{waitlistPosition}</p>
                        <p className="mt-1 text-xs text-zinc-500">First 500 get lifetime Founder badge.</p>
                      </div>
                    )}
                    {submitError && (
                      <p className="mt-3 text-center text-sm text-red-400/90">{submitError}</p>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
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
          <a href="#apply" className="transition-colors hover:text-white">Apply</a>
        </nav>
        <Button asChild size="sm">
          <a href="#apply">Apply Now</a>
        </Button>
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
            <Button asChild size="lg">
              <a href="#apply">
                Apply for Access <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#how">See the Process</a>
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
