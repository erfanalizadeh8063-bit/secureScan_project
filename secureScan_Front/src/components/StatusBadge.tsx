import React from "react";

type Props = { status: string; className?: string };

export default function StatusBadge({ status, className = "" }: Props) {
  const s = String(status || "").toLowerCase();

  // color map
  const colors: Record<string, string> = {
    queued:   "bg-blue-900/40 text-blue-200 border-blue-800",
    running:  "bg-yellow-900/40 text-yellow-200 border-yellow-800",
    completed:"bg-green-900/40 text-green-200 border-green-800",
    failed:   "bg-red-900/40 text-red-200 border-red-800",
    canceled: "bg-gray-900/40 text-gray-300 border-gray-700",
  };

  const cls = colors[s] || "bg-neutral-900/40 text-neutral-300 border-neutral-700";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium ${cls} ${className}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}