import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-linear-to-br from-babyblue to-accent-teal rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold text-foreground leading-none">
                Orbis
              </span>
              <span className="text-[9px] text-slate/70 font-medium uppercase tracking-widest">
                Observability
              </span>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-babyblue text-white rounded-lg font-medium text-sm hover:bg-babyblue/90 transition-colors duration-200"
          >
            View Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-babyblue-light/60 border border-babyblue/20 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-pulse" />
              <span className="text-xs font-semibold text-babyblue uppercase tracking-wide">
                Developer-First Observability
              </span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              See exactly what your{" "}
              <span className="text-babyblue">AI agents</span> are doing
            </h1>
            <p className="text-xl text-slate mb-8 leading-relaxed">
              Track every LLM call, monitor costs in real-time, and visualize
              complex agent workflows with automatic trace capture and
              intelligent analytics.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-babyblue text-white rounded-lg font-semibold hover:bg-babyblue/90 transition-all duration-200 hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>
              <button className="px-6 py-3 border border-border rounded-lg font-semibold text-foreground hover:bg-slate/5 transition-colors duration-200">
                View Demo
              </button>
            </div>
          </div>
        </div>

        {/* Decorative gradient */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-babyblue-light/20 to-transparent pointer-events-none" />
      </section>

      {/* How It Works */}
      <section className="py-20 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Three steps to complete visibility
            </h2>
            <p className="text-lg text-slate max-w-2xl mx-auto">
              Install our SDK, and we&apos;ll automatically capture everything
              your AI agents do
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-babyblue-light border-4 border-background flex items-center justify-center">
                <span className="text-xl font-bold text-babyblue">1</span>
              </div>
              <div className="p-6 rounded-xl border border-border bg-background h-full">
                <div className="w-10 h-10 rounded-lg bg-babyblue/10 flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-babyblue"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Install the SDK
                </h3>
                <p className="text-sm text-slate mb-4">
                  Add one decorator to your functions and we&apos;ll handle the
                  rest
                </p>
                <div className="p-3 rounded-lg bg-slate/5 border border-border">
                  <code className="text-xs font-mono text-slate">
                    @observe()
                    <br />
                    def my_agent():
                    <br />
                    &nbsp;&nbsp;...
                  </code>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-babyblue-light border-4 border-background flex items-center justify-center">
                <span className="text-xl font-bold text-babyblue">2</span>
              </div>
              <div className="p-6 rounded-xl border border-border bg-background h-full">
                <div className="w-10 h-10 rounded-lg bg-accent-teal/10 flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-accent-teal"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Data flows automatically
                </h3>
                <p className="text-sm text-slate mb-4">
                  Traces are captured, processed, and stored without impacting
                  your agent&apos;s performance
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-babyblue/20 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-babyblue rounded-full" />
                  </div>
                  <span className="text-xs font-mono text-slate">
                    Processing...
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-babyblue-light border-4 border-background flex items-center justify-center">
                <span className="text-xl font-bold text-babyblue">3</span>
              </div>
              <div className="p-6 rounded-xl border border-border bg-background h-full">
                <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-accent-purple"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Visualize everything
                </h3>
                <p className="text-sm text-slate mb-4">
                  Rich dashboards show costs, performance, and execution flows
                  in real-time
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span>95% success rate</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate">
                    <div className="w-2 h-2 rounded-full bg-mustard" />
                    <span>$0.42 avg cost</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Everything you need to understand your agents
            </h2>
            <p className="text-lg text-slate max-w-2xl mx-auto">
              Five powerful features to monitor, debug, and optimize your AI
              workflows
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Feature 1: DAG Visualization */}
            <div className="p-8 rounded-xl border border-border bg-card hover:border-babyblue/30 transition-all duration-300 group">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-babyblue/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <svg
                    className="w-6 h-6 text-babyblue"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    DAG Trace Visualization
                  </h3>
                  <p className="text-sm text-slate mb-4">
                    Interactive flowcharts show exactly how your agent executes.
                    Click any node to see the full prompt and response, hover
                    for instant metrics.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-babyblue-light text-babyblue rounded-md">
                      Parent-child relationships
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-babyblue-light text-babyblue rounded-md">
                      Timeline view
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-babyblue-light text-babyblue rounded-md">
                      Detailed panels
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Cost Analysis */}
            <div className="p-8 rounded-xl border border-border bg-card hover:border-mustard/30 transition-all duration-300 group">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-mustard/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <svg
                    className="w-6 h-6 text-mustard"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Cost Analysis
                  </h3>
                  <p className="text-sm text-slate mb-4">
                    Know exactly where your money goes. Track costs by model,
                    user, and prompt. Identify expensive operations and optimize
                    token usage.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-mustard/10 text-mustard rounded-md">
                      Real-time tracking
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-mustard/10 text-mustard rounded-md">
                      Cost breakdown
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-mustard/10 text-mustard rounded-md">
                      Token analysis
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3: Prompt Versioning */}
            <div className="p-8 rounded-xl border border-border bg-card hover:border-accent-teal/30 transition-all duration-300 group">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent-teal/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <svg
                    className="w-6 h-6 text-accent-teal"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Prompt Versioning
                  </h3>
                  <p className="text-sm text-slate mb-4">
                    Git for your prompts. Track every change, compare versions
                    side-by-side, and rollback instantly. See which versions
                    perform best.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-accent-teal/10 text-accent-teal rounded-md">
                      Version history
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-accent-teal/10 text-accent-teal rounded-md">
                      Diff viewer
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-accent-teal/10 text-accent-teal rounded-md">
                      One-click rollback
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4: LLM-as-Judge */}
            <div className="p-8 rounded-xl border border-border bg-card hover:border-accent-purple/30 transition-all duration-300 group">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <svg
                    className="w-6 h-6 text-accent-purple"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Evaluation System
                  </h3>
                  <p className="text-sm text-slate mb-4">
                    Automatic quality scoring with LLM-as-a-judge. Track
                    relevance, accuracy, and safety. Get alerts when quality
                    drops.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-accent-purple/10 text-accent-purple rounded-md">
                      Auto-grading
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-accent-purple/10 text-accent-purple rounded-md">
                      Quality tracking
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-accent-purple/10 text-accent-purple rounded-md">
                      Regression alerts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 5: Workflow Analysis */}
            <div className="lg:col-span-2 p-8 rounded-xl border border-border bg-linear-to-r from-babyblue-light/30 to-transparent hover:border-babyblue/30 transition-all duration-300 group">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-babyblue/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <svg
                    className="w-6 h-6 text-babyblue"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Workflow Analysis
                  </h3>
                  <p className="text-sm text-slate mb-4">
                    Discover patterns in how your agents execute. Identify
                    bottlenecks, common error paths, and optimization
                    opportunities with Sankey diagrams and heatmaps.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-babyblue-light text-babyblue rounded-md">
                      Pattern detection
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-babyblue-light text-babyblue rounded-md">
                      Bottleneck identification
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-babyblue-light text-babyblue rounded-md">
                      Error analysis
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-babyblue-light text-babyblue rounded-md">
                      Flow visualization
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Deep Dive */}
      <section className="py-20 bg-slate/5 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Built for production
            </h2>
            <p className="text-lg text-slate max-w-2xl mx-auto">
              Enterprise-grade infrastructure that scales with your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-babyblue/10 border border-babyblue/20 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-babyblue"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Zero Latency Impact
              </h3>
              <p className="text-sm text-slate">
                Async batching and background processing means your agents run
                at full speed
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent-teal/10 border border-accent-teal/20 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-accent-teal"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Secure by Default
              </h3>
              <p className="text-sm text-slate">
                End-to-end encryption, SOC 2 compliant infrastructure, and
                granular access controls
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-accent-purple"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Optimized Storage
              </h3>
              <p className="text-sm text-slate">
                Large prompts in S3, metadata in PostgreSQL, and TimescaleDB for
                time-series
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Ready to see what your agents are doing?
          </h2>
          <p className="text-lg text-slate mb-8">
            Install the SDK in minutes and get instant visibility into your AI
            workflows
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-babyblue text-white rounded-lg font-semibold hover:bg-babyblue/90 transition-all duration-200 hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
            >
              Start Monitoring Now
            </Link>
            <button className="px-8 py-4 border border-border rounded-lg font-semibold text-foreground hover:bg-slate/5 transition-colors duration-200">
              Read Documentation
            </button>
          </div>

          {/* Code snippet */}
          <div className="mt-12 p-6 rounded-xl border border-border bg-slate/5 text-left max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate uppercase tracking-wide">
                Quick Start
              </span>
              <button className="text-xs text-babyblue hover:text-babyblue/80 font-medium">
                Copy
              </button>
            </div>
            <code className="text-sm font-mono text-foreground block">
              <span className="text-accent-purple">pip install</span> orbis-sdk
              <br />
              <br />
              <span className="text-accent-teal">from</span> orbis{" "}
              <span className="text-accent-teal">import</span> observe
              <br />
              <br />
              <span className="text-babyblue">@observe()</span>
              <br />
              <span className="text-accent-teal">def</span>{" "}
              <span className="text-mustard">my_agent</span>():
              <br />
              &nbsp;&nbsp;
              <span className="text-slate/60"># Your agent code here</span>
              <br />
              &nbsp;&nbsp;
              <span className="text-accent-teal">return</span> result
            </code>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-linear-to-br from-babyblue to-accent-teal rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">O</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold text-foreground leading-none">
                  Orbis
                </span>
                <span className="text-[9px] text-slate/70 font-medium uppercase tracking-widest">
                  Observability
                </span>
              </div>
            </div>
            <p className="text-sm text-slate">
              © 2025 Orbis. Built for AI developers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
