import * as React from "react"

export function Tabs({ children, defaultValue, className = "" }: { children: React.ReactNode; defaultValue?: string; className?: string }) {
  return <div className={className}>{children}</div>
}

export function TabsList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`}>{children}</div>
}

export function TabsTrigger({ children, value, className = "" }: { children: React.ReactNode; value: string; className?: string }) {
  return <button className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:shadow-sm ${className}`}>{children}</button>
}

export function TabsContent({ children, value, className = "" }: { children: React.ReactNode; value: string; className?: string }) {
  return <div className={`mt-2 ${className}`}>{children}</div>
}
