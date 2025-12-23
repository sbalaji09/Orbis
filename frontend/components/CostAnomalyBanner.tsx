"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CostAnomaly } from "@/lib/cost-api-client";

interface CostAnomalyBannerProps {
  anomalies: CostAnomaly[];
  onAcknowledge: (anomalyId: string) => void;
  onAcknowledgeAll: () => void;
}

const ANOMALY_TYPE_LABELS: Record<string, string> = {
  daily_spike: "Daily Spike",
  trace_spike: "High-Cost Trace",
  runaway_loop: "Runaway Loop",
  high_token_response: "High Token Usage",
};

const SEVERITY_STYLES = {
  critical: {
    bg: "bg-error/10",
    border: "border-error",
    icon: "text-error",
    badge: "bg-error text-white",
  },
  warning: {
    bg: "bg-mustard/10",
    border: "border-mustard",
    icon: "text-mustard",
    badge: "bg-mustard text-black",
  },
  info: {
    bg: "bg-babyblue/10",
    border: "border-babyblue",
    icon: "text-babyblue",
    badge: "bg-babyblue text-black",
  },
};

function AlertIcon({ severity }: { severity: string }) {
  const styles = SEVERITY_STYLES[severity as keyof typeof SEVERITY_STYLES] || SEVERITY_STYLES.info;

  if (severity === "critical") {
    return (
      <svg className={`w-5 h-5 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }

  return (
    <svg className={`w-5 h-5 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AnomalyCard({
  anomaly,
  onAcknowledge,
  onViewTrace
}: {
  anomaly: CostAnomaly;
  onAcknowledge: () => void;
  onViewTrace: () => void;
}) {
  const styles = SEVERITY_STYLES[anomaly.severity] || SEVERITY_STYLES.info;
  const typeLabel = ANOMALY_TYPE_LABELS[anomaly.anomaly_type] || anomaly.anomaly_type;

  return (
    <div className={`${styles.bg} border-2 ${styles.border} p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <AlertIcon severity={anomaly.severity} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 ${styles.badge}`}>
                {anomaly.severity}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted px-2 py-0.5 bg-black/5 border border-black/10">
                {typeLabel}
              </span>
              {anomaly.model && (
                <span className="text-[10px] font-mono text-muted">
                  {anomaly.model}
                </span>
              )}
            </div>
            <h4 className="font-semibold text-sm text-foreground mb-1 truncate">
              {anomaly.title}
            </h4>
            <p className="text-xs text-muted line-clamp-2">
              {anomaly.description}
            </p>
            {anomaly.agent_name && (
              <p className="text-[10px] text-muted mt-1">
                Agent: <span className="font-medium">{anomaly.agent_name}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {anomaly.trace_id && (
            <button
              onClick={onViewTrace}
              className="px-3 py-1.5 text-xs font-semibold bg-black text-white border-2 border-black hover:bg-babyblue hover:text-black transition-colors"
            >
              View Trace
            </button>
          )}
          <button
            onClick={onAcknowledge}
            className="px-3 py-1.5 text-xs font-semibold bg-white text-black border-2 border-black hover:bg-black/5 transition-colors"
            title="Dismiss this alert"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export function CostAnomalyBanner({
  anomalies,
  onAcknowledge,
  onAcknowledgeAll
}: CostAnomalyBannerProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filter out dismissed anomalies (optimistic UI)
  const visibleAnomalies = anomalies.filter(a => !dismissedIds.has(a.trace_id || a.title));

  if (visibleAnomalies.length === 0) {
    return null;
  }

  const criticalCount = visibleAnomalies.filter(a => a.severity === "critical").length;
  const warningCount = visibleAnomalies.filter(a => a.severity === "warning").length;
  const mostSevere = visibleAnomalies[0]; // Already sorted by severity from backend

  const handleAcknowledge = (anomaly: CostAnomaly) => {
    const id = anomaly.trace_id || anomaly.title;
    setDismissedIds(prev => new Set([...prev, id]));
    if (anomaly.trace_id) {
      onAcknowledge(anomaly.trace_id);
    }
  };

  const handleAcknowledgeAll = () => {
    const allIds = visibleAnomalies.map(a => a.trace_id || a.title);
    setDismissedIds(new Set(allIds));
    onAcknowledgeAll();
  };

  const handleViewTrace = (traceId: string) => {
    router.push(`/dashboard/trace/${traceId}`);
  };

  // Collapsed view - show summary banner
  if (!isExpanded) {
    const summaryStyle = criticalCount > 0 ? SEVERITY_STYLES.critical : SEVERITY_STYLES.warning;

    return (
      <div className={`${summaryStyle.bg} border-2 ${summaryStyle.border} p-4 mb-6`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertIcon severity={criticalCount > 0 ? "critical" : "warning"} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  {visibleAnomalies.length} Cost {visibleAnomalies.length === 1 ? "Alert" : "Alerts"}
                </span>
                {criticalCount > 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 bg-error text-white">
                    {criticalCount} Critical
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 bg-mustard text-black">
                    {warningCount} Warning
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {mostSevere.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-black text-white border-2 border-black hover:bg-babyblue hover:text-black transition-colors"
            >
              View All
            </button>
            <button
              onClick={handleAcknowledgeAll}
              className="px-3 py-1.5 text-xs font-semibold bg-white text-black border-2 border-black hover:bg-black/5 transition-colors"
            >
              Dismiss All
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Expanded view - show all anomalies
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">
            Cost Alerts ({visibleAnomalies.length})
          </h3>
          {criticalCount > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 bg-error text-white">
              {criticalCount} Critical
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAcknowledgeAll}
            className="px-3 py-1.5 text-xs font-semibold bg-white text-black border-2 border-black hover:bg-black/5 transition-colors"
          >
            Dismiss All
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="px-3 py-1.5 text-xs font-semibold bg-black/5 text-black border-2 border-black hover:bg-black/10 transition-colors"
          >
            Collapse
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {visibleAnomalies.map((anomaly, index) => (
          <AnomalyCard
            key={anomaly.trace_id || `${anomaly.anomaly_type}-${index}`}
            anomaly={anomaly}
            onAcknowledge={() => handleAcknowledge(anomaly)}
            onViewTrace={() => anomaly.trace_id && handleViewTrace(anomaly.trace_id)}
          />
        ))}
      </div>
    </div>
  );
}

export default CostAnomalyBanner;
