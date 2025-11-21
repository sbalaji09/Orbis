"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AnimatedDAG } from "@/components/AnimatedDAG";
import { ArrowUpRight, Copy, Zap, Shield, Database } from "lucide-react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useState } from "react";

export default function Home() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-black/10 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center">
              <Logo className="w-12 h-12" />
              <span className="tracking-tight font-semibold">$ orbis.ai</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm hover:opacity-70 transition-opacity hover:text-[#5B5FFF]"
              >
                /features
              </a>
              <a
                href="#how-it-works"
                className="text-sm hover:opacity-70 transition-opacity hover:text-[#5B5FFF]"
              >
                /how-it-works
              </a>
              <a
                href="#docs"
                className="text-sm hover:opacity-70 transition-opacity hover:text-[#5B5FFF]"
              >
                /docs
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm px-4 py-2 hover:opacity-70 transition-opacity">
              login()
            </button>
            <Link
              href="/dashboard"
              className="text-sm px-4 py-2 bg-black hover:bg-black/90 text-[#FFD600] border border-black transition-colors"
            >
              dashboard.open()
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 bg-transparent text-[#4CAF50] border border-transparent">
            <div className="w-2 h-2 bg-[#4CAF50] rounded-full animate-pulse"></div>
            <span className="text-xs tracking-wider uppercase">{`// PRODUCTION_READY`}</span>
          </div>

          <h1 className="mb-6 text-6xl lg:text-7xl leading-[1.1] tracking-tight">
            {`>`} Know what your{" "}
            <span className="text-[#5B5FFF]">AI_agents</span> are doing
          </h1>

          <p className="text-xl text-black/60 mb-10 leading-relaxed max-w-3xl mx-auto">
            {`// Every LLM call traced. Every dollar accounted for.`}
            <br />
            {`// Every workflow visualized. Production-grade observability.`}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/dashboard"
              className="bg-black hover:bg-black/90 text-[#FFD600] px-6 py-2.5 border-2 border-black inline-flex items-center gap-2"
            >
              view_dashboard()
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-black text-white border-2 border-black px-4 py-2.5">
                <span className="text-sm text-[#FFD600]">$</span>
                <span className="text-sm">pip install orbis-sdk</span>
              </div>
            </div>
          </div>
        </div>

        {/* DAG Animation */}
        <div className="text-center">
          <div className="text-xs mb-4 text-black/40 tracking-[0.15em] uppercase">{`/* LIVE EXECUTION VISUALIZATION */`}</div>
          <h2 className="text-2xl tracking-tight mb-8 text-black/60">
            {`// Watch your agent workflow come to life`}
          </h2>
        </div>

        <AnimatedDAG />
      </section>

      {/* Stats Section */}
      {/* <section className="border-y border-black/10 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div>
              <div className="text-xs mb-3 text-black/40 tracking-wide uppercase">
                Companies
              </div>
              <div className="text-5xl tracking-tight mb-2">200+</div>
              <div className="text-sm text-black/50">building with Orbis</div>
            </div>
            <div>
              <div className="text-xs mb-3 text-black/40 tracking-wide uppercase">
                Traces
              </div>
              <div className="text-5xl tracking-tight mb-2">50M+</div>
              <div className="text-sm text-black/50">captured per month</div>
            </div>
            <div>
              <div className="text-xs mb-3 text-black/40 tracking-wide uppercase">
                Uptime
              </div>
              <div className="text-5xl tracking-tight mb-2">99.9%</div>
              <div className="text-sm text-black/50">guaranteed SLA</div>
            </div>
          </div>
        </div>
      </section> */}

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="text-xs mb-4 text-black/40 tracking-[0.15em] uppercase">{`/* How it works */`}</div>
          <h2 className="text-4xl lg:text-5xl tracking-tight mb-6">
            <span className="text-black/40">{`> `}</span>
            Three steps to full visibility
          </h2>
          <p className="text-lg text-black/60 max-w-2xl mx-auto leading-relaxed">
            {`// One decorator captures your entire agent execution.`}
            <br />
            {`// No manual logging, no configuration, no overhead.`}
          </p>
        </div>

        <TabGroup>
          <div className="flex justify-center">
            <TabList className="grid grid-cols-3 w-full bg-transparent border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.1)] h-auto p-0 rounded-none gap-0">
              <Tab className="px-8 py-4 rounded-none border-r-2 border-black transition-colors data-selected:bg-black data-selected:text-[#FFD600] text-black/60 hover:bg-black/5">
                <span className="mr-2">01</span> Add decorator
              </Tab>
              <Tab className="px-8 py-4 rounded-none border-r-2 border-black transition-colors data-selected:bg-black data-selected:text-[#FFD600] text-black/60 hover:bg-black/5">
                <span className="mr-2">02</span> Run agent
              </Tab>
              <Tab className="px-8 py-4 rounded-none transition-colors data-selected:bg-black data-selected:text-[#FFD600] text-black/60 hover:bg-black/5">
                <span className="mr-2">03</span> View traces
              </Tab>
            </TabList>
          </div>

          <TabPanels className="mt-16">
            <TabPanel>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                  <h3 className="text-3xl tracking-tight mb-4">
                    <span className="text-black/40">$ </span>Add decorator
                  </h3>
                  <p className="text-lg text-black/60 leading-relaxed">
                    {`// Wrap your agent function with @observe().`}
                    <br />
                    {`// That's it. No config, no setup, no instrumentation code.`}
                  </p>
                </div>
                <div className="bg-black border-2 border-black overflow-hidden shadow-[8px_8px_0_rgba(0,0,0,0.2)]">
                  <div className="border-b-2 border-white/20 px-6 py-3 flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 border border-white/30"></div>
                      <div className="w-3 h-3 bg-yellow-500 border border-white/30"></div>
                      <div className="w-3 h-3 bg-green-500 border border-white/30"></div>
                    </div>
                    <span className="text-xs text-[#FFD600] ml-2">{`> example.py`}</span>
                  </div>
                  <pre className="p-6 overflow-x-auto">
                    <code className="text-sm text-white/90 leading-relaxed">
                      {`@observe()
def my_agent(query: str):
    # Automatically traced
    return process(query)`}
                    </code>
                  </pre>
                </div>
              </div>
            </TabPanel>

            <TabPanel>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                  <h3 className="text-3xl tracking-tight mb-4">
                    <span className="text-black/40">$ </span>Run agent
                  </h3>
                  <p className="text-lg text-black/60 leading-relaxed">
                    {`// Execute normally. SDK captures everything in the background`}
                    <br />
                    {`// with zero performance impact.`}
                  </p>
                </div>
                <div className="bg-white border-2 border-black p-8 shadow-[6px_6px_0_rgba(0,0,0,0.1)]">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-6 border-b-2 border-black/10">
                      <span className="text-sm text-black/50">{`// span_captured`}</span>
                      <span className="text-lg bg-black text-[#FFD600] px-3 py-1">
                        2.3s
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-6 border-b-2 border-black/10">
                      <span className="text-sm text-black/50">{`// cost_calculated`}</span>
                      <span className="text-lg bg-black text-[#FFD600] px-3 py-1">
                        $0.004
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-black/50">{`// trace_sent`}</span>
                      <span className="text-lg bg-black text-[#5B5FFF] px-3 py-1">
                        async
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>

            <TabPanel>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                  <h3 className="text-3xl tracking-tight mb-4">
                    <span className="text-black/40">$ </span>View traces
                  </h3>
                  <p className="text-lg text-black/60 leading-relaxed">
                    {`// Full execution DAG in dashboard. See what happened,`}
                    <br />
                    {`// what it cost, and where time was spent.`}
                  </p>
                </div>
                <div className="bg-white border-2 border-black p-8 shadow-[6px_6px_0_rgba(0,0,0,0.1)]">
                  <div className="mb-6">
                    <span className="text-sm text-black/50">{`// latest_execution`}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="text-sm text-black/50 mb-2">status:</div>
                      <div className="text-lg bg-[#f5f5f5] text-[#4CAF50] px-3 py-1 inline-block">
                        SUCCESS
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-black/50 mb-2">
                        duration:
                      </div>
                      <div className="text-lg">3.2s</div>
                    </div>
                    <div>
                      <div className="text-sm text-black/50 mb-2">cost:</div>
                      <div className="text-lg">$0.012</div>
                    </div>
                    <div>
                      <div className="text-sm text-black/50 mb-2">spans:</div>
                      <div className="text-lg">7</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-16 border-y-2 border-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-xs mb-4 text-black/40 tracking-[0.15em] uppercase">{`/* Capabilities */`}</div>
            <h2 className="text-4xl lg:text-5xl tracking-tight mb-6">
              <span className="text-black/40">{`> `}</span>Built for production
            </h2>
            <p className="text-lg text-black/60 max-w-2xl mx-auto leading-relaxed">
              {`// Everything you need to build, monitor, and optimize`}
              <br />
              {`// AI agents at scale.`}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="border-2 border-black bg-[#F5F3F0] p-8 hover:shadow-[6px_6px_0_rgba(0,0,0,0.2)] transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="text-xs text-black/40 tracking-wide uppercase">{`// Core`}</div>
              </div>
              <h3 className="text-xl tracking-tight mb-3">
                DAG Visualization
                <span className="text-black/40">()</span>
              </h3>
              <p className="text-sm text-black/60 leading-relaxed">{`// See the full execution graph. Every span is a node, every relationship an edge. Navigate complex workflows visually.`}</p>
            </div>

            {/* Feature 2 */}
            <div className="border-2 border-black bg-[#F5F3F0] p-8 hover:shadow-[6px_6px_0_rgba(0,0,0,0.2)] transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="text-xs text-black/40 tracking-wide uppercase">{`// Core`}</div>
              </div>
              <h3 className="text-xl tracking-tight mb-3">
                Cost Tracking
                <span className="text-black/40">()</span>
              </h3>
              <p className="text-sm text-black/60 leading-relaxed">{`// Token-level cost calculation. See which models and prompts drive your spend. Optimize for efficiency.`}</p>
            </div>

            {/* Feature 3 */}
            <div className="border-2 border-black bg-[#F5F3F0] p-8 hover:shadow-[6px_6px_0_rgba(0,0,0,0.2)] transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="text-xs text-black/40 tracking-wide uppercase">{`// Advanced`}</div>
                <div className="w-8 h-8 border-2 border-black bg-[#5B5FFF] text-white flex items-center justify-center text-sm shadow-[2px_2px_0_rgba(0,0,0,0.3)]">
                  v2
                </div>
              </div>
              <h3 className="text-xl tracking-tight mb-3">
                Prompt Versioning
                <span className="text-black/40">()</span>
              </h3>
              <p className="text-sm text-black/60 leading-relaxed">{`// Git for prompts. Auto-increment versions, compare diffs, rollback instantly. Full audit trail.`}</p>
            </div>

            {/* Feature 4 */}
            <div className="border-2 border-black bg-[#F5F3F0] p-8 hover:shadow-[6px_6px_0_rgba(0,0,0,0.2)] transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="text-xs text-black/40 tracking-wide uppercase">{`// Quality`}</div>
                <div className="w-8 h-8 border-2 border-black bg-[#5B5FFF] text-white flex items-center justify-center text-sm shadow-[2px_2px_0_rgba(0,0,0,0.3)]">
                  v3
                </div>
              </div>
              <h3 className="text-xl tracking-tight mb-3">
                Quality Evaluation
                <span className="text-black/40">()</span>
              </h3>
              <p className="text-sm text-black/60 leading-relaxed">{`// LLM-as-judge grades every trace. Monitor relevance, accuracy, safety. Catch regressions early.`}</p>
            </div>

            {/* Feature 5 */}
            <div className="border-2 border-black bg-[#F5F3F0] p-8 hover:shadow-[6px_6px_0_rgba(0,0,0,0.2)] transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="text-xs text-black/40 tracking-wide uppercase">{`// Analytics`}</div>
                <div className="w-8 h-8 border-2 border-black bg-[#5B5FFF] text-white flex items-center justify-center text-sm shadow-[2px_2px_0_rgba(0,0,0,0.3)]">
                  v4
                </div>
              </div>
              <h3 className="text-xl tracking-tight mb-3">
                Workflow Analysis
                <span className="text-black/40">()</span>
              </h3>
              <p className="text-sm text-black/60 leading-relaxed">{`// Understand patterns across thousands of traces. Find bottlenecks and errors. Optimize systematically.`}</p>
            </div>

            {/* Feature 6 */}
            <div className="border-2 border-black bg-[#F5F3F0] p-8 hover:shadow-[6px_6px_0_rgba(0,0,0,0.2)] transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="text-xs text-black/40 tracking-wide uppercase">{`// Soon`}</div>
                <div className="w-8 h-8 border-2 border-black bg-[#5B5FFF] text-white flex items-center justify-center text-sm shadow-[2px_2px_0_rgba(0,0,0,0.3)]">
                  v5
                </div>
              </div>
              <h3 className="text-xl tracking-tight mb-3">
                Prompt Playground
                <span className="text-black/40">()</span>
              </h3>
              <p className="text-sm text-black/60 leading-relaxed">{`// Test prompts directly in the dashboard. Compare outputs across models and versions. Iterate faster.`}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="text-xs mb-4 text-black/40 tracking-[0.15em] uppercase">{`/* Technical */`}</div>
          <h2 className="text-4xl lg:text-5xl tracking-tight mb-6">
            <span className="text-black/40">{`> `}</span>Enterprise
            infrastructure
          </h2>
          <p className="text-lg text-black/60 max-w-2xl mx-auto leading-relaxed">
            {`// Production-grade architecture designed to scale`}
            <br />
            {`// with your team and workload.`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FFD600] border-2 border-black mb-6 shadow-[4px_4px_0_rgba(0,0,0,0.2)]">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div className="text-xs text-black/40 mb-3 tracking-wide uppercase">{`// Performance`}</div>
            <h3 className="text-xl tracking-tight mb-3">
              Async processing
              <span className="text-black/40">()</span>
            </h3>
            <p className="text-sm text-black/60 leading-relaxed">{`// Background workers send data without blocking your agent. Zero performance impact on production.`}</p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#5B5FFF] border-2 border-black mb-6 shadow-[4px_4px_0_rgba(0,0,0,0.2)]">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="text-xs text-black/40 mb-3 tracking-wide uppercase">{`// Security`}</div>
            <h3 className="text-xl tracking-tight mb-3">
              Secure by design
              <span className="text-black/40">()</span>
            </h3>
            <p className="text-sm text-black/60 leading-relaxed">{`// End-to-end encryption for all data. Granular access controls. SOC 2 Type II compliant.`}</p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#4CAF50] border-2 border-black mb-6 shadow-[4px_4px_0_rgba(0,0,0,0.2)]">
              <Database className="w-7 h-7 text-white" />
            </div>
            <div className="text-xs text-black/40 mb-3 tracking-wide uppercase">{`// Storage`}</div>
            <h3 className="text-xl tracking-tight mb-3">
              Smart storage
              <span className="text-black/40">()</span>
            </h3>
            <p className="text-sm text-black/60 leading-relaxed">{`// Large prompts in S3, structured data in Postgres, time-series in TimescaleDB. Optimized for every use case.`}</p>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="bg-white py-16 border-y-2 border-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-xs mb-4 text-black/40 tracking-[0.15em] uppercase">
              {`/* Quick Start */`}
            </div>
            <h2 className="text-4xl lg:text-5xl tracking-tight mb-6">
              <span className="text-black/40">{`> `}</span>
              Start tracing in 30 seconds
            </h2>
            <p className="text-lg text-black/60 max-w-2xl mx-auto leading-relaxed">
              {`// Install the SDK and instrument your first agent.`}
              <br />
              {`// No configuration required.`}
            </p>
          </div>

          <div className="max-w-3xl mx-auto mb-12">
            <div className="bg-black border-2 border-black overflow-hidden shadow-[8px_8px_0_rgba(0,0,0,0.2)]">
              <div className="border-b-2 border-white/20 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 border border-white/30"></div>
                  <div className="w-3 h-3 bg-yellow-500 border border-white/30"></div>
                  <div className="w-3 h-3 bg-green-500 border border-white/30"></div>
                  <span className="text-xs text-[#FFD600] ml-4">
                    {`> setup.py`}
                  </span>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(`pip install orbis-sdk

from orbis import observe

@observe()
def my_agent(query: str):
    # Automatically traced with full context
    return process(query)`)
                  }
                  className="text-white/40 hover:text-[#5B5FFF] transition-colors"
                >
                  {copied ? (
                    <span className="text-[#FFD600]">✓</span>
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <pre className="p-6 overflow-x-auto">
                <code className="text-sm text-white/90">
                  {`$ pip install orbis-sdk

from orbis import observe

@observe()
def my_agent(query: str):
    # Automatically traced with full context
    return process(query)`}
                </code>
              </pre>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="bg-black hover:bg-black/90 text-[#FFD600] px-6 py-2.5 border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.2)] inline-flex items-center gap-2"
            >
              view_dashboard()
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <button className="border-2 border-black hover:bg-black/5 px-6 py-2.5 shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
              read_docs()
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-black bg-[#F5F3F0]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Logo className="w-10 h-10" />
                <span className="tracking-tight">$ orbis.ai</span>
              </div>
              <p className="text-sm text-black/60 leading-relaxed">
                {`// Observability for AI agents.`}
                <br />
                {`// Every call traced, every dollar tracked.`}
              </p>
            </div>

            <div>
              <div className="text-xs mb-4 text-black/40 tracking-wide uppercase">{`/* Product */`}</div>
              <div className="space-y-3">
                <a
                  href="#features"
                  className="block text-sm hover:text-[#5B5FFF] transition-colors"
                >
                  /features
                </a>
                <a
                  href="#"
                  className="block text-sm hover:text-[#5B5FFF] transition-colors"
                >
                  /dashboard
                </a>
                <a
                  href="#"
                  className="block text-sm hover:text-[#5B5FFF] transition-colors"
                >
                  /docs
                </a>
                <a
                  href="#"
                  className="block text-sm hover:text-[#5B5FFF] transition-colors"
                >
                  /pricing
                </a>
              </div>
            </div>

            <div>
              <div className="text-xs mb-4 text-black/40 tracking-wide uppercase">{`/* Resources */`}</div>
              <div className="space-y-3">
                <a
                  href="#"
                  className="block text-sm hover:text-[#5B5FFF] transition-colors"
                >
                  github.com/orbis
                </a>
                <a
                  href="#"
                  className="block text-sm hover:text-[#5B5FFF] transition-colors"
                >
                  /examples
                </a>
                <a
                  href="#"
                  className="block text-sm hover:text-[#5B5FFF] transition-colors"
                >
                  /api-reference
                </a>
                <a
                  href="#"
                  className="block text-sm hover:text-[#5B5FFF] transition-colors"
                >
                  /support
                </a>
              </div>
            </div>

            <div>
              <div className="text-xs mb-4 text-black/40 tracking-wide uppercase">{`/* Company */`}</div>
              <div className="space-y-3">
                <a
                  href="#"
                  className="block text-sm hover:text-[#5B5FFF] transition-colors"
                >
                  /about
                </a>
                <a
                  href="#"
                  className="block text-sm hover:text-[#5B5FFF] transition-colors"
                >
                  /blog
                </a>
                <a
                  href="#"
                  className="block text-sm hover:text-[#5B5FFF] transition-colors"
                >
                  /privacy
                </a>
                <a
                  href="#"
                  className="block text-sm hover:text-[#5B5FFF] transition-colors"
                >
                  /terms
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t-2 border-black/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-black/50">
              {`// © 2025 Orbis. Built for developers who ship AI agents.`}
            </p>
            <div className="flex items-center gap-6">
              <a
                href="#"
                className="text-sm text-black/50 hover:text-[#5B5FFF] transition-colors"
              >
                twitter.com
              </a>
              <a
                href="#"
                className="text-sm text-black/50 hover:text-[#5B5FFF] transition-colors"
              >
                github.com
              </a>
              <a
                href="#"
                className="text-sm text-black/50 hover:text-[#5B5FFF] transition-colors"
              >
                discord.gg
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
