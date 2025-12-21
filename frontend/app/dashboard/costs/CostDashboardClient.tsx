"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchCostTrends,
  fetchCostByAgent,
  fetchCostByModel,
  type CostTrend,
  type CostByAgent,
  type CostByModel,
} from "@/lib/cost-api-client";

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

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-12 text-muted">
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

const COLORS = [
  "#5b5fff",
  "#e8c302",
  "#10b981",
  "#f59e0b",
  "#dc2626",
  "#8b5cf6",
  "#06b6d4",
];

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
  const [activeTab, setActiveTab] = useState<"overview" | "tokens" | "savings">(
    "overview"
  );

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

  // Fetch data when period changes (only overview tab data)
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

        {/* Tab Content - Lazy loaded based on active tab */}
        {activeTab === "overview" && (
          <OverviewTab
            trends={trends}
            byAgent={byAgent}
            byModel={byModel}
            isLoading={isLoading}
            selectedPeriod={selectedPeriod}
            formatCost={formatCost}
            formatCostShort={formatCostShort}
            formatDate={formatDate}
            colors={COLORS}
          />
        )}

        {activeTab === "tokens" && (
          <TokensTab selectedPeriod={selectedPeriod} formatDate={formatDate} />
        )}

        {activeTab === "savings" && (
          <SavingsTab selectedPeriod={selectedPeriod} />
        )}
      </div>
    </div>
  );
}
