"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { fetchCostAnomalies, acknowledgeAnomaly, acknowledgeAllAnomalies, CostAnomaly } from "@/lib/cost-api-client";
import { Bell, Check, AlertTriangle, Info, X } from "lucide-react";
import { useWebSocket } from "@/lib/useWebSocket";

const ANOMALY_TYPE_LABELS: Record<string, string> = {
    daily_spike: "Daily Spike",
    trace_spike: "High-Cost Trace",
    runaway_loop: "Runaway Loop",
    high_token_response: "High Token Usage",
    budget: "Budget",
    error_rate: "Error Rate",
    latency: "Latency",
    prompt_regression: "Prompt Regression",
};

const SEVERITY_STYLES = {
    critical: {
        border: "border-l-4 border-l-error",
        bg: "bg-error/5",
        icon: "text-error",
        dot: "bg-error",
    },
    warning: {
        border: "border-l-4 border-l-mustard",
        bg: "bg-mustard/5",
        icon: "text-mustard",
        dot: "bg-mustard",
    },
    info: {
        border: "border-l-4 border-l-babyblue",
        bg: "bg-babyblue/5",
        icon: "text-babyblue",
        dot: "bg-babyblue",
    },
};

function SeverityIcon({ severity }: { severity: string }) {
    const styles = SEVERITY_STYLES[severity as keyof typeof SEVERITY_STYLES] || SEVERITY_STYLES.info;

    if (severity === "critical") {
        return <AlertTriangle className={`w-4 h-4 ${styles.icon}`} />;
    }

    return <Info className={`w-4 h-4 ${styles.icon}`} />;
}

