import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-slate/10 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-linear-to-br from-babyblue to-babyblue/80 rounded-md flex items-center justify-center shadow-sm">
              <div className="w-3 h-3 border-2 border-white rounded-sm" />
            </div>
            <span className="text-lg font-semibold text-foreground tracking-tight">
              Orbis
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm font-medium text-slate hover:text-babyblue transition-colors duration-200"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-slate hover:text-babyblue transition-colors duration-200"
            >
              How it works
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-foreground text-background rounded-md font-medium text-sm hover:bg-foreground/90 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-linear-to-br from-babyblue/3 via-transparent to-accent-purple/2" />

        <div className="relative max-w-6xl mx-auto px-8 pt-16 pb-12">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            {/* Left column - Main content */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-success/30 bg-linear-to-r from-success/10 to-success/5 mb-6 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-success/50 shadow-sm" />
                <span className="text-[10px] font-bold text-success tracking-widest">
                  PRODUCTION READY
                </span>
              </div>

              <h1 className="text-[54px] font-bold text-foreground mb-5 leading-[1.08] tracking-[-0.03em]">
                Know what your{" "}
                <span className="relative inline-block">
                  <span className="text-babyblue italic font-serif">
                    AI agents
                  </span>
                  <div className="absolute -bottom-1 left-0 w-full h-1 bg-linear-to-r from-babyblue/30 via-babyblue/50 to-transparent" />
                </span>{" "}
                are doing
              </h1>

              <p className="text-[18px] text-slate leading-[1.6] mb-8 max-w-[520px] font-light">
                Every LLM call traced. Every dollar accounted for. Every
                workflow visualized. Production-grade observability built for
                modern AI development.
              </p>

              <div className="flex items-center gap-3 mb-10">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium text-sm hover:bg-foreground/90 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]"
                >
                  View Dashboard
                  <span className="text-xs">→</span>
                </Link>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-slate/50 font-semibold">
                    Quick start
                  </span>
                  <code className="px-3 py-1.5 text-[13px] text-foreground font-mono bg-slate/5 border border-slate/15 rounded shadow-sm">
                    pip install orbis-sdk
                  </code>
                </div>
              </div>
            </div>

            {/* Right column - Stats */}
            <div className="lg:col-span-5">
              <div className="bg-linear-to-br from-slate/3 to-babyblue/2 border border-slate/15 p-7 space-y-6 shadow-sm rounded">
                <div className="relative pl-5">
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-linear-to-b from-babyblue to-babyblue/20" />
                  <div className="text-[10px] uppercase tracking-[0.12em] text-babyblue/70 font-bold mb-2">
                    Latency
                  </div>
                  <div className="text-[36px] font-bold text-foreground tracking-tight leading-none mb-1">
                    &lt;5ms
                  </div>
                  <div className="text-[13px] text-slate/70">
                    overhead per trace
                  </div>
                </div>
                <div className="relative pl-5">
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-linear-to-b from-success to-success/20" />
                  <div className="text-[10px] uppercase tracking-[0.12em] text-success/70 font-bold mb-2">
                    Coverage
                  </div>
                  <div className="text-[36px] font-bold text-foreground tracking-tight leading-none mb-1">
                    100%
                  </div>
                  <div className="text-[13px] text-slate/70">
                    automatic capture rate
                  </div>
                </div>
                <div className="relative pl-5">
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-linear-to-b from-mustard to-mustard/20" />
                  <div className="text-[10px] uppercase tracking-[0.12em] text-mustard/70 font-bold mb-2">
                    Cost tracking
                  </div>
                  <div className="text-[36px] font-bold text-foreground tracking-tight leading-none mb-1">
                    Real-time
                  </div>
                  <div className="text-[13px] text-slate/70">
                    token-level precision
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="py-16 border-t border-slate/10 bg-linear-to-b from-slate/2 to-transparent"
      >
        <div className="max-w-6xl mx-auto px-8">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-1 h-1 rounded-full bg-babyblue" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-babyblue font-bold">
                Implementation
              </span>
            </div>
            <h2 className="text-[38px] font-bold text-foreground tracking-tight mb-3 leading-[1.15]">
              Three steps to full visibility
            </h2>
            <p className="text-[16px] text-slate/70 max-w-[540px] font-light leading-relaxed">
              One decorator captures your entire agent execution. No manual
              logging, no configuration, no overhead.
            </p>
          </div>

          <div className="space-y-10">
            {/* Step 1 */}
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded bg-linear-to-br from-babyblue to-babyblue/70 flex items-center justify-center shadow-sm">
                    <span className="text-[11px] font-bold text-white tracking-wider">
                      01
                    </span>
                  </div>
                  <h3 className="text-[22px] font-semibold text-foreground tracking-tight">
                    Add decorator
                  </h3>
                </div>
                <p className="text-[15px] text-slate/70 leading-relaxed font-light pl-11">
                  Wrap your agent function with @observe(). That&apos;s it. No
                  config, no setup, no instrumentation code.
                </p>
              </div>
              <div className="lg:col-span-8">
                <div className="relative p-5 bg-linear-to-br from-slate/3 to-babyblue/2 border border-slate/15 shadow-sm rounded overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-babyblue via-babyblue/50 to-transparent" />
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-babyblue/30" />
                      <span className="text-[10px] font-bold text-slate/50 uppercase tracking-widest">
                        Python
                      </span>
                    </div>
                    <span className="text-[10px] text-babyblue font-semibold">
                      example.py
                    </span>
                  </div>
                  <pre className="font-mono text-[14px] leading-[1.7]">
                    <span className="text-babyblue font-bold">@observe()</span>
                    {"\n"}
                    <span className="text-accent-teal font-medium">
                      def
                    </span>{" "}
                    <span className="text-foreground font-semibold">
                      my_agent
                    </span>
                    <span className="text-slate/60">(query: str):</span>
                    {"\n"}
                    <span className="text-slate/40">
                      {" "}
                      # Automatically traced
                    </span>
                    {"\n"}
                    <span className="text-slate/60"> </span>
                    <span className="text-accent-teal font-medium">
                      return
                    </span>{" "}
                    <span className="text-foreground font-medium">process</span>
                    <span className="text-slate/60">(query)</span>
                  </pre>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded bg-linear-to-br from-accent-teal to-accent-teal/70 flex items-center justify-center shadow-sm">
                    <span className="text-[11px] font-bold text-white tracking-wider">
                      02
                    </span>
                  </div>
                  <h3 className="text-[22px] font-semibold text-foreground tracking-tight">
                    Run agent
                  </h3>
                </div>
                <p className="text-[15px] text-slate/70 leading-relaxed font-light pl-11">
                  Execute normally. SDK captures everything in the background
                  with zero performance impact.
                </p>
              </div>
              <div className="lg:col-span-8">
                <div className="relative p-5 bg-linear-to-br from-slate/3 to-accent-teal/2 border border-slate/15 shadow-sm rounded overflow-hidden space-y-3">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-accent-teal via-accent-teal/50 to-transparent" />
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-success shadow-sm shadow-success/30" />
                      <span className="text-[13px] font-semibold text-slate/80">
                        Span captured
                      </span>
                    </div>
                    <span className="font-mono text-[13px] text-slate/60 font-medium">
                      2.3s
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-mustard shadow-sm shadow-mustard/30" />
                      <span className="text-[13px] font-semibold text-slate/80">
                        Cost calculated
                      </span>
                    </div>
                    <span className="font-mono text-[13px] text-mustard font-bold">
                      $0.004
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-babyblue shadow-sm shadow-babyblue/30" />
                      <span className="text-[13px] font-semibold text-slate/80">
                        Trace sent
                      </span>
                    </div>
                    <span className="font-mono text-[13px] text-slate/60 font-medium">
                      async
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded bg-linear-to-br from-accent-purple to-accent-purple/70 flex items-center justify-center shadow-sm">
                    <span className="text-[11px] font-bold text-white tracking-wider">
                      03
                    </span>
                  </div>
                  <h3 className="text-[22px] font-semibold text-foreground tracking-tight">
                    View traces
                  </h3>
                </div>
                <p className="text-[15px] text-slate/70 leading-relaxed font-light pl-11">
                  Full execution DAG in dashboard. See what happened, what it
                  cost, and where time was spent.
                </p>
              </div>
              <div className="lg:col-span-8">
                <div className="relative p-5 bg-linear-to-br from-slate/3 to-accent-purple/2 border border-slate/15 shadow-sm rounded overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-accent-purple via-accent-purple/50 to-transparent" />
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent-purple/30" />
                      <span className="text-[10px] font-bold text-slate/50 uppercase tracking-widest">
                        Latest execution
                      </span>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 bg-linear-to-r from-success/15 to-success/5 text-success font-bold uppercase tracking-widest rounded-full border border-success/20">
                      Success
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-5">
                    <div className="border-l-2 border-babyblue/30 pl-3">
                      <div className="text-[10px] uppercase tracking-widest text-slate/50 font-bold mb-1.5">
                        Duration
                      </div>
                      <div className="font-mono text-[22px] font-bold text-foreground leading-none">
                        3.2s
                      </div>
                    </div>
                    <div className="border-l-2 border-mustard/30 pl-3">
                      <div className="text-[10px] uppercase tracking-widest text-slate/50 font-bold mb-1.5">
                        Cost
                      </div>
                      <div className="font-mono text-[22px] font-bold text-mustard leading-none">
                        $0.012
                      </div>
                    </div>
                    <div className="border-l-2 border-accent-purple/30 pl-3">
                      <div className="text-[10px] uppercase tracking-widest text-slate/50 font-bold mb-1.5">
                        Spans
                      </div>
                      <div className="font-mono text-[22px] font-bold text-foreground leading-none">
                        7
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section
        id="features"
        className="py-16 border-t border-slate/10 bg-linear-to-b from-transparent via-babyblue/1 to-transparent"
      >
        <div className="max-w-6xl mx-auto px-8">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-1 h-1 rounded-full bg-babyblue" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-babyblue font-bold">
                Capabilities
              </span>
            </div>
            <h2 className="text-[38px] font-bold text-foreground mb-3 tracking-tight leading-[1.15]">
              Built for production
            </h2>
            <p className="text-[16px] text-slate/70 max-w-[560px] font-light leading-relaxed">
              Everything you need to build, monitor, and optimize AI agents at
              scale.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Feature 1 */}
            <div className="group relative p-6 border border-slate/15 bg-linear-to-br from-babyblue/2 to-transparent hover:border-babyblue/30 transition-all duration-300 shadow-sm hover:shadow-md rounded overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-babyblue/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-lg bg-linear-to-br from-babyblue/10 to-babyblue/5 border border-babyblue/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <div className="w-2.5 h-2.5 bg-babyblue rounded-sm" />
                </div>
                <span className="text-[9px] uppercase tracking-[0.12em] text-slate/40 font-bold">
                  Core
                </span>
              </div>
              <h3 className="text-[19px] font-semibold text-foreground mb-2.5 tracking-tight group-hover:text-babyblue transition-colors">
                DAG Visualization
              </h3>
              <p className="text-[14px] text-slate/70 leading-relaxed font-light">
                See the full execution graph. Every span is a node, every
                relationship an edge. Navigate complex workflows visually.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-6 border border-slate/15 bg-linear-to-br from-mustard/2 to-transparent hover:border-mustard/30 transition-all duration-300 shadow-sm hover:shadow-md rounded overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-mustard/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-lg bg-linear-to-br from-mustard/10 to-mustard/5 border border-mustard/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="text-base font-bold text-mustard">$</span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.12em] text-slate/40 font-bold">
                  Core
                </span>
              </div>
              <h3 className="text-[19px] font-semibold text-foreground mb-2.5 tracking-tight group-hover:text-mustard transition-colors">
                Cost Tracking
              </h3>
              <p className="text-[14px] text-slate/70 leading-relaxed font-light">
                Token-level cost calculation. See which models and prompts drive
                your spend. Optimize for efficiency.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-6 border border-slate/15 bg-linear-to-br from-accent-teal/2 to-transparent hover:border-accent-teal/30 transition-all duration-300 shadow-sm hover:shadow-md rounded overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-accent-teal/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-lg bg-linear-to-br from-accent-teal/10 to-accent-teal/5 border border-accent-teal/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="text-xs font-bold text-accent-teal font-mono">
                    v2
                  </span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.12em] text-slate/40 font-bold">
                  Advanced
                </span>
              </div>
              <h3 className="text-[19px] font-semibold text-foreground mb-2.5 tracking-tight group-hover:text-accent-teal transition-colors">
                Prompt Versioning
              </h3>
              <p className="text-[14px] text-slate/70 leading-relaxed font-light">
                Git for prompts. Auto-increment versions, compare diffs,
                rollback instantly. Full audit trail.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group relative p-6 border border-slate/15 bg-linear-to-br from-accent-purple/2 to-transparent hover:border-accent-purple/30 transition-all duration-300 shadow-sm hover:shadow-md rounded overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-accent-purple/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-lg bg-linear-to-br from-accent-purple/10 to-accent-purple/5 border border-accent-purple/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="text-base font-bold text-accent-purple">
                    ✓
                  </span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.12em] text-slate/40 font-bold">
                  Quality
                </span>
              </div>
              <h3 className="text-[19px] font-semibold text-foreground mb-2.5 tracking-tight group-hover:text-accent-purple transition-colors">
                Quality Evaluation
              </h3>
              <p className="text-[14px] text-slate/70 leading-relaxed font-light">
                LLM-as-judge grades every trace. Monitor relevance, accuracy,
                safety. Catch regressions early.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group relative p-6 border border-slate/15 bg-linear-to-br from-slate/3 to-transparent hover:border-slate/25 transition-all duration-300 shadow-sm hover:shadow-md rounded overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-slate/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-lg bg-linear-to-br from-slate/10 to-slate/5 border border-slate/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="text-base font-bold text-foreground">∞</span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.12em] text-slate/40 font-bold">
                  Analytics
                </span>
              </div>
              <h3 className="text-[19px] font-semibold text-foreground mb-2.5 tracking-tight group-hover:text-slate transition-colors">
                Workflow Analysis
              </h3>
              <p className="text-[14px] text-slate/70 leading-relaxed font-light">
                Understand patterns across thousands of traces. Find bottlenecks
                and errors. Optimize systematically.
              </p>
            </div>

            {/* Feature 6 - Highlight */}
            <div className="group relative p-6 border-2 border-babyblue/40 bg-linear-to-br from-babyblue/5 to-babyblue/2 shadow-md hover:shadow-lg transition-all duration-300 rounded overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-babyblue via-accent-teal to-accent-purple" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-lg bg-linear-to-br from-babyblue/20 to-babyblue/10 border-2 border-babyblue/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="text-base font-bold text-babyblue">→</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-linear-to-r from-babyblue/15 to-babyblue/5 border border-babyblue/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-babyblue animate-pulse shadow-sm shadow-babyblue/50" />
                  <span className="text-[9px] uppercase tracking-[0.12em] text-babyblue font-bold">
                    Soon
                  </span>
                </div>
              </div>
              <h3 className="text-[19px] font-semibold text-foreground mb-2.5 tracking-tight">
                Prompt Playground
              </h3>
              <p className="text-[14px] text-slate/70 leading-relaxed font-light">
                Test prompts directly in the dashboard. Compare outputs across
                models and versions. Iterate faster.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* System Architecture */}
      <section className="py-16 border-t border-slate/10 bg-linear-to-b from-transparent to-slate/2">
        <div className="max-w-6xl mx-auto px-8">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-1 h-1 rounded-full bg-slate/50" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-slate/50 font-bold">
                Technical
              </span>
            </div>
            <h2 className="text-[38px] font-bold text-foreground mb-3 tracking-tight leading-[1.15]">
              Enterprise infrastructure
            </h2>
            <p className="text-[16px] text-slate/70 max-w-[560px] font-light leading-relaxed">
              Production-grade architecture designed to scale with your team and
              workload.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="relative p-6 pl-5 border-l-3 border-babyblue/30 bg-linear-to-br from-babyblue/2 to-transparent rounded-r shadow-sm">
              <div className="absolute top-0 left-0 w-0.5 h-full bg-linear-to-b from-babyblue to-transparent" />
              <div className="text-[10px] uppercase tracking-[0.12em] text-babyblue font-bold mb-3">
                Performance
              </div>
              <h3 className="text-[19px] font-semibold text-foreground mb-2.5 tracking-tight">
                Async processing
              </h3>
              <p className="text-[14px] text-slate/70 leading-relaxed font-light">
                Background workers send data without blocking your agent. Zero
                performance impact on production.
              </p>
            </div>

            <div className="relative p-6 pl-5 border-l-3 border-success/30 bg-linear-to-br from-success/2 to-transparent rounded-r shadow-sm">
              <div className="absolute top-0 left-0 w-0.5 h-full bg-linear-to-b from-success to-transparent" />
              <div className="text-[10px] uppercase tracking-[0.12em] text-success font-bold mb-3">
                Security
              </div>
              <h3 className="text-[19px] font-semibold text-foreground mb-2.5 tracking-tight">
                Secure by design
              </h3>
              <p className="text-[14px] text-slate/70 leading-relaxed font-light">
                End-to-end encryption for all data. Granular access controls.
                SOC 2 Type II compliant.
              </p>
            </div>

            <div className="relative p-6 pl-5 border-l-3 border-accent-teal/30 bg-linear-to-br from-accent-teal/2 to-transparent rounded-r shadow-sm">
              <div className="absolute top-0 left-0 w-0.5 h-full bg-linear-to-b from-accent-teal to-transparent" />
              <div className="text-[10px] uppercase tracking-[0.12em] text-accent-teal font-bold mb-3">
                Storage
              </div>
              <h3 className="text-[19px] font-semibold text-foreground mb-2.5 tracking-tight">
                Smart storage
              </h3>
              <p className="text-[14px] text-slate/70 leading-relaxed font-light">
                Large prompts in S3, structured data in Postgres, time-series in
                TimescaleDB. Optimized for every use case.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-slate/10">
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-3 justify-center">
              <div className="w-1 h-1 rounded-full bg-babyblue" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-babyblue font-bold">
                Quick Start
              </span>
            </div>
            <h2 className="text-[38px] font-bold text-foreground mb-3 tracking-tight leading-[1.15]">
              Start tracing in 30 seconds
            </h2>
            <p className="text-[16px] text-slate/70 font-light">
              Install the SDK and instrument your first agent. No configuration
              required.
            </p>
          </div>

          {/* Code snippet */}
          <div className="max-w-3xl mx-auto mb-10">
            <div className="relative p-6 border border-slate/15 bg-linear-to-br from-slate/3 to-babyblue/2 shadow-md rounded overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-babyblue via-accent-teal to-accent-purple" />
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate/10">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-slate/50 uppercase tracking-wider">
                    Terminal
                  </span>
                  <span className="text-[10px] text-slate/40">•</span>
                  <span className="text-[10px] text-babyblue font-medium">
                    setup.py
                  </span>
                </div>
                <button className="text-[10px] text-babyblue hover:text-babyblue/80 font-semibold uppercase tracking-wider transition-colors duration-200">
                  Copy
                </button>
              </div>
              <div className="font-mono text-[14px] space-y-4">
                <div>
                  <span className="text-slate/40">$ </span>
                  <span className="text-foreground font-medium">
                    pip install orbis-sdk
                  </span>
                </div>
                <div className="pt-3 space-y-1.5">
                  <div>
                    <span className="text-accent-teal">from</span>{" "}
                    <span className="text-foreground">orbis</span>{" "}
                    <span className="text-accent-teal">import</span>{" "}
                    <span className="text-foreground">observe</span>
                  </div>
                  <div className="text-slate/40">
                    <br />
                  </div>
                  <div>
                    <span className="text-babyblue font-semibold">
                      @observe()
                    </span>
                  </div>
                  <div>
                    <span className="text-accent-teal">def</span>{" "}
                    <span className="text-foreground font-medium">
                      my_agent
                    </span>
                    <span className="text-slate/60">(query: str):</span>
                  </div>
                  <div className="pl-4 text-slate/40">
                    # Automatically traced with full context
                  </div>
                  <div className="pl-4">
                    <span className="text-accent-teal">return</span>{" "}
                    <span className="text-foreground">process</span>
                    <span className="text-slate/60">(query)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-7 py-3 bg-foreground text-background font-medium text-sm hover:bg-foreground/90 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              View Dashboard
            </Link>
            <a
              href="#features"
              className="px-7 py-3 border border-slate/20 font-medium text-sm text-foreground hover:bg-slate/5 transition-colors duration-200"
            >
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate/10 py-16">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-start justify-between mb-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 bg-linear-to-br from-babyblue to-babyblue/80 rounded-md flex items-center justify-center shadow-sm">
                  <div className="w-3 h-3 border-2 border-white rounded-sm" />
                </div>
                <span className="text-lg font-semibold text-foreground tracking-tight">
                  Orbis
                </span>
              </div>
              <p className="text-sm text-slate/70 max-w-xs">
                Observability for AI agents. Every call traced, every dollar
                tracked.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-12">
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  Product
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a
                      href="#features"
                      className="text-slate/70 hover:text-babyblue transition-colors duration-200"
                    >
                      Features
                    </a>
                  </li>
                  <li>
                    <Link
                      href="/dashboard"
                      className="text-slate/70 hover:text-babyblue transition-colors duration-200"
                    >
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-slate/70 hover:text-babyblue transition-colors duration-200"
                    >
                      Documentation
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  Resources
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a
                      href="#"
                      className="text-slate/70 hover:text-babyblue transition-colors duration-200"
                    >
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-slate/70 hover:text-babyblue transition-colors duration-200"
                    >
                      Examples
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-slate/70 hover:text-babyblue transition-colors duration-200"
                    >
                      Support
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate/10">
            <p className="text-xs text-slate/60">
              © 2025 Orbis. Built for developers who ship AI agents.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
