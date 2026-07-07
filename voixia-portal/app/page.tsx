"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getToken } from "@/lib/config";

export default function Home() {
  useEffect(() => {
    window.location.href = getToken() ? "/agents" : "/login";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
      <Loader2 className="animate-spin" size={28} style={{ color: "var(--accent)" }} />
    </div>
  );
}