export default function NotificationBell() {
    const { session } = useAuth();
    const router = useRouter();
    const apiKey = session?.access_token ?? "";

    const [anomalies, setAnomalies] = useState<CostAnomaly[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const unreadCount = anomalies.length;
    const hasCritical = anomalies.some(a => a.severity === "critical");

    const { subscribe } = useWebSocket({
        type: "dashboard",
        apiKey: session?.access_token ?? "",
        disabled: !session?.access_token
    });

    // ref to track if component is mounted
    const isMountedRef = useRef(true);

    // function to load anomalies
    const loadAnomalies = async (showLoading = true) => {
        if (!apiKey) return;

        try {
            if (showLoading) setIsLoading(true);
            const response = await fetchCostAnomalies(24, apiKey);

            if (!isMountedRef.current) return;

            if (response && response.anomalies) {
                setAnomalies(response.anomalies);
            } else {
                setAnomalies([]);
            }
        } catch (error) {
            console.error("Failed to load anomalies:", error);
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    // load anomalies on mount and periodically
    useEffect(() => {
        if (!apiKey) {
            return;
        }

        isMountedRef.current = true;
        loadAnomalies();

        // refresh every 60 seconds
        const intervalId = setInterval(() => loadAnomalies(false), 60000);

        return () => {
            isMountedRef.current = false;
            clearInterval(intervalId);
        };
    }, [apiKey]);

    // subscribe to WebSocket for real-time updates
    useEffect(() => {
        const unsubTraceCompleted = subscribe("trace_completed", () => {
            setTimeout(() => {
                if (isMountedRef.current) {
                    loadAnomalies(false);
                }
            }, 1000);
        });

        return () => {
            unsubTraceCompleted();
        };
    }, [subscribe, apiKey]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                buttonRef.current &&
                !buttonRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Handle dismiss single anomaly
    const handleDismiss = async (anomaly: CostAnomaly) => {
        if (!apiKey || !anomaly.trace_id) return;

        try {
            await acknowledgeAnomaly(anomaly.trace_id, apiKey);
            setAnomalies(prev => prev.filter(a => a.trace_id !== anomaly.trace_id));
        } catch (error) {
            console.error("Failed to dismiss anomaly:", error);
        }
    };

    // Handle dismiss all anomalies
    const handleDismissAll = async () => {
        if (!apiKey) return;

        try {
            setIsDismissing(true);
            await acknowledgeAllAnomalies(apiKey);
            setAnomalies([]);
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to dismiss all anomalies:", error);
        } finally {
            setIsDismissing(false);
        }
    };

    // Handle view trace
    const handleViewTrace = (traceId: string) => {
        router.push(`/dashboard/trace/${traceId}`);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded transition-colors ${
                    hasCritical
                        ? "text-error hover:bg-error/10"
                        : "text-black/60 hover:text-foreground hover:bg-black/5"
                }`}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            >
                <Bell className="w-5 h-5" />

                {/* Notification Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-error text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute right-0 top-full mt-2 z-50 w-80 bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
                >
                    {/* Dropdown Header */}
                    <div className="px-4 py-3 border-b-2 border-black flex items-center justify-between bg-[#f5f3f0]">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">Alerts</span>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-bold bg-black text-white px-1.5 py-0.5">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        {anomalies.length > 0 && (
                            <button
                                onClick={handleDismissAll}
                                disabled={isDismissing}
                                className="text-xs font-medium text-black/60 hover:text-black transition-colors disabled:opacity-50"
                            >
                                {isDismissing ? "Dismissing..." : "Dismiss All"}
                            </button>
                        )}
                    </div>

                    {/* Anomaly List */}
                    <div className="max-h-80 overflow-y-auto">
                        {isLoading && anomalies.length === 0 ? (
                            <div className="py-8 flex items-center justify-center">
                                <div className="animate-spin w-5 h-5 border-2 border-black/20 border-t-black rounded-full" />
                            </div>
                        ) : anomalies.length === 0 ? (
                            /* Empty State */
                            <div className="py-8 flex flex-col items-center justify-center text-black/40">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                                    <Check className="w-5 h-5 text-emerald-600" />
                                </div>
                                <span className="text-sm font-medium">No alerts</span>
                                <span className="text-xs mt-0.5">All systems normal</span>
                            </div>
                        ) : (
                            /* Anomaly Items */
                            <div>
                                {anomalies.map((anomaly, index) => {
                                    const styles = SEVERITY_STYLES[anomaly.severity as keyof typeof SEVERITY_STYLES] || SEVERITY_STYLES.info;
                                    const typeLabel = ANOMALY_TYPE_LABELS[anomaly.anomaly_type] || anomaly.anomaly_type;

                                    return (
                                        <div
                                            key={anomaly.trace_id || `${anomaly.anomaly_type}-${index}`}
                                            className={`${styles.border} ${styles.bg} px-4 py-3 border-b border-black/10 last:border-b-0 hover:bg-black/5 transition-colors`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Severity Icon */}
                                                <div className="mt-0.5">
                                                    <SeverityIcon severity={anomaly.severity} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-wide text-black/50">
                                                            {typeLabel}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-medium text-sm text-foreground truncate">
                                                        {anomaly.title}
                                                    </h4>
                                                    <p className="text-xs text-black/60 line-clamp-2 mt-0.5">
                                                        {anomaly.description}
                                                    </p>

                                                    {/* Action Buttons */}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        {anomaly.trace_id && (
                                                            <button
                                                                onClick={() => handleViewTrace(anomaly.trace_id!)}
                                                                className="text-xs font-medium text-babyblue hover:underline"
                                                            >
                                                                View Trace
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDismiss(anomaly)}
                                                            className="text-xs font-medium text-black/40 hover:text-black/60"
                                                        >
                                                            Dismiss
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Close Button */}
                                                <button
                                                    onClick={() => handleDismiss(anomaly)}
                                                    className="text-black/30 hover:text-black/60 transition-colors p-0.5"
                                                    aria-label="Dismiss"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer - Link to full alerts page */}
                    {anomalies.length > 0 && (
                        <div className="px-4 py-3 border-t-2 border-black bg-[#f5f3f0]">
                            <button
                                onClick={() => {
                                    router.push("/dashboard/costs");
                                    setIsOpen(false);
                                }}
                                className="text-sm text-babyblue hover:underline transition-colors w-full text-center"
                            >
                                View all in Cost Dashboard
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}