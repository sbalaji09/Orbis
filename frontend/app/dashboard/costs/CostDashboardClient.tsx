"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { getModelLogo } from "@/lib/model-logos";
import { CHART_PALETTE, SERIES_COLORS } from "@/lib/echarts-theme";
import {
  fetchCostTrends,
  fetchCostByAgent,
  fetchCostByModel,
  type CostTrend,
  type CostByAgent,
  type CostByModel,
  acknowledgeAllAnomalies,
} from "@/lib/cost-api-client";
import ECharts from "@/components/ECharts";
import type { EChartsOption } from "echarts";
import CostAnomalyBanner from "@/components/CostAnomalyBanner";
import { fetchCostAnomalies, acknowledgeAnomaly, type CostAnomaly } from "@/lib/cost-api-client";

// Lazy load tab components to reduce initial bundle size
const OverviewTab = dynamic(() => import("./OverviewTab"), {
  loading: () => <TabLoader />,
  ssr: false,
});

const TokensTab = dynamic(() => import("./TokensTab"), {
  loading: () => <TabLoader />,
  ssr: false,
});

const SavingsTab = dynamic(() => import("./SavingsTab"), {
  loading: () => <TabLoader />,
  ssr: false,
});

const FeaturesTab = dynamic(() => import("./FeaturesTab"), {
  loading: () => <TabLoader />,
  ssr: false,
});

const PromptsTab = dynamic(() => import("./PromptsTab"), {
  loading: () => <TabLoader />,
  ssr: false,
});

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-12 text-black/60">
      <div className="flex items-center gap-2">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Loading...</span>
      </div>
    </div>
  );
}

interface CostDashboardClientProps {
  initialTrends: CostTrend[];
  initialByAgent: CostByAgent[];
  initialByModel: CostByModel[];
}

// Reference palette (blue / orange / green / pink)
const AGENT_COLORS = SERIES_COLORS;
const MODEL_COLORS = SERIES_COLORS;

const PERIOD_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 14 days", value: 14 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 60 days", value: 60 },
  { label: "Last 90 days", value: 90 },
  { label: "Custom", value: -1 },
];

