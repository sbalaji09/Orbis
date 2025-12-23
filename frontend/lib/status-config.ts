/**
 * Centralized status configuration for consistent styling across the application
 */

export type SpanStatus = "pending" | "success" | "failed" | "running";

export interface StatusConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  // Tailwind classes for components
  bg: string;
  text: string;
  dot: string;
  border: string;
}

export const STATUS_CONFIGS: Record<SpanStatus, StatusConfig> = {
  pending: {
    color: "#6b7280", // gray-500
    bgColor: "#f3f4f6", // gray-100
    borderColor: "#d1d5db", // gray-300
    label: "Pending",
    bg: "bg-amber-50",
    text: "text-warning",
    dot: "bg-warning",
    border: "border-warning",
  },
  running: {
    color: "#5B5FFF", // babyblue
    bgColor: "#E8E9FF", // babyblue/10
    borderColor: "#5B5FFF",
    label: "Running",
    bg: "bg-sky-50",
    text: "text-babyblue",
    dot: "bg-babyblue",
    border: "border-babyblue",
  },
  success: {
    color: "#10b981", // green-500
    bgColor: "#d1fae5", // green-100
    borderColor: "#10b981",
    label: "Success",
    bg: "bg-emerald-50",
    text: "text-success",
    dot: "bg-success",
    border: "border-success",
  },
  failed: {
    color: "#ef4444", // red-500
    bgColor: "#fee2e2", // red-100
    borderColor: "#ef4444",
    label: "Failed",
    bg: "bg-red-50",
    text: "text-error",
    dot: "bg-error",
    border: "border-error",
  },
};

/**
 * Get status configuration for a given status
 */
export function getStatusConfig(status: string): StatusConfig {
  const normalizedStatus = status?.toLowerCase() as SpanStatus;
  return (
    STATUS_CONFIGS[normalizedStatus] || {
      color: "#6b7280",
      bgColor: "#f3f4f6",
      borderColor: "#d1d5db",
      label: "Unknown",
      bg: "bg-gray-50",
      text: "text-muted",
      dot: "bg-muted",
      border: "border-muted",
    }
  );
}

/**
 * Get status color for node rendering
 */
export function getStatusColor(status: string): string {
  return getStatusConfig(status).color;
}

/**
 * Get status background color
 */
export function getStatusBgColor(status: string): string {
  return getStatusConfig(status).bgColor;
}

/**
 * Get status border color
 */
export function getStatusBorderColor(status: string): string {
  return getStatusConfig(status).borderColor;
}

/**
 * Get status label
 */
export function getStatusLabel(status: string): string {
  return getStatusConfig(status).label;
}
