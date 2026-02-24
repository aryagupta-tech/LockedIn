"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck2,
  Crown,
  Code2,
  EyeOff,
  Github,
  Lock,
  ShieldCheck,
  Sparkles,

  UploadCloud,
  Users2
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
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
import { cn } from "@/lib/utils";

const gateSteps = [
  "Connect GitHub + LeetCode/Codeforces",
  "Upload resume (PDF)",
  "AI + human benchmark scoring",
  "Pass and unlock instant access"
];

const leaderboard = [
  ["Cohort 07-A", "Systems Engineering", 97, "2h ago"],
  ["Cohort 04-C", "Product Design", 95, "4h ago"],
  ["Cohort 09-B", "AI Engineering", 96, "6h ago"],
  ["Cohort 06-D", "Frontend Architecture", 94, "8h ago"],
  ["Cohort 03-A", "Founder Track", 93, "10h ago"],
  ["Cohort 08-E", "Creator Systems", 92, "12h ago"]
] as const;

const waitlistSchema = z.object({
  name: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["Developer", "Designer", "Creator", "Founder", "Other"]),
  github: z.string().optional()
});

type WaitlistData = z.infer<typeof waitlistSchema>;

export function LandingPage() {
  const [scoreProgress, setScoreProgress] = useState(0);
  const [connected, setConnected] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful }
  } = useForm<WaitlistData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      name: "",
      email: "",
      role: undefined,
      github: ""
    }
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
    await new Promise((r) => setTimeout(r, 1200));
    console.log("Application submitted", data);
    reset();
  };

  const eligibleText = useMemo(
    () =>
      "Thresholds: 1,000+ GitHub contributions (last 2 years) OR Codeforces ≥2100 OR LeetCode 2,000+ OR strong AI resume score.",
    []
  );

  return (
    <main className="relative overflow-x-hidden bg-bg text-zinc-50">
      <Navbar />
      <Hero />

      <section id="how" className="section-shell py-24">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45 }}
          className="mb-10 max-w-3xl"
        >
          <Badge className="mb-4">The Gate</Badge>
          <h2 className="font-[var(--font-geist)] text-3xl font-semibold tracking-tight sm:text-5xl">
            Getting in is deliberately hard. That&apos;s the point.
          </h2>
          <p className="mt-4 text-zinc-400">{eligibleText}</p>
        </motion.div>

        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {gateSteps.map((step, i) => (
            <Card key={step} className="min-w-[260px] snap-start sm:min-w-0">
              <CardHeader>
                <Badge variant="muted" className="w-fit">{`0${i + 1}`}</Badge>
                <CardTitle className="mt-3 text-lg">{step}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-neon/25 bg-[linear-gradient(180deg,rgba(28,21,14,0.9),rgba(18,13,9,0.92))]">
          <CardHeader>
            <CardTitle className="text-2xl">Try the Gate</CardTitle>
            <CardDescription>Mock the full review flow in under a minute.</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="animate-pulseGlow">Try the Gate</Button>
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
                  <label className="block cursor-pointer rounded-xl border border-dashed border-[#745935] p-4 text-sm text-zinc-300 hover:border-neon/60">
                    <input
                      className="hidden"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setUploadName(e.target.files?.[0]?.name ?? null)}
                    />
                    <span className="flex items-center gap-2">
                      <UploadCloud className="h-4 w-4 text-neon" />
                      {uploadName ?? "Upload resume (PDF)"}
                    </span>
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
                    <p className="text-sm text-zinc-400">Live score: {scoreProgress}/100</p>
                  </div>
                  {scoreProgress >= 94 && (
                    <div className="rounded-xl border border-neon/40 bg-neon/10 p-3 text-sm text-[#f0d7a4]">
                      Congratulations, you&apos;re locked in.
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </section>

      <section id="leaderboard" className="section-shell py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <Badge className="mb-4">Leaderboard</Badge>
            <h3 className="font-[var(--font-geist)] text-3xl font-semibold sm:text-4xl">
              Newly Locked In This Week
            </h3>
            <p className="mt-3 text-sm text-zinc-400">
              Identity remains hidden until members choose to go public.
            </p>
          </div>
        </div>
        <div className="marquee-wrapper overflow-hidden">
          <div className="marquee-track">
            {[...leaderboard, ...leaderboard].map(([cohort, field, score, time], idx) => (
              <Card key={`${cohort}-${idx}`} className="min-w-[270px] bg-[linear-gradient(180deg,rgba(27,20,13,0.9),rgba(16,12,9,0.92))]">
                <CardHeader>
                  <CardTitle className="text-lg">{cohort}</CardTitle>
                  <CardDescription>{field}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm">
                  <Badge>Score {score}</Badge>
                  <span className="text-zinc-400">{time}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell py-20">
        <Badge className="mb-4">Inside LockedIn</Badge>
        <h3 className="font-[var(--font-geist)] text-3xl font-semibold sm:text-4xl">What happens after you get in</h3>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon={Code2}
            title="Share real work, not humblebrags"
            desc="Post repos, experiments, launch breakdowns, and hard lessons from shipping."
          />
          <FeatureCard
            icon={Users2}
            title="Private communities by skill"
            desc="System Design, UI Craft, Startup Grind, ML Ops, Growth Engineering, and more."
          />
          <FeatureCard
            icon={CalendarCheck2}
            title="Elite events and live AMAs"
            desc="Weekly sessions with operators, builders, and product leaders worth listening to."
          />
          <FeatureCard
            icon={Briefcase}
            title="High-signal job board"
            desc="Only vetted companies that pass the same gate can post opportunities."
          />
        </div>
      </section>

      <section className="section-shell py-20">
        <Badge className="mb-4">Inner Circle</Badge>
        <h3 className="font-[var(--font-geist)] text-3xl font-semibold sm:text-4xl">Elite club protocol</h3>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-2 w-fit rounded-lg border border-neon/30 bg-neon/10 p-2 text-neon">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">Verified operators only</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400">
                Every profile is benchmarked before entry. No pass, no access.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 w-fit rounded-lg border border-neon/30 bg-neon/10 p-2 text-neon">
                <EyeOff className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">Privacy by default</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400">
                New members stay private until they choose visibility and discoverability.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 w-fit rounded-lg border border-neon/30 bg-neon/10 p-2 text-neon">
                <Crown className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">Signal is status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400">
                Reputation is earned by shipping, mentoring, and building with consistency.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="apply" className="section-shell py-24">
        <Card className="border-neon/25 bg-radial-noise">
          <CardHeader>
            <Badge>Apply</Badge>
            <CardTitle className="mt-3 text-3xl sm:text-4xl">Ready to prove you&apos;re locked in?</CardTitle>
            <CardDescription className="mt-2 text-base">
              Zero spam. Ever. First 500 get lifetime Founder badge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Alex Morgan" {...register("name")} />
                {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="alex@domain.com" {...register("email")} />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
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
                {errors.role && <p className="mt-1 text-xs text-red-400">Choose your primary role</p>}
              </div>
              <div>
                <Label htmlFor="github">GitHub username (optional)</Label>
                <Input id="github" placeholder="octocat" {...register("github")} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Application \u2192 AI will review in <24h"}
                </Button>
                {isSubmitSuccessful && (
                  <p className="mt-2 text-sm text-neon">Application received. We&apos;ll be in touch.</p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <Footer />
    </main>
  );
}

function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#584226]/60 glass">
      <div className="section-shell flex h-16 items-center justify-between">
        <a href="#" className="flex items-center gap-2 font-[var(--font-geist)] text-lg font-semibold">
          <Lock className="h-4 w-4 text-neon" /> LockedIn
        </a>
        <nav className="hidden items-center gap-6 text-sm text-[#c4b8a6] md:flex">
          <a href="#how" className="hover:text-neon">How it Works</a>{" "}
          <a href="#leaderboard" className="hover:text-neon">Leaderboard</a>{" "}
          <a href="#" className="hover:text-neon">For Companies</a>{" "}
          <a href="#" className="hover:text-neon">Blog</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <a href="#apply">Apply Now</a>
          </Button>
          <Button variant="ghost" asChild size="sm">
            <a href="#">Already Locked In? Sign in</a>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-screen items-center pt-20">
      <div className="grid-bg" />
      <div className="section-shell relative z-10 py-20">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-5xl text-center"
        >
          <Badge className="mb-6">
            <Sparkles className="mr-1 h-3 w-3" /> Only the locked-in get in.
          </Badge>
          <h1 className="font-[var(--font-geist)] text-4xl font-semibold leading-tight tracking-wide sm:text-6xl lg:text-7xl">
            Not everyone gets in.
            <br />
            <span className="neon-text">LockedIn is for the obsessed.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base text-[#d3c8b7] sm:text-xl">
            The private social network where only the highest-signal builders, coders, designers &amp;
            creators are allowed in.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <a href="#apply">
                Get Locked In <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#how">See the Gate</a>
            </Button>
          </div>

          <div className="mt-12 rounded-2xl border border-[#584226]/80 bg-[#18110d]/80 px-4 py-3 text-sm text-[#d3c8b7]">
            Already 1,247 locked-in members • Backed by builders from Google, Figma, Vercel, OpenAI
          </div>
        </motion.div>

        <div className="pointer-events-none absolute left-4 top-24 hidden space-y-3 lg:block">
          <FloatingBadge text="Newly Locked In: Confidential Profile" delay={0} />
          <FloatingBadge text="Newly Locked In: Identity Hidden" delay={0.6} />
        </div>
        <div className="pointer-events-none absolute right-4 top-40 hidden space-y-3 lg:block">
          <FloatingBadge text="Newly Locked In: Private Cohort Access" delay={0.3} />
          <FloatingBadge text="Newly Locked In: Verified Builder" delay={0.9} />
        </div>
      </div>
    </section>
  );
}

function FloatingBadge({ text, delay }: { text: string; delay: number }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="animate-float rounded-full border border-neon/30 bg-[#1a140f]/85 px-4 py-2 text-xs text-[#f0d7a4]"
    >
      {text}
    </motion.div>
  );
}

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
    <Card>
      <CardHeader>
        <div className="mb-4 w-fit rounded-lg border border-neon/40 bg-neon/10 p-2 text-neon">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-zinc-400">{desc}</p>
      </CardContent>
    </Card>
  );
}

function Footer() {
  const links = ["Privacy", "Terms", "Careers", "Contact", "X"];

  return (
    <footer className="border-t border-[#584226]/70 py-10">
      <div className="section-shell flex flex-col items-start justify-between gap-4 text-sm text-zinc-400 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-zinc-200">
          <Lock className="h-4 w-4 text-neon" /> LockedIn
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {links.map((link) => (
            <a key={link} href="#" className={cn("transition-colors hover:text-neon")}>
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
