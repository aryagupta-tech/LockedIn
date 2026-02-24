"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck2,
  Code2,
  Github,
  Lock,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users2
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
  "Connect GitHub + LeetCode/Codeforces",
  "Upload resume (PDF)",
  "AI + human benchmark scoring",
  "Pass and unlock instant access"
];

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

  return (
    <main className="relative overflow-x-hidden text-zinc-50">
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
          <Badge className="mb-4">How It Works</Badge>
          <h2 className="font-[var(--font-geist)] text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            A focused entry flow for serious builders.
          </h2>
          <p className="mt-4 text-zinc-300">
            Thresholds: 1,000+ GitHub contributions (last 2 years) OR Codeforces 2100+ OR LeetCode
            2,000+ OR a strong AI resume score.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {gateSteps.map((step, i) => (
            <Card
              key={step}
              className="border-white/20 bg-[linear-gradient(180deg,rgba(30,30,38,0.55),rgba(17,17,23,0.7))]"
            >
              <CardHeader>
                <Badge variant="muted" className="w-fit border-white/20 bg-white/5 text-zinc-200">{`0${i + 1}`}</Badge>
                <CardTitle className="mt-3 text-lg text-white">{step}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-white/20 bg-[linear-gradient(180deg,rgba(32,36,58,0.55),rgba(19,20,32,0.75))]">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Try the Gate</CardTitle>
            <CardDescription className="text-zinc-300">Mock the full review flow in under a minute.</CardDescription>
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

      <section className="section-shell py-20">
        <Badge className="mb-4">Inside LockedIn</Badge>
        <h3 className="font-[var(--font-geist)] text-3xl font-semibold text-white sm:text-4xl">
          What happens after you get in
        </h3>
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
        <h3 className="font-[var(--font-geist)] text-3xl font-semibold text-white sm:text-4xl">Elite club protocol</h3>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card className="border-white/20 bg-[linear-gradient(180deg,rgba(35,48,78,0.5),rgba(20,23,39,0.7))]">
            <CardHeader>
              <div className="mb-2 w-fit rounded-lg border border-neon/30 bg-neon/10 p-2 text-neon">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl text-white">Verified operators only</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-300">Every profile is benchmarked before entry. No pass, no access.</p>
            </CardContent>
          </Card>
          <Card className="border-white/20 bg-[linear-gradient(180deg,rgba(35,48,78,0.5),rgba(20,23,39,0.7))]">
            <CardHeader>
              <div className="mb-2 w-fit rounded-lg border border-neon/30 bg-neon/10 p-2 text-neon">
                <Lock className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl text-white">Privacy by default</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-300">
                New members stay private until they choose visibility and discoverability.
              </p>
            </CardContent>
          </Card>
          <Card className="border-white/20 bg-[linear-gradient(180deg,rgba(35,48,78,0.5),rgba(20,23,39,0.7))]">
            <CardHeader>
              <div className="mb-2 w-fit rounded-lg border border-neon/30 bg-neon/10 p-2 text-neon">
                <Sparkles className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl text-white">Signal is status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-300">
                Reputation is earned by shipping, mentoring, and building with consistency.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="apply" className="section-shell py-24">
        <Card className="border-white/20 bg-[radial-gradient(circle_at_top_right,rgba(116,135,255,0.25),transparent_45%),linear-gradient(180deg,rgba(29,34,56,0.7),rgba(18,20,32,0.82))]">
          <CardHeader>
            <Badge>Apply</Badge>
            <CardTitle className="mt-3 text-3xl text-white sm:text-4xl">Ready to prove you&apos;re locked in?</CardTitle>
            <CardDescription className="mt-2 text-base text-zinc-300">
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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[rgba(10,12,22,0.75)] backdrop-blur-xl">
      <div className="section-shell flex h-16 items-center justify-between">
        <a href="#" className="flex items-center gap-2 font-[var(--font-geist)] text-lg font-semibold text-white">
          <BrandMark /> LockedIn
        </a>
        <nav className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
          <a href="#how" className="hover:text-white">How it Works</a>
          <a href="#apply" className="hover:text-white">Apply</a>
        </nav>
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <a href="#apply">Apply Now</a>
        </Button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-screen items-center pt-20">
      <div className="hero-aurora" />
      <div className="section-shell relative z-10 py-20">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl text-center"
        >
          <Badge className="mb-6 border-white/20 bg-white/10 text-zinc-100">
            <Sparkles className="mr-1 h-3 w-3" /> Curated network for high-signal builders
          </Badge>
          <h1 className="font-[var(--font-geist)] text-4xl font-semibold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Build with people who
            <br />
            actually ship.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base text-zinc-200 sm:text-xl">
            LockedIn is a private professional network where quality matters more than noise.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <a href="#apply">
                Apply for Access <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#how">See the Process</a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
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
    <Card className="border-white/20 bg-[linear-gradient(180deg,rgba(39,45,72,0.5),rgba(20,23,38,0.72))]">
      <CardHeader>
        <div className="mb-4 w-fit rounded-lg border border-neon/40 bg-neon/10 p-2 text-neon">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-zinc-300">{desc}</p>
      </CardContent>
    </Card>
  );
}

function Footer() {
  const links = ["Privacy", "Terms", "Careers", "Contact", "X"];

  return (
    <footer className="border-t border-white/10 py-10">
      <div className="section-shell flex flex-col items-start justify-between gap-4 text-sm text-zinc-300 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-zinc-100">
          <BrandMark /> LockedIn
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {links.map((link) => (
            <a key={link} href="#" className="transition-colors hover:text-white">
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

function BrandMark() {
  return (
    <span className="relative inline-flex h-5 w-5 items-center justify-center">
      <span className="absolute inset-0 rounded-[8px] bg-gradient-to-br from-[#8fd6ff] via-[#7f8dff] to-[#f3c680] opacity-85 blur-[0.5px]" />
      <span className="absolute inset-[1.5px] rounded-[7px] bg-[#090f1d]" />
      <span className="absolute h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#a5e0ff] to-[#ffd086]" />
      <span className="absolute h-3.5 w-3.5 rounded-full border border-white/25" />
    </span>
  );
}
