"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Loader2, Search, Check, Upload, FileText, ShieldCheck, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ComplianceBadge, type AgentCompliance } from "@/components/ComplianceBadge";

interface DocRow {
  id: string;
  doc_type: string;
  filename?: string | null;
  status?: string | null;
}
interface Detail {
  siret?: string | null;
  company_name?: string | null;
  insee_status?: string | null;
  address_line?: string | null;
  postal_code?: string | null;
  city?: string | null;
  bundle_status?: string | null;
  rejection_reason?: string | null;
}

const DOC_LABELS: Record<string, string> = {
  kbis: "Extrait Kbis",
  cin: "Pièce d'identité du dirigeant",
  address_proof: "Justificatif d'adresse",
};

// Modale de gestion du dossier de conformité d'un agent :
// 1) SIRET (vérif INSEE) + adresse  2) pièces (Kbis + CIN)  3) soumission bundle.
export function ComplianceModal({
  agent,
  onClose,
  onChanged,
}: {
  agent: AgentCompliance;
  onClose: () => void;
  onChanged: () => void;
}) {
  const id = agent.tenant_id;
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [siret, setSiret] = useState(agent.siret || "");
  const [companyName, setCompanyName] = useState(agent.company_name || agent.name || "");
  const [addressLine, setAddressLine] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [inseeStatus, setInseeStatus] = useState<string | null>(agent.insee_status || null);

  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const kbisRef = useRef<HTMLInputElement>(null);
  const cinRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { ok, data } = await apiFetch<{ success: boolean; compliance: Detail | null; documents: DocRow[]; error?: string }>(
      `/api/v1/compliance/${encodeURIComponent(id)}`
    );
    if (ok && data.success) {
      const c = data.compliance;
      setDetail(c);
      setDocs(data.documents || []);
      if (c) {
        setSiret(c.siret || "");
        setCompanyName(c.company_name || companyName);
        setAddressLine(c.address_line || "");
        setPostalCode(c.postal_code || "");
        setCity(c.city || "");
        setInseeStatus(c.insee_status || null);
      }
    } else setError(data.error || "Chargement impossible.");
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function verify() {
    setVerifying(true);
    setError(null);
    setNotice(null);
    const { ok, data } = await apiFetch<{
      success: boolean; status: string; company_name?: string; address_line?: string;
      postal_code?: string; city?: string; name_match?: boolean | null; error?: string;
    }>("/api/v1/compliance/verify-siret", {
      method: "POST",
      body: JSON.stringify({ siret, company_name: companyName }),
    });
    if (ok && data.success) {
      setInseeStatus(data.status);
      if (data.status === "verified") {
        if (data.company_name) setCompanyName(data.company_name);
        if (data.address_line) setAddressLine(data.address_line);
        if (data.postal_code) setPostalCode(data.postal_code);
        if (data.city) setCity(data.city);
        setNotice(
          data.name_match === false
            ? "SIRET actif. La raison sociale officielle diffère du nom saisi — vérifiez."
            : "SIRET vérifié : établissement actif."
        );
      } else if (data.status === "closed") setError("Cet établissement est fermé (SIRET cessé).");
      else if (data.status === "not_found") setError("SIRET introuvable dans l'annuaire des entreprises.");
    } else setError(data.error || "Vérification impossible.");
    setVerifying(false);
  }

  async function saveIdentity() {
    setSaving(true);
    setError(null);
    const { ok, data } = await apiFetch<{ success: boolean; insee_status?: string; error?: string }>(
      `/api/v1/compliance/${encodeURIComponent(id)}`,
      {
        method: "POST",
        body: JSON.stringify({
          siret, company_name: companyName, address_line: addressLine,
          postal_code: postalCode, city,
        }),
      }
    );
    if (ok && data.success) {
      if (data.insee_status) setInseeStatus(data.insee_status);
      setNotice("Identité enregistrée.");
      onChanged();
      load();
    } else setError(data.error || "Enregistrement impossible.");
    setSaving(false);
  }

  async function upload(docType: string, file: File) {
    setUploading(docType);
    setError(null);
    try {
      // Lecture en base64 (data URL) puis POST JSON — évite le multipart.
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1] || "";
      const { ok, data } = await apiFetch<{ success: boolean; error?: string }>(
        `/api/v1/compliance/${encodeURIComponent(id)}/documents`,
        {
          method: "POST",
          body: JSON.stringify({
            doc_type: docType,
            filename: file.name,
            content_type: file.type || "application/octet-stream",
            data_base64: base64,
          }),
        }
      );
      if (ok && data.success) {
        setNotice(`${DOC_LABELS[docType]} envoyé.`);
        load();
      } else setError(data.error || "Envoi impossible.");
    } catch {
      setError("Lecture du fichier impossible.");
    } finally {
      setUploading(null);
    }
  }

  async function submitBundle() {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const { ok, data } = await apiFetch<{ success: boolean; bundle_status?: string; rejection_reason?: string; error?: string }>(
      `/api/v1/compliance/${encodeURIComponent(id)}/bundle`,
      { method: "POST" }
    );
    if (ok && data.success) {
      if (data.bundle_status === "pending-review") {
        setNotice("Dossier soumis. Validation sous 1 à 3 jours ouvrés.");
      } else {
        setError(data.rejection_reason || "Dossier incomplet — vérifiez les pièces.");
      }
      onChanged();
      load();
    } else setError(data.error || "Soumission impossible.");
    setSubmitting(false);
  }

  async function refreshStatus() {
    setRefreshing(true);
    const { ok, data } = await apiFetch<{ success: boolean; bundle_status?: string }>(
      `/api/v1/compliance/${encodeURIComponent(id)}/bundle-status`
    );
    if (ok && data.success && detail) {
      setDetail({ ...detail, bundle_status: data.bundle_status });
      onChanged();
    }
    setRefreshing(false);
  }

  const hasDoc = (t: string) => docs.some((d) => d.doc_type === t);
  const bundleStatus = detail?.bundle_status || "draft";
  const locked = bundleStatus === "pending-review" || bundleStatus === "approved";
  const canSubmit = inseeStatus === "verified" && hasDoc("kbis") && hasDoc("cin") && !locked;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <div className="vx-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-start justify-between">
          <h2 className="vx-h2 text-lg">Dossier de conformité</h2>
          <button onClick={onClose} style={{ color: "var(--muted-3)" }} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <div className="mb-5 flex items-center gap-2">
          <span className="text-sm" style={{ color: "var(--muted-2)" }}>{companyName}</span>
          <ComplianceBadge status={bundleStatus} />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin" size={24} style={{ color: "var(--accent)" }} />
          </div>
        ) : (
          <div className="space-y-6">
            {notice && (
              <div className="rounded-[10px] px-3 py-2 text-sm" style={{ background: "rgba(22,163,74,0.10)", color: "var(--ok)" }}>
                {notice}
              </div>
            )}
            {error && (
              <div className="rounded-[10px] px-3 py-2 text-sm" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                {error}
              </div>
            )}

            {/* Étape 1 — Identité */}
            <section>
              <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>1. Identité de l'entreprise</h3>
              <div className="flex gap-2">
                <input
                  value={siret}
                  onChange={(e) => setSiret(e.target.value)}
                  disabled={locked}
                  className="vx-input vx-mono"
                  placeholder="SIRET (14 chiffres)"
                  inputMode="numeric"
                />
                <button onClick={verify} disabled={verifying || locked} className="vx-btn-secondary px-3 py-2.5 text-sm whitespace-nowrap">
                  {verifying ? <Loader2 className="animate-spin" size={15} /> : <Search size={15} />}
                  Vérifier
                </button>
              </div>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={locked}
                className="vx-input mt-2"
                placeholder="Raison sociale"
              />
              <input
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                disabled={locked}
                className="vx-input mt-2"
                placeholder="Adresse du siège"
              />
              <div className="mt-2 flex gap-2">
                <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} disabled={locked} className="vx-input" placeholder="Code postal" />
                <input value={city} onChange={(e) => setCity(e.target.value)} disabled={locked} className="vx-input" placeholder="Ville" />
              </div>
              {!locked && (
                <button onClick={saveIdentity} disabled={saving} className="vx-btn-secondary mt-3 px-4 py-2 text-sm">
                  {saving ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
                  Enregistrer l'identité
                </button>
              )}
              <p className="mt-3 text-xs" style={{ color: "var(--muted-3)" }}>
                Ces informations publiques pré-remplissent le dossier — la preuve d'identité se fait par
                le Kbis et la pièce du dirigeant, vérifiés par notre opérateur.
              </p>
            </section>

            {/* Étape 2 — Pièces */}
            <section>
              <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>2. Pièces justificatives</h3>
              <p className="mb-3 text-xs" style={{ color: "var(--muted-3)" }}>PDF, JPEG ou PNG — 10 Mo max. Données hébergées en UE.</p>
              {(["kbis", "cin"] as const).map((t) => (
                <div key={t} className="mb-2 flex items-center justify-between rounded-[10px] px-3 py-2.5" style={{ border: "1px solid var(--border-2)" }}>
                  <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                    <FileText size={15} style={{ color: hasDoc(t) ? "var(--ok)" : "var(--muted-3)" }} />
                    {DOC_LABELS[t]}
                    {hasDoc(t) && <Check size={14} style={{ color: "var(--ok)" }} />}
                  </span>
                  {!locked && (
                    <>
                      <input
                        ref={t === "kbis" ? kbisRef : cinRef}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) upload(t, f);
                          e.target.value = "";
                        }}
                      />
                      <button
                        onClick={() => (t === "kbis" ? kbisRef : cinRef).current?.click()}
                        disabled={uploading !== null}
                        className="vx-btn-secondary px-3 py-1.5 text-xs"
                      >
                        {uploading === t ? <Loader2 className="animate-spin" size={13} /> : <Upload size={13} />}
                        {hasDoc(t) ? "Remplacer" : "Ajouter"}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </section>

            {/* Étape 3 — Soumission / statut */}
            <section>
              <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>3. Validation</h3>
              {bundleStatus === "approved" ? (
                <div className="flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-sm" style={{ background: "rgba(22,163,74,0.10)", color: "var(--ok)" }}>
                  <ShieldCheck size={16} /> Dossier approuvé — vous pouvez attribuer un numéro à cet agent.
                </div>
              ) : bundleStatus === "pending-review" ? (
                <div className="flex items-center justify-between rounded-[10px] px-3 py-2.5 text-sm" style={{ background: "rgba(217,119,6,0.10)", color: "#b45309" }}>
                  <span>En cours de validation (1 à 3 jours ouvrés).</span>
                  <button onClick={refreshStatus} disabled={refreshing} className="inline-flex items-center gap-1 text-xs font-medium">
                    {refreshing ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />}
                    Actualiser
                  </button>
                </div>
              ) : (
                <>
                  {detail?.rejection_reason && (
                    <p className="mb-2 text-xs" style={{ color: "#dc2626" }}>{detail.rejection_reason}</p>
                  )}
                  <button onClick={submitBundle} disabled={!canSubmit || submitting} className="vx-btn-primary w-full px-4 py-2.5 text-sm">
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                    Lancer la vérification
                  </button>
                  {!canSubmit && (
                    <p className="mt-2 text-xs" style={{ color: "var(--muted-3)" }}>
                      Requis : SIRET vérifié, extrait Kbis et pièce d'identité du dirigeant.
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
