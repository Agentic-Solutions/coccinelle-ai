import * as React from "react"

export function Badge({ children, className = "", variant = "default" }: { children: React.ReactNode; className?: string; variant?: string }) {
  const variants: Record<string, string> = {
    default: "bg-gray-100 text-gray-800",
    secondary: "bg-gray-100 text-gray-800",
    destructive: "bg-red-100 text-red-800",
    outline: "border border-gray-200 text-gray-800",
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant] || variants.default} ${className}`}>{children}</span>
}
