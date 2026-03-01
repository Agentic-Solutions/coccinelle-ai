import * as React from "react"

export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="flex items-center justify-center">
      <span className="text-2xl">🐞</span>
    </div>
  )
}