function shortModelName(modelName: string): string {
  const s = modelName.trim();
  if (s.length <= 16) return s;
  const parts = s.split(/[-_]/);
  const prefix = parts.slice(0, 3).join("-");
  return prefix.length <= 16 ? `${prefix}…` : `${s.slice(0, 15)}…`;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getAgentColor(agentName: string): string {
  const idx = hashString(agentName) % AGENT_COLORS.length;
  return AGENT_COLORS[idx] ?? CHART_PALETTE.blue;
}

function getModelColor(modelName: string, index: number): string {
  return MODEL_COLORS[index % MODEL_COLORS.length] ?? CHART_PALETTE.blue;
}

export default function CostDashboardClient({
  initialTrends,
  initialByAgent,
  initialByModel,
}: CostDashboardClientProps) {
  const { session, loading: authLoading } = useAuth();
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
  const [anomalies, setAnomalies] = useState<CostAnomaly[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "features" | "tokens" | "prompts" | "savings"
  >("overview");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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

  // Fetch data when period changes
  useEffect(() => {
    if (selectedPeriod === 30 && !hasFetchedRef.current) {
      return;
    }

    const fetchData = async () => {
      if (!token) return;

      setIsLoading(true);
      try {
        const { startDate, endDate } = getDateRange(selectedPeriod);
        
        const [trendsData, agentData, modelData] = await Promise.all([
          fetchCostTrends(selectedPeriod, token),
          fetchCostByAgent(startDate, endDate, token),
          fetchCostByModel(startDate, endDate, token),
        ]);

        setTrends(trendsData);
        setByAgent(agentData);
        setByModel(modelData);
      } catch (error) {
        console.error("Failed to fetch cost data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    hasFetchedRef.current = true;
    fetchData();
  }, [selectedPeriod, token, getDateRange, authLoading]);

  useEffect(() => {
    if (!token) return;
    
    fetchCostAnomalies(24, token).then(data => {
      if (data) setAnomalies(data.anomalies);
    });
  }, [token]);

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
    const preset = PERIOD_OPTIONS.find((p) => p.value === selectedPeriod);
    if (preset && preset.value !== -1) {
      return preset.label;
    }
    return `Last ${selectedPeriod} days`;
  };

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

  const handleAcknowledgeAnomaly = async (anomalyId: string) => {
    if (!token) return;
    await acknowledgeAnomaly(anomalyId, token);
  };

  const handleAcknowledgeAll = async () => {
    if (!token) return;
    await acknowledgeAllAnomalies(token);
  };

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const totalCost = trends.reduce((sum, d) => sum + d.total_cost, 0);
    const totalCalls = trends.reduce((sum, d) => sum + d.call_count, 0);
    const avgCostPerDay = trends.length > 0 ? totalCost / trends.length : 0;

    const midpoint = Math.floor(trends.length / 2);
    const recentDays = trends.slice(midpoint);
    const previousDays = trends.slice(0, midpoint);
    const recentTotal = recentDays.reduce((sum, d) => sum + d.total_cost, 0);
    const previousTotal = previousDays.reduce((sum, d) => sum + d.total_cost, 0);
    const trendPct =
      previousTotal > 0
        ? ((recentTotal - previousTotal) / previousTotal) * 100
        : 0;

    const comparisonDays = Math.floor(selectedPeriod / 2);

    return {
      totalCost,
      totalCalls,
      avgCostPerDay,
      trendPct,
      comparisonDays,
    };
  }, [trends, selectedPeriod]);

  const costOverTimeOption: EChartsOption = useMemo(() => {
    const x = trends.map((d) => formatDate(d.date));
    const y = trends.map((d) => d.total_cost);

    return {
      animation: false,
      grid: { left: 55, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: "category",
        data: x,
        axisLine: { lineStyle: { color: "#000" } },
        axisTick: { lineStyle: { color: "#000" } },
        axisLabel: { fontFamily: "JetBrains Mono, monospace", fontSize: 12 },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "#000" } },
        axisTick: { lineStyle: { color: "#000" } },
        splitLine: { lineStyle: { color: "rgba(0,0,0,0.1)", type: "dashed" } },
        axisLabel: {
          formatter: (v: number) => `$${Number(v).toFixed(2)}`,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 12,
        },
      },
      tooltip: {
        trigger: "axis",
        borderColor: "#000",
        borderWidth: 2,
        backgroundColor: "#fff",
        textStyle: { fontFamily: "JetBrains Mono, monospace", color: "#000" },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const label = p?.axisValueLabel ?? "";
          const raw = p?.value ?? p?.data?.value ?? p?.data;
          const value = typeof raw === "number" ? raw : Number(raw ?? 0);
          return `${label}<br/>Cost : ${formatCost(value)}`;
        },
      },
      series: [
        {
          type: "line",
          data: y,
          smooth: true,
          symbol: "circle",
          symbolSize: 8,
          showSymbol: false,
          lineStyle: { color: "#5b5fff", width: 3 },
          itemStyle: { color: "#5b5fff", borderColor: "#000", borderWidth: 2 },
          emphasis: { focus: "series" },
        },
      ],
    };
  }, [trends, formatCost, formatDate]);

  // Enhanced Cost by Agent with beautiful gradients and styling
  const costByAgentOption: EChartsOption = useMemo(() => {
    const categories = byAgent.map((d) => d.agent);
    const values = byAgent.map((d) => d.total_cost);
    
    return {
      animation: false,
      grid: { 
        left: 44,
        right: 14,
        top: 14,
        bottom: 54,
        containLabel: false
      },
      xAxis: {
        type: "category",
        data: categories,
        boundaryGap: true,
        axisLine: { 
          show: true,
          lineStyle: { color: CHART_PALETTE.grid, width: 1 } 
        },
        axisTick: { 
          show: false
        },
        axisLabel: {
          interval: 0,
          rotate: categories.length > 6 ? 25 : 15,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          color: CHART_PALETTE.text,
          margin: 16,
        },
      },
      yAxis: {
        type: "value",
        min: 0,
        splitNumber: 5,
        max: (v: any) => {
          const max = Number(v?.max ?? 0);
          return max > 0 ? max * 1.05 : 0;
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { 
          lineStyle: { 
            color: CHART_PALETTE.grid, 
            width: 1
          } 
        },
        axisLabel: {
          formatter: (v: number) => `$${Number(v).toFixed(2)}`,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 12,
          color: CHART_PALETTE.text,
          margin: 14,
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { 
          type: "shadow",
          shadowStyle: {
            color: "rgba(0, 0, 0, 0.05)"
          }
        },
        borderColor: CHART_PALETTE.tooltipBorder,
        borderWidth: 1,
        backgroundColor: "#fff",
        extraCssText: "box-shadow: 0 12px 24px rgba(0,0,0,0.12); border-radius: 10px;",
        textStyle: { fontFamily: "JetBrains Mono, monospace", color: "#111827" },
        padding: [12, 16],
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const label = p?.name ?? "";
          const value = Number(p?.value ?? 0);
          return `<div style="font-weight: 600; margin-bottom: 6px;">${label}</div><div style="font-size: 13px;">Cost: ${formatCost(value)}</div>`;
        },
      },
      series: [
        {
          type: "bar",
          data: values.map((v, i) => ({
            value: v,
            itemStyle: {
              color: getAgentColor(categories[i] ?? String(i)),
              borderRadius: 0,
            },
          })),
          barMaxWidth: 64,
          barCategoryGap: categories.length <= 4 ? "35%" : "20%",
          emphasis: { disabled: true },
        },
      ],
    };
  }, [byAgent, formatCost]);

  // Enhanced Cost by Model with beautiful gradients and styling
  const costByModelOption: EChartsOption = useMemo(() => {
    const models = byModel.map((d) => d.model);
    const costs = byModel.map((d) => d.total_cost);
    const costByModelName: Record<string, number> = Object.fromEntries(
      byModel.map((row) => [row.model, row.total_cost])
    );

    const rich: Record<string, any> = {
      text: {
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11,
        color: "#374151",
        padding: [0, 0, 0, 0],
      },
    };

    const logoForModel: Record<string, string> = {};
    for (const [i, m] of models.entries()) {
      const logo = getModelLogo(m);
      if (logo) {
        const key = `logo${i}`;
        rich[key] = {
          height: 14,
          width: 14,
          align: "center",
          backgroundColor: { image: logo.src },
        };
        logoForModel[m] = key;
      }
    }

    return {
      animation: false,
      grid: { left: 54, right: 18, top: 14, bottom: 70, containLabel: false },
      xAxis: {
        type: "category",
        data: models,
        axisLine: { 
          show: true,
          lineStyle: { color: CHART_PALETTE.grid, width: 1 } 
        },
        axisTick: { show: false },
        axisLabel: {
          interval: 0,
          rotate: 35,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          color: CHART_PALETTE.text,
          margin: 12,
          formatter: (value: string) => {
            const k = logoForModel[value];
            if (k) return `{${k}|} {text|${shortModelName(value)}}`;
            return `{text|${shortModelName(value)}}`;
          },
          rich,
        },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { 
          lineStyle: { 
            color: CHART_PALETTE.grid, 
            width: 1
          } 
        },
        axisLabel: {
          formatter: (v: number) => `$${Number(v).toFixed(2)}`,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 12,
          color: CHART_PALETTE.text,
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { 
          type: "shadow",
          shadowStyle: {
            color: "rgba(0, 0, 0, 0.05)"
          }
        },
        borderColor: CHART_PALETTE.tooltipBorder,
        borderWidth: 1,
        backgroundColor: "#fff",
        extraCssText: "box-shadow: 0 12px 24px rgba(0,0,0,0.12); border-radius: 10px;",
        textStyle: { fontFamily: "JetBrains Mono, monospace", color: "#111827" },
        padding: [12, 16],
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const label = String(p?.name ?? p?.axisValue ?? p?.axisValueLabel ?? "");
          const direct = costByModelName[label];
          const raw = p?.value ?? p?.data?.value ?? p?.data;
          const fallback =
            typeof raw === "number"
              ? raw
              : Array.isArray(raw)
                ? Number(raw[0])
                : typeof raw === "object" && raw && "value" in raw
                  ? Number((raw as any).value)
                  : Number(raw ?? 0);
          const value = Number.isFinite(direct) ? direct : fallback;
          return `<div style="font-weight: 600; margin-bottom: 6px;">${label}</div><div style="font-size: 13px;">Cost: ${formatCost(Number.isFinite(value) ? value : 0)}</div>`;
        },
      },
      series: [
        {
          type: "bar",
          data: costs.map((v, i) => ({
            value: v,
            itemStyle: {
              color: getModelColor(models[i] ?? "", i),
              borderRadius: 0,
            },
          })),
          barMaxWidth: 46,
          barCategoryGap: "22%",
          emphasis: { disabled: true },
        },
      ],
    };
  }, [byModel, formatCost]);

  // Show skeleton while auth is loading to prevent layout shift
  if (authLoading) {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="h-8 w-64 bg-gray-200 animate-pulse mb-2" />
            <div className="h-4 w-96 bg-gray-100 animate-pulse" />
          </div>

          {/* Period Selector Skeleton */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-10 w-40 bg-gray-200 animate-pulse" />
          </div>

          {/* Tab Navigation Skeleton */}
          <div className="flex gap-2 mb-6 border-b-2 border-black">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 w-32 bg-gray-200 animate-pulse -mb-[2px]"
              />
            ))}
          </div>

          {/* Overview Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5"
              >
                <div className="h-4 w-24 bg-gray-200 animate-pulse mb-3" />
                <div className="h-8 w-32 bg-gray-200 animate-pulse mb-2" />
                <div className="h-3 w-20 bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>

          {/* Chart Skeleton */}
          <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6 mb-6">
            <div className="h-6 w-48 bg-gray-200 animate-pulse mb-4" />
            <div className="h-72 bg-gray-100 animate-pulse" />
          </div>

          {/* Two Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6"
              >
                <div className="h-6 w-40 bg-gray-200 animate-pulse mb-4" />
                <div className="h-64 bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-2 border-black bg-white hover:bg-gray-50 transition-all shadow-[2px_2px_0_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0_rgba(0,0,0,0.15)] ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <span>{getPeriodLabel()}</span>
              <svg
                className={`w-4 h-4 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
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
                className="w-32 px-3 py-2 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue font-mono"
              />
              <button
                onClick={handleCustomSubmit}
                className="px-4 py-2 text-sm font-medium border-2 border-black bg-babyblue text-white hover:bg-babyblue/90 shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomDays("");
                }}
                className="px-4 py-2 text-sm font-medium border-2 border-black bg-white hover:bg-gray-50 shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
              >
                Cancel
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-black/60">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading...</span>
            </div>
          )}
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b-2 border-black">
          {[
            { id: "overview", label: "Overview" },
            { id: "features", label: "Features" },
            { id: "tokens", label: "Token Analytics" },
            { id: "prompts", label: "Prompt Analysis" },
            { id: "savings", label: "Savings Opportunities" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium -mb-[2px] border-2 border-b-0 transition-colors ${
                activeTab === tab.id
                  ? "border-black bg-white"
                  : "border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {anomalies.length > 0 && (
          <CostAnomalyBanner
            anomalies={anomalies}
            onAcknowledge={handleAcknowledgeAnomaly}
            onAcknowledgeAll={handleAcknowledgeAll}
          />
        )}
        
        {/* Tab Content - Lazy loaded based on active tab */}
        {activeTab === "overview" && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {/* Total Cost */}
              <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-4 h-4 text-black/60"
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
                  <span className="text-xs font-medium text-black/60 uppercase tracking-wide">
                    Total Cost
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono">
                  {formatCostShort(metrics.totalCost)}
                </div>
                <div className="text-xs text-black/60 mt-1">
                  Last {selectedPeriod} days
                </div>
              </div>

              {/* Total Calls */}
              <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-4 h-4 text-black/60"
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
                  <span className="text-xs font-medium text-black/60 uppercase tracking-wide">
                    LLM Calls
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono">
                  {metrics.totalCalls.toLocaleString()}
                </div>
                <div className="text-xs text-black/60 mt-1">
                  Last {selectedPeriod} days
                </div>
              </div>

              {/* Avg Cost/Day */}
              <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-4 h-4 text-black/60"
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
                  <span className="text-xs font-medium text-black/60 uppercase tracking-wide">
                    Avg/Day
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono">
                  {formatCostShort(metrics.avgCostPerDay)}
                </div>
                <div className="text-xs text-black/60 mt-1">Daily average</div>
              </div>

              {/* Trend */}
              <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-4 h-4 text-black/60"
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
                  <span className="text-xs font-medium text-black/60 uppercase tracking-wide">
                    Trend
                  </span>
                </div>
                <div
                  className={`text-2xl font-bold font-mono ${
                    metrics.trendPct >= 0 ? "text-error" : "text-success"
                  }`}
                >
                  {metrics.trendPct >= 0 ? "+" : ""}
                  {metrics.trendPct.toFixed(1)}%
                </div>
                <div className="text-xs text-black/60 mt-1">
                  vs previous {metrics.comparisonDays}D
                </div>
              </div>
            </div>

            {/* Charts Row 1: Cost Trend */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">
                <span className="text-black/40">{`// `}</span>Cost Over Time
              </h2>
              <div className="h-72">
                {trends.length > 0 ? (
                  <ECharts option={costOverTimeOption} height={288} />
                ) : (
                  <div className="h-full flex items-center justify-center text-black/60">
                    {isLoading ? "Loading..." : "No cost data available"}
                  </div>
                )}
              </div>
            </div>

            {/* Charts Row 2: By Agent and By Model */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cost by Agent */}
              <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
                <h2 className="text-lg font-semibold mb-4">
                  <span className="text-black/40">{`// `}</span>Cost by Agent
                </h2>
                <div className="h-64">
                  {byAgent.length > 0 ? (
                    <ECharts option={costByAgentOption} height={256} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-black/60">
                      {isLoading ? "Loading..." : "No agent data available"}
                    </div>
                  )}
                </div>
              </div>

              {/* Cost by Model */}
              <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
                <h2 className="text-lg font-semibold mb-4">
                  <span className="text-black/40">{`// `}</span>Cost by Model
                </h2>
                <div className="h-64">
                  {byModel.length > 0 ? (
                    <ECharts option={costByModelOption} height={256} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-black/60">
                      {isLoading ? "Loading..." : "No model data available"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cost Breakdown Table */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6 mt-6">
              <h2 className="text-lg font-semibold mb-4">
                <span className="text-black/40">{`// `}</span>Cost Breakdown by
                Model
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-3 px-4 font-semibold">
                        Model
                      </th>
                      <th className="text-right py-3 px-4 font-semibold">
                        Total Cost
                      </th>
                      <th className="text-right py-3 px-4 font-semibold">
                        Calls
                      </th>
                      <th className="text-right py-3 px-4 font-semibold">
                        Avg/Call
                      </th>
                      <th className="text-right py-3 px-4 font-semibold">
                        % of Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {byModel.length > 0 ? (
                      byModel.map((row, i) => {
                        const totalCost = byModel.reduce(
                          (sum, r) => sum + r.total_cost,
                          0
                        );
                        const pct =
                          totalCost > 0
                            ? (row.total_cost / totalCost) * 100
                            : 0;
                        const avgPerCall =
                          row.call_count > 0
                            ? row.total_cost / row.call_count
                            : 0;

                        return (
                          <tr
                            key={row.model}
                            className="border-b border-gray-200 hover:bg-gray-50"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const logo = getModelLogo(row.model);
                                  if (logo) {
                                    return (
                                      <img
                                        src={logo.src}
                                        alt={logo.alt}
                                        className="w-4 h-4"
                                      />
                                    );
                                  }
                                  return (
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{
                                        backgroundColor: getModelColor(row.model, i),
                                      }}
                                    />
                                  );
                                })()}
                                <span className="font-mono">{row.model}</span>
                              </div>
                            </td>
                            <td className="text-right py-3 px-4 font-mono">
                              {formatCost(row.total_cost)}
                            </td>
                            <td className="text-right py-3 px-4 font-mono">
                              {row.call_count.toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4 font-mono">
                              {formatCost(avgPerCall)}
                            </td>
                            <td className="text-right py-3 px-4">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: getModelColor(row.model, i),
                                    }}
                                  />
                                </div>
                                <span className="font-mono w-12 text-right">
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-black/60"
                        >
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

        {activeTab === "features" && (
          <FeaturesTab selectedPeriod={selectedPeriod} colors={MODEL_COLORS} />
        )}
        
        {activeTab === "tokens" && (
          <TokensTab selectedPeriod={selectedPeriod} formatDate={formatDate} />
        )}

        {activeTab === "prompts" && <PromptsTab selectedPeriod={selectedPeriod} />}

        {activeTab === "savings" && <SavingsTab selectedPeriod={selectedPeriod} />}
      </div>
    </div>
  );
}
