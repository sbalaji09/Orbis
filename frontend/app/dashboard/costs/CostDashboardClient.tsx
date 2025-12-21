"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchCostTrends,
  fetchCostByAgent,
  fetchCostByModel,
  fetchTokenBreakdown,
  fetchTokensPerTrace,
  fetchSavingsOpportunities,
  fetchCostByTag,
  type CostTrend,
  type CostByAgent,
  type CostByModel,
  type TokenBreakdown,
  type TokensPerTrace,
  type SavingsOpportunities,
  type CostByTag,
} from "@/lib/cost-api-client";


interface CostDashboardClientProps {
  initialTrends: CostTrend[];
  initialByAgent: CostByAgent[];
  initialByModel: CostByModel[];
}

const COLORS = ["#5b5fff", "#e8c302", "#10b981", "#f59e0b", "#dc2626", "#8b5cf6", "#06b6d4"];

const PERIOD_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 14 days", value: 14 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 60 days", value: 60 },
  { label: "Last 90 days", value: 90 },
  { label: "Custom", value: -1 },
];

export default function CostDashboardClient({
  initialTrends,
  initialByAgent,
  initialByModel,
}: CostDashboardClientProps) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;

  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [customDays, setCustomDays] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [trends, setTrends] = useState<CostTrend[]>(initialTrends);
  const [byAgent, setByAgent] = useState<CostByAgent[]>(initialByAgent);
  const [byModel, setByModel] = useState<CostByModel[]>(initialByModel);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);
  const [tokenBreakdown, setTokenBreakdown] = useState<TokenBreakdown[]>([]);
  const [tokensPerTrace, setTokensPerTrace] = useState<TokensPerTrace[]>([]);
  const [savingsData, setSavingsData] = useState<SavingsOpportunities | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "tokens" | "savings">("overview");
  const [costByTag, setCostByTag] = useState<CostByTag[]>([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper to calculate date range from days
  const getDateRange = useCallback((days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, []);

  // Fetch token/savings data on initial mount (not provided by server)
  useEffect(() => {
    if (!token) return;

    const fetchInitialTokenData = async () => {
      try {
        const { startDate, endDate } = getDateRange(30);
        const [tokenData, traceTokens, savings, tagData] = await Promise.all([
          fetchTokenBreakdown(30, token),
          fetchTokensPerTrace(30, token),
          fetchSavingsOpportunities(30, token),
          fetchCostByTag(startDate, endDate, token),
        ]);
        setTokenBreakdown(tokenData);
        setTokensPerTrace(traceTokens);
        setSavingsData(savings);
        setCostByTag(tagData);
      } catch (error) {
        console.error("Failed to fetch initial token data:", error);
      }
    };

    fetchInitialTokenData();
  }, [token, getDateRange]);

  // Fetch data when period changes
  useEffect(() => {
    // Skip if this is the initial render with 30 days (already have server data)
    if (selectedPeriod === 30 && !hasFetchedRef.current) {
      return;
    }

    const fetchData = async () => {
      if (!token) return;

      setIsLoading(true);
      try {
        const { startDate, endDate } = getDateRange(selectedPeriod);

        const [trendsData, agentData, modelData, tokenData, traceTokens, savings] = await Promise.all([
          fetchCostTrends(selectedPeriod, token),
          fetchCostByAgent(startDate, endDate, token),
          fetchCostByModel(startDate, endDate, token),
          fetchTokenBreakdown(selectedPeriod, token),
          fetchTokensPerTrace(selectedPeriod, token),
          fetchSavingsOpportunities(selectedPeriod, token),
        ]);

        setTrends(trendsData);
        setByAgent(agentData);
        setByModel(modelData);
        setTokenBreakdown(tokenData);
        setTokensPerTrace(traceTokens);
        setSavingsData(savings);
      } catch (error) {
        console.error("Failed to fetch cost data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    hasFetchedRef.current = true;
    fetchData();
  }, [selectedPeriod, token, getDateRange]);

  // Handle period selection
  const handlePeriodSelect = (value: number) => {
    if (value === -1) {
      setShowCustomInput(true);
      setIsDropdownOpen(false);
    } else {
      setShowCustomInput(false);
      setSelectedPeriod(value);
      setIsDropdownOpen(false);
    }
  };

  // Handle custom days submit
  const handleCustomSubmit = () => {
    const days = parseInt(customDays, 10);
    if (days > 0 && days <= 365) {
      setSelectedPeriod(days);
      setShowCustomInput(false);
      setCustomDays("");
    }
  };

  // Get display label for current period
  const getPeriodLabel = () => {
    const preset = PERIOD_OPTIONS.find(p => p.value === selectedPeriod);
    if (preset && preset.value !== -1) {
      return preset.label;
    }
    return `Last ${selectedPeriod} days`;
  };

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const totalCost = trends.reduce((sum, d) => sum + d.total_cost, 0);
    const totalCalls = trends.reduce((sum, d) => sum + d.call_count, 0);
    const avgCostPerDay = trends.length > 0 ? totalCost / trends.length : 0;

    // Calculate trend based on available data
    // Compare second half to first half of the period
    const midpoint = Math.floor(trends.length / 2);
    const recentDays = trends.slice(midpoint);
    const previousDays = trends.slice(0, midpoint);
    const recentTotal = recentDays.reduce((sum, d) => sum + d.total_cost, 0);
    const previousTotal = previousDays.reduce((sum, d) => sum + d.total_cost, 0);
    const trendPct = previousTotal > 0 ? ((recentTotal - previousTotal) / previousTotal) * 100 : 0;

    // Calculate the comparison period length for display
    const comparisonDays = Math.floor(selectedPeriod / 2);

    return {
      totalCost,
      totalCalls,
      avgCostPerDay,
      trendPct,
      comparisonDays,
    };
  }, [trends, selectedPeriod]);

  // Format currency
  const formatCost = (value: number) => `$${value.toFixed(4)}`;
  const formatCostShort = (value: number) => {
    if (value >= 1) return `$${value.toFixed(2)}`;
    return `$${value.toFixed(4)}`;
  };

  // Format date for chart
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            <span className="text-black/40">{`> `}</span>Cost Dashboard
          </h1>
          <p className="text-sm text-black/60">
            {`// Track LLM costs, tokens, and spending patterns`}
          </p>
        </div>

        {/* Period Selector Dropdown */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-2 border-black bg-white hover:bg-gray-50 transition-all ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <span>{getPeriodLabel()}</span>
              <svg
                className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] z-50">
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePeriodSelect(option.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                      selectedPeriod === option.value && option.value !== -1
                        ? "bg-babyblue/10 text-babyblue font-medium"
                        : ""
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Days Input */}
          {showCustomInput && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="Days (1-365)"
                className="w-32 px-3 py-2 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
              />
              <button
                onClick={handleCustomSubmit}
                className="px-4 py-2 text-sm font-medium border-2 border-black bg-babyblue text-white hover:bg-babyblue/90"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomDays("");
                }}
                className="px-4 py-2 text-sm font-medium border-2 border-black bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Loading...</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b-2 border-black">
          {[
            { id: "overview", label: "Overview" },
            { id: "tokens", label: "Token Analytics" },
            { id: "savings", label: "Savings Opportunities" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium -mb-[2px] border-2 border-b-0 transition-colors ${
                activeTab === tab.id
                  ? "border-black bg-white"
                  : "border-transparent hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {activeTab === "overview" && (
          <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Total Cost */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-muted uppercase tracking-wide">Total Cost</span>
              </div>
              <div className="text-2xl font-bold font-mono">{formatCostShort(metrics.totalCost)}</div>
              <div className="text-xs text-muted mt-1">Last {selectedPeriod} days</div>
            </div>

            {/* Total Calls */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs font-medium text-muted uppercase tracking-wide">LLM Calls</span>
              </div>
              <div className="text-2xl font-bold font-mono">{metrics.totalCalls.toLocaleString()}</div>
              <div className="text-xs text-muted mt-1">Last {selectedPeriod} days</div>
            </div>

            {/* Avg Cost/Day */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-xs font-medium text-muted uppercase tracking-wide">Avg/Day</span>
              </div>
              <div className="text-2xl font-bold font-mono">{formatCostShort(metrics.avgCostPerDay)}</div>
              <div className="text-xs text-muted mt-1">Daily average</div>
            </div>

            {/* Trend */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-xs font-medium text-muted uppercase tracking-wide">Trend</span>
              </div>
              <div className={`text-2xl font-bold font-mono ${metrics.trendPct >= 0 ? "text-error" : "text-success"}`}>
                {metrics.trendPct >= 0 ? "+" : ""}{metrics.trendPct.toFixed(1)}%
              </div>
              <div className="text-xs text-muted mt-1">vs previous {metrics.comparisonDays}D</div>
            </div>
          </div>

          {/* Charts Row 1: Cost Trend */}
          <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Cost Over Time</h2>
            <div className="h-72">
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                      stroke="#666"
                    />
                    <YAxis
                      tickFormatter={(v) => `$${v.toFixed(2)}`}
                      tick={{ fontSize: 12 }}
                      stroke="#666"
                    />
                    <Tooltip
                      formatter={(value) => [formatCost(Number(value)), "Cost"]}
                      labelFormatter={(label) => formatDate(String(label))}
                      contentStyle={{ border: "2px solid black", borderRadius: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_cost"
                      stroke="#5b5fff"
                      strokeWidth={2}
                      dot={{ fill: "#5b5fff", strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: "#5b5fff" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted">
                  {isLoading ? "Loading..." : "No cost data available"}
                </div>
              )}
            </div>
          </div>

          {/* Charts Row 2: By Agent and By Model */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost by Agent */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
              <h2 className="text-lg font-semibold mb-4">Cost by Agent</h2>
              <div className="h-64">
                {byAgent.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byAgent} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => `$${v.toFixed(2)}`}
                        tick={{ fontSize: 12 }}
                        stroke="#666"
                      />
                      <YAxis
                        type="category"
                        dataKey="agent"
                        tick={{ fontSize: 12 }}
                        stroke="#666"
                        width={70}
                      />
                      <Tooltip
                        formatter={(value) => [formatCost(Number(value)), "Cost"]}
                        contentStyle={{ border: "2px solid black", borderRadius: 0 }}
                      />
                      <Bar dataKey="total_cost" fill="#5b5fff" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted">
                    {isLoading ? "Loading..." : "No agent data available"}
                  </div>
                )}
              </div>
            </div>

            {/* Cost by Model */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
              <h2 className="text-lg font-semibold mb-4">Cost by Model</h2>
              <div className="h-64">
                {byModel.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byModel}
                        dataKey="total_cost"
                        nameKey="model"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                        labelLine={true}
                      >
                        {byModel.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [formatCost(Number(value)), "Cost"]}
                        contentStyle={{ border: "2px solid black", borderRadius: 0 }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted">
                    {isLoading ? "Loading..." : "No model data available"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cost Breakdown Table */}
          <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Cost Breakdown by Model</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-3 px-4 font-semibold">Model</th>
                    <th className="text-right py-3 px-4 font-semibold">Total Cost</th>
                    <th className="text-right py-3 px-4 font-semibold">Calls</th>
                    <th className="text-right py-3 px-4 font-semibold">Avg/Call</th>
                    <th className="text-right py-3 px-4 font-semibold">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {byModel.length > 0 ? (
                    byModel.map((row, i) => {
                      const totalCost = byModel.reduce((sum, r) => sum + r.total_cost, 0);
                      const pct = totalCost > 0 ? (row.total_cost / totalCost) * 100 : 0;
                      const avgPerCall = row.call_count > 0 ? row.total_cost / row.call_count : 0;

                      return (
                        <tr key={row.model} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                              />
                              <span className="font-mono">{row.model}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4 font-mono">{formatCost(row.total_cost)}</td>
                          <td className="text-right py-3 px-4 font-mono">{row.call_count.toLocaleString()}</td>
                          <td className="text-right py-3 px-4 font-mono">{formatCost(avgPerCall)}</td>
                          <td className="text-right py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: COLORS[i % COLORS.length]
                                  }}
                                />
                              </div>
                              <span className="font-mono w-12 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted">
                        {isLoading ? "Loading..." : "No model data available"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>          
          </>
        )}           
        {/* Token Breakdown Over Time */}
        {activeTab === "tokens" && (
          <div className="space-y-6">
            {/* Input vs Output Tokens Chart */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
              <h2 className="text-lg font-semibold mb-4">Token Breakdown (Input vs Output)</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tokenBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [
                        `${Number(value).toLocaleString()} tokens`,
                        "",
                      ]}
                      labelFormatter={(label) => formatDate(String(label))}
                      contentStyle={{ border: "2px solid black", borderRadius: 0 }}
                    />
                    <Legend />
                    <Bar dataKey="input_tokens" name="Input" stackId="a" fill="#5b5fff" />
                    <Bar dataKey="output_tokens" name="Output" stackId="a" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tokens Per Trace Table */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
              <h2 className="text-lg font-semibold mb-4">Tokens by Trace</h2>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-3 px-4 font-semibold">Trace</th>
                      <th className="text-left py-3 px-4 font-semibold">Agent</th>
                      <th className="text-right py-3 px-4 font-semibold">LLM Calls</th>
                      <th className="text-right py-3 px-4 font-semibold">Input</th>
                      <th className="text-right py-3 px-4 font-semibold">Output</th>
                      <th className="text-right py-3 px-4 font-semibold">Total</th>
                      <th className="text-right py-3 px-4 font-semibold">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokensPerTrace.map((trace) => (
                      <tr key={trace.trace_id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-xs">{trace.trace_hash_id?.slice(0, 8) || trace.trace_id.slice(0, 8)}</td>
                        <td className="py-3 px-4">{trace.agent_name}</td>
                        <td className="text-right py-3 px-4 font-mono">{trace.llm_spans?.length || 0}</td>
                        <td className="text-right py-3 px-4 font-mono text-blue-600">{trace.input_tokens.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 font-mono text-green-600">{trace.output_tokens.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 font-mono font-semibold">{trace.total_tokens.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 font-mono">${trace.total_cost.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "savings" && savingsData && (
          <div className="space-y-6">
            {/* Potential Savings Summary Card */}
            <div className="bg-green-50 border-2 border-green-600 p-6">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h2 className="text-lg font-semibold text-green-800">Potential Savings</h2>
                  <p className="text-2xl font-bold text-green-600">${savingsData.total_potential_savings.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Model Cost Analysis */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
              <h2 className="text-lg font-semibold mb-4">Cost by Model (Consider Cheaper Alternatives)</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-3 px-4 font-semibold">Model</th>
                    <th className="text-right py-3 px-4 font-semibold">Calls</th>
                    <th className="text-right py-3 px-4 font-semibold">Total Cost</th>
                    <th className="text-right py-3 px-4 font-semibold">Avg Tokens</th>
                    <th className="text-right py-3 px-4 font-semibold">Avg Cost/Call</th>
                  </tr>
                </thead>
                <tbody>
                  {savingsData.model_analysis.map((m) => (
                    <tr key={m.model} className="border-b border-gray-200">
                      <td className="py-3 px-4 font-mono">{m.model}</td>
                      <td className="text-right py-3 px-4 font-mono">{m.call_count.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 font-mono">${m.total_cost.toFixed(4)}</td>
                      <td className="text-right py-3 px-4 font-mono">{m.avg_tokens.toFixed(0)}</td>
                      <td className="text-right py-3 px-4 font-mono">${m.avg_cost_per_call.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Verbose Traces */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
              <h2 className="text-lg font-semibold mb-2">Verbose Responses (High Output/Input Ratio)</h2>
              <p className="text-sm text-muted mb-4">Traces where output tokens significantly exceed input - consider prompting for concise responses.</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-3 px-4 font-semibold">Trace</th>
                    <th className="text-left py-3 px-4 font-semibold">Agent</th>
                    <th className="text-right py-3 px-4 font-semibold">Input</th>
                    <th className="text-right py-3 px-4 font-semibold">Output</th>
                    <th className="text-right py-3 px-4 font-semibold">Ratio</th>
                    <th className="text-right py-3 px-4 font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {savingsData.verbose_traces.slice(0, 5).map((t) => (
                    <tr key={t.trace_hash_id} className="border-b border-gray-200">
                      <td className="py-3 px-4 font-mono text-xs">{t.trace_hash_id?.slice(0, 8)}</td>
                      <td className="py-3 px-4">{t.agent_name}</td>
                      <td className="text-right py-3 px-4 font-mono">{t.input_tokens.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 font-mono">{t.output_tokens.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 font-mono text-orange-600">{t.output_input_ratio}x</td>
                      <td className="text-right py-3 px-4 font-mono">${t.total_cost.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Repeated Prompts (Caching Opportunities) */}
            {savingsData.repeated_prompts.length > 0 && (
              <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
                <h2 className="text-lg font-semibold mb-2">Repeated Prompts (Cache Opportunities)</h2>
                <p className="text-sm text-muted mb-4">Similar prompts sent multiple times - consider implementing prompt caching.</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-3 px-4 font-semibold">Model</th>
                      <th className="text-left py-3 px-4 font-semibold">Prompt Preview</th>
                      <th className="text-right py-3 px-4 font-semibold">Repetitions</th>
                      <th className="text-right py-3 px-4 font-semibold">Potential Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savingsData.repeated_prompts.slice(0, 5).map((p, i) => (
                      <tr key={i} className="border-b border-gray-200">
                        <td className="py-3 px-4 font-mono text-xs">{p.model}</td>
                        <td className="py-3 px-4 text-xs truncate max-w-xs">{p.preview}</td>
                        <td className="text-right py-3 px-4 font-mono">{p.repetition_count}x</td>
                        <td className="text-right py-3 px-4 font-mono text-green-600">${p.potential_savings.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
