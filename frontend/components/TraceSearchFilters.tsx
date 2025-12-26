"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { Search, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight, AlertCircle, DollarSign, Calendar, Clock } from "lucide-react";
import { Agent } from "@/lib/types";
import { TraceSearchFilters as Filters } from "@/lib/api-server";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Helper to get date strings
function getDateString(daysAgo: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

interface TraceSearchFiltersProps {
  agents: Agent[];
  onFiltersChange: (filters: Filters) => void;
  onSearch: (filters: Filters) => void;
  isLoading?: boolean;
  // Pagination props
  total?: number;
  limit?: number;
  offset?: number;
  onPageChange?: (newOffset: number) => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "running", label: "Running" },
];

const SPAN_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "llm", label: "LLM" },
  { value: "tool", label: "Tool" },
  { value: "http", label: "HTTP" },
  { value: "cli", label: "CLI" },
  { value: "function", label: "Function" },
  { value: "agent", label: "Agent" },
];

const MODEL_OPTIONS = [
  { value: "", label: "All Models" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "claude-3-opus", label: "Claude 3 Opus" },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku" },
  { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
];

const SORT_OPTIONS = [
  { value: "start_time", label: "Date" },
  { value: "duration", label: "Duration" },
  { value: "total_cost", label: "Cost" },
];

export function TraceSearchFilters({
  agents,
  onFiltersChange,
  onSearch,
  isLoading = false,
  total,
  limit = 50,
  offset = 0,
  onPageChange,
}: TraceSearchFiltersProps) {
  // Search input state
  const [traceIdSearch, setTraceIdSearch] = useState("");
  const debouncedTraceId = useDebounce(traceIdSearch, 300);

  // Filter states
  const [status, setStatus] = useState("");
  const [agentId, setAgentId] = useState("");
  const [spanType, setSpanType] = useState("");
  const [model, setModel] = useState("");

  // Track active preset
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Range filter states
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [minDuration, setMinDuration] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sort states
  const [sortBy, setSortBy] = useState("start_time");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Build filters object
  const buildFilters = useCallback((): Filters => {
    const filters: Filters = {};

    if (debouncedTraceId) filters.traceId = debouncedTraceId;
    if (status) filters.status = status;
    if (agentId) filters.agentId = agentId;
    if (spanType) filters.spanType = spanType;
    if (model) filters.model = model;
    if (minCost) filters.minCost = parseFloat(minCost);
    if (maxCost) filters.maxCost = parseFloat(maxCost);
    if (minDuration) filters.minDuration = parseFloat(minDuration);
    if (maxDuration) filters.maxDuration = parseFloat(maxDuration);
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    filters.sortBy = sortBy;
    filters.sortOrder = sortOrder;

    return filters;
  }, [
    debouncedTraceId,
    status,
    agentId,
    spanType,
    model,
    minCost,
    maxCost,
    minDuration,
    maxDuration,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  ]);

  // Trigger search when debounced trace ID changes
  useEffect(() => {
    const filters = buildFilters();
    onFiltersChange(filters);
  }, [debouncedTraceId, buildFilters, onFiltersChange]);

  // Handle search button click
  const handleSearch = () => {
    const filters = buildFilters();
    onSearch(filters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setTraceIdSearch("");
    setStatus("");
    setAgentId("");
    setSpanType("");
    setModel("");
    setMinCost("");
    setMaxCost("");
    setMinDuration("");
    setMaxDuration("");
    setStartDate("");
    setEndDate("");
    setSortBy("start_time");
    setSortOrder("desc");
    setActivePreset(null);
  };

  // Filter presets
  const applyPreset = (preset: string) => {
    // Clear existing filters first
    handleClearFilters();
    setActivePreset(preset);

    switch (preset) {
      case "failed":
        setStatus("failed");
        break;
      case "high-cost":
        setMinCost("1.00");
        break;
      case "today":
        setStartDate(getDateString(0));
        setEndDate(getDateString(0));
        break;
      case "last-7-days":
        setStartDate(getDateString(7));
        setEndDate(getDateString(0));
        break;
    }
  };

  // Pagination calculations
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = total ? Math.ceil(total / limit) : 0;
  const hasPreviousPage = offset > 0;
  const hasNextPage = total ? offset + limit < total : false;

  // Check if any filters are active
  const hasActiveFilters =
    traceIdSearch ||
    status ||
    agentId ||
    spanType ||
    model ||
    minCost ||
    maxCost ||
    minDuration ||
    maxDuration ||
    startDate ||
    endDate;

  // Agent options for dropdown
  const agentOptions = [
    { value: "", label: "All Agents" },
    ...agents.map((agent) => ({
      value: agent.agent_id,
      label: agent.agent_name,
    })),
  ];

  return (
    <div className="bg-[#f5f3f0] border-2 border-black shadow-[2px_2px_0_#000] font-mono">
      {/* Search Bar - Always Visible */}
      <div className="p-4 border-b-2 border-black">
        <div className="flex gap-3">
          {/* Trace ID Search */}
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={traceIdSearch}
              onChange={(e) => setTraceIdSearch(e.target.value)}
              placeholder="Search by trace ID..."
              className="w-full pl-10 pr-4 py-2 bg-white border-2 border-black text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#5B5FFF]/50 placeholder:text-black/40"
            />
            {traceIdSearch && (
              <button
                onClick={() => setTraceIdSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-4 py-2 bg-black text-[#F5D547] border-2 border-black text-sm font-medium hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Quick Filters Row */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {/* Status Dropdown */}
          <Listbox value={status} onChange={setStatus}>
            <div className="relative">
              <ListboxButton className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black text-xs font-mono hover:bg-black/5 transition-colors min-w-[120px] justify-between">
                <span>
                  {STATUS_OPTIONS.find((o) => o.value === status)?.label ||
                    "Status"}
                </span>
                <ChevronDown className="w-3 h-3" />
              </ListboxButton>
              <ListboxOptions className="absolute z-20 mt-1 w-full bg-white border-2 border-black shadow-[2px_2px_0_#000] max-h-60 overflow-auto">
                {STATUS_OPTIONS.map((option) => (
                  <ListboxOption
                    key={option.value}
                    value={option.value}
                    className={({ active, selected }) =>
                      `px-3 py-2 text-xs font-mono cursor-pointer ${
                        active ? "bg-[#5B5FFF]/10" : ""
                      } ${selected ? "bg-[#5B5FFF] text-white" : ""}`
                    }
                  >
                    {option.label}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </div>
          </Listbox>

          {/* Agent Dropdown */}
          <Listbox value={agentId} onChange={setAgentId}>
            <div className="relative">
              <ListboxButton className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black text-xs font-mono hover:bg-black/5 transition-colors min-w-[140px] justify-between">
                <span className="truncate max-w-[100px]">
                  {agentOptions.find((o) => o.value === agentId)?.label ||
                    "Agent"}
                </span>
                <ChevronDown className="w-3 h-3" />
              </ListboxButton>
              <ListboxOptions className="absolute z-20 mt-1 w-48 bg-white border-2 border-black shadow-[2px_2px_0_#000] max-h-60 overflow-auto">
                {agentOptions.map((option) => (
                  <ListboxOption
                    key={option.value}
                    value={option.value}
                    className={({ active, selected }) =>
                      `px-3 py-2 text-xs font-mono cursor-pointer truncate ${
                        active ? "bg-[#5B5FFF]/10" : ""
                      } ${selected ? "bg-[#5B5FFF] text-white" : ""}`
                    }
                  >
                    {option.label}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </div>
          </Listbox>

          {/* Span Type Dropdown */}
          <Listbox value={spanType} onChange={setSpanType}>
            <div className="relative">
              <ListboxButton className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black text-xs font-mono hover:bg-black/5 transition-colors min-w-[120px] justify-between">
                <span>
                  {SPAN_TYPE_OPTIONS.find((o) => o.value === spanType)?.label ||
                    "Span Type"}
                </span>
                <ChevronDown className="w-3 h-3" />
              </ListboxButton>
              <ListboxOptions className="absolute z-20 mt-1 w-full bg-white border-2 border-black shadow-[2px_2px_0_#000] max-h-60 overflow-auto">
                {SPAN_TYPE_OPTIONS.map((option) => (
                  <ListboxOption
                    key={option.value}
                    value={option.value}
                    className={({ active, selected }) =>
                      `px-3 py-2 text-xs font-mono cursor-pointer ${
                        active ? "bg-[#5B5FFF]/10" : ""
                      } ${selected ? "bg-[#5B5FFF] text-white" : ""}`
                    }
                  >
                    {option.label}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </div>
          </Listbox>

          {/* Sort By */}
          <div className="flex items-center gap-1 ml-auto">
            <Listbox value={sortBy} onChange={setSortBy}>
              <div className="relative">
                <ListboxButton className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black text-xs font-mono hover:bg-black/5 transition-colors min-w-[100px] justify-between">
                  <span>
                    {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ||
                      "Sort"}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </ListboxButton>
                <ListboxOptions className="absolute z-20 mt-1 right-0 w-32 bg-white border-2 border-black shadow-[2px_2px_0_#000] max-h-60 overflow-auto">
                  {SORT_OPTIONS.map((option) => (
                    <ListboxOption
                      key={option.value}
                      value={option.value}
                      className={({ active, selected }) =>
                        `px-3 py-2 text-xs font-mono cursor-pointer ${
                          active ? "bg-[#5B5FFF]/10" : ""
                        } ${selected ? "bg-[#5B5FFF] text-white" : ""}`
                      }
                    >
                      {option.label}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </div>
            </Listbox>

            {/* Sort Order Toggle */}
            <button
              onClick={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className="px-2 py-1.5 bg-white border-2 border-black text-xs font-mono hover:bg-black/5 transition-colors"
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              {sortOrder === "asc" ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Filter Presets */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className="text-xs text-black/40 self-center mr-1">Quick:</span>
          <button
            onClick={() => applyPreset("failed")}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black text-xs font-mono transition-colors ${
              activePreset === "failed"
                ? "bg-red-500 text-white"
                : "bg-white hover:bg-red-50"
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            Failed Only
          </button>
          <button
            onClick={() => applyPreset("high-cost")}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black text-xs font-mono transition-colors ${
              activePreset === "high-cost"
                ? "bg-amber-500 text-white"
                : "bg-white hover:bg-amber-50"
            }`}
          >
            <DollarSign className="w-3 h-3" />
            High Cost
          </button>
          <button
            onClick={() => applyPreset("today")}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black text-xs font-mono transition-colors ${
              activePreset === "today"
                ? "bg-[#5B5FFF] text-white"
                : "bg-white hover:bg-[#5B5FFF]/10"
            }`}
          >
            <Clock className="w-3 h-3" />
            Today
          </button>
          <button
            onClick={() => applyPreset("last-7-days")}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black text-xs font-mono transition-colors ${
              activePreset === "last-7-days"
                ? "bg-[#5B5FFF] text-white"
                : "bg-white hover:bg-[#5B5FFF]/10"
            }`}
          >
            <Calendar className="w-3 h-3" />
            Last 7 Days
          </button>
        </div>
      </div>

      {/* Advanced Filters - Collapsible */}
      <Disclosure>
        {({ open }) => (
          <>
            <DisclosureButton className="w-full px-4 py-2 flex items-center justify-between text-xs font-mono text-black/60 hover:bg-black/5 transition-colors border-b-2 border-black/20">
              <span className="flex items-center gap-2">
                <span className="text-black/40">{`//`}</span>
                Advanced Filters
                {hasActiveFilters && (
                  <span className="px-1.5 py-0.5 bg-[#5B5FFF] text-white text-[10px] font-bold">
                    ACTIVE
                  </span>
                )}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </DisclosureButton>

            <DisclosurePanel className="p-4 space-y-4">
              {/* Model Filter */}
              <div>
                <label className="block text-xs font-medium text-black/70 mb-2">
                  Model
                </label>
                <Listbox value={model} onChange={setModel}>
                  <div className="relative">
                    <ListboxButton className="w-full flex items-center gap-2 px-3 py-2 bg-white border-2 border-black text-xs font-mono hover:bg-black/5 transition-colors justify-between">
                      <span>
                        {MODEL_OPTIONS.find((o) => o.value === model)?.label ||
                          "All Models"}
                      </span>
                      <ChevronDown className="w-3 h-3" />
                    </ListboxButton>
                    <ListboxOptions className="absolute z-20 mt-1 w-full bg-white border-2 border-black shadow-[2px_2px_0_#000] max-h-60 overflow-auto">
                      {MODEL_OPTIONS.map((option) => (
                        <ListboxOption
                          key={option.value}
                          value={option.value}
                          className={({ active, selected }) =>
                            `px-3 py-2 text-xs font-mono cursor-pointer ${
                              active ? "bg-[#5B5FFF]/10" : ""
                            } ${selected ? "bg-[#5B5FFF] text-white" : ""}`
                          }
                        >
                          {option.label}
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </div>
                </Listbox>
              </div>

              {/* Cost Range */}
              <div>
                <label className="block text-xs font-medium text-black/70 mb-2">
                  Cost Range
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      value={minCost}
                      onChange={(e) => setMinCost(e.target.value)}
                      placeholder="Min"
                      step="0.0001"
                      min="0"
                      className="w-full pl-7 pr-3 py-2 bg-white border-2 border-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5B5FFF]/50 placeholder:text-black/40"
                    />
                  </div>
                  <span className="text-black/40">-</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      value={maxCost}
                      onChange={(e) => setMaxCost(e.target.value)}
                      placeholder="Max"
                      step="0.0001"
                      min="0"
                      className="w-full pl-7 pr-3 py-2 bg-white border-2 border-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5B5FFF]/50 placeholder:text-black/40"
                    />
                  </div>
                </div>
              </div>

              {/* Duration Range */}
              <div>
                <label className="block text-xs font-medium text-black/70 mb-2">
                  Duration Range
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={minDuration}
                      onChange={(e) => setMinDuration(e.target.value)}
                      placeholder="Min"
                      step="0.1"
                      min="0"
                      className="w-full pl-3 pr-7 py-2 bg-white border-2 border-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5B5FFF]/50 placeholder:text-black/40"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 text-xs">
                      s
                    </span>
                  </div>
                  <span className="text-black/40">-</span>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={maxDuration}
                      onChange={(e) => setMaxDuration(e.target.value)}
                      placeholder="Max"
                      step="0.1"
                      min="0"
                      className="w-full pl-3 pr-7 py-2 bg-white border-2 border-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5B5FFF]/50 placeholder:text-black/40"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 text-xs">
                      s
                    </span>
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-xs font-medium text-black/70 mb-2">
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border-2 border-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5B5FFF]/50"
                  />
                  <span className="text-black/40">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border-2 border-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5B5FFF]/50"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t-2 border-black/10">
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-white border-2 border-black text-xs font-medium hover:bg-black/5 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-[#5B5FFF] text-white border-2 border-black text-xs font-medium hover:bg-[#5B5FFF]/90 disabled:opacity-50 transition-colors shadow-[2px_2px_0_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                >
                  {isLoading ? "Searching..." : "Apply Filters"}
                </button>
              </div>
            </DisclosurePanel>
          </>
        )}
      </Disclosure>

      {/* Pagination Controls - Only show when there are results */}
      {total !== undefined && total > 0 && onPageChange && (
        <div className="px-4 py-3 border-t-2 border-black flex items-center justify-between bg-white/50">
          <div className="text-xs font-mono text-black/60">
            Showing{" "}
            <span className="font-bold text-black">
              {offset + 1}-{Math.min(offset + limit, total)}
            </span>{" "}
            of <span className="font-bold text-black">{total}</span> traces
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={!hasPreviousPage || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border-2 border-black text-xs font-mono hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
              Previous
            </button>

            <div className="px-3 py-1.5 bg-black text-white border-2 border-black text-xs font-mono font-bold">
              {currentPage} / {totalPages}
            </div>

            <button
              onClick={() => onPageChange(offset + limit)}
              disabled={!hasNextPage || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border-2 border-black text-xs font-mono hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TraceSearchFilters;
