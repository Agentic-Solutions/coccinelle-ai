import * as React from "react"
import CoccinelleIcon from "./CoccinelleIcon"

export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="flex items-center justify-center">
      <CoccinelleIcon size={size * 0.6} color="currentColor" className="text-gray-700" />
    </div>
  )
}
