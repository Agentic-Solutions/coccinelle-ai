'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { buildApiUrl, getAuthHeaders, TRIAL_PHONE_NUMBER } from '@/lib/config';
import { SECTORS } from '@/lib/sectors';
import { VOICE_OPTIONS, type VoiceOption } from '@/lib/voices';
import { getSectorPrompt } from '@/lib/prompts';
import { DEFAULT_HORAIRES, DAY_LABELS, HEURES, horairesToText, parseHoraires, type Horaires } from '@/lib/horaires';
import StepperProgress from '@/components/onboarding/StepperProgress';
// KB handlers (crawl/upload) conserves pour usage dashboard, plus utilises dans l'onboarding simplifie

const TOTAL_STEPS = 4;

// Index UI → nom d'étape backend (doit rester aligné sur StepperProgress.STEP_LABELS
// et sur le stepMap de src/modules/onboarding/routes.js)
const STEP_NAMES = ['business', 'assistant', 'knowledge', 'complete'] as const;

// ─── Sector icons (inline SVGs) ────────────────────────────────
const SECTOR_ICONS: Record<string, React.ReactNode> = {
  generaliste: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>,
  immobilier: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>,
  automobile: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.143-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>,
  sante: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
  dentiste: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
  restaurant: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265z" /></svg>,
  beaute: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
  fitness: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  education: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>,
  ecommerce: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>,
  artisan: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.67 3.18a1.5 1.5 0 01-2.18-1.58l1.08-6.31L.47 6.5a1.5 1.5 0 01.83-2.56l6.34-.92L10.47.72a1.5 1.5 0 012.7 0l2.83 5.3 6.34.92a1.5 1.5 0 01.83 2.56l-4.59 4.47 1.08 6.31a1.5 1.5 0 01-2.18 1.58l-5.67-3.18z" /></svg>,
  juridique: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" /></svg>,
  autre: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>,
};

// ─── Indicatifs pays (item 3) ────────────────────────────────
const COUNTRIES = [
  { code: 'FR', flag: '🇫🇷', dial: '+33' },
  { code: 'BE', flag: '🇧🇪', dial: '+32' },
  { code: 'CH', flag: '🇨🇭', dial: '+41' },
  { code: 'LU', flag: '🇱🇺', dial: '+352' },
];

// Reconstitue un E.164 (+33612345678) depuis indicatif + numéro national.
function buildE164(dial: string, national: string): string {
  const digits = national.replace(/\D/g, '').replace(/^0+/, '');
  return digits ? `${dial}${digits}` : '';
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Step 0: Entreprise ───────────────────────────────────────
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [phone, setPhone] = useState('');
  // Téléphone — indicatif pays + numéro national (item 3)
  const [dialCode, setDialCode] = useState('+33');
  const [phoneNational, setPhoneNational] = useState('');
  // Horaires par jour (source unique : lib/horaires)
  const [horaires, setHoraires] = useState<Horaires>(DEFAULT_HORAIRES);
  // Phone verification
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState('');

  // ── Step 1: Agent ────────────────────────────────────────────
  const [agentName, setAgentName] = useState('');
  const [voiceGender, setVoiceGender] = useState<'Féminin' | 'Masculin'>('Féminin');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Step 2: Connaissances (simplifie) ───────────────────────
  const [kbAdresse, setKbAdresse] = useState('');
  const [kbServices, setKbServices] = useState('');
  const [kbTarifs, setKbTarifs] = useState('');
  const [kbShowExtra, setKbShowExtra] = useState(false);
  const [kbQaItems, setKbQaItems] = useState<{ question: string; answer: string }[]>([]);
  const [kbCurrentQA, setKbCurrentQA] = useState({ question: '', answer: '' });
  const [kbSaving, setKbSaving] = useState(false);

  // ── Init from API ────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const token = localStorage.getItem('auth_token');
      if (!token) { router.replace('/login'); return; }

      try {
        const stateRes = await fetch(buildApiUrl('/api/v1/onboarding/state'), {
          headers: getAuthHeaders(),
        });

        if (stateRes.ok) {
          const data = await stateRes.json();
          if (data.tenant?.onboarding_completed === 1) {
            router.replace('/dashboard');
            return;
          }
          setCompanyName(data.tenant?.name || '');
          setSector(data.tenant?.sector || '');
          const existingPhone = data.tenant?.phone || '';
          setPhone(existingPhone);
          if (existingPhone) {
            const c = COUNTRIES.find(co => existingPhone.startsWith(co.dial)) || COUNTRIES[0];
            setDialCode(c.dial);
            setPhoneNational(existingPhone.slice(c.dial.length));
          }
          if (data.tenant?.horaires) setHoraires(parseHoraires(data.tenant.horaires));
          setPhoneVerified(data.user?.phone_verified === 1);
          const resumeStep = data.session?.current_step || 0;
          setCurrentStep(Math.min(resumeStep, TOTAL_STEPS - 1));
        } else {
          const meRes = await fetch(buildApiUrl('/api/v1/auth/me'), {
            headers: getAuthHeaders(),
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.tenant?.onboarding_completed === 1) {
              router.replace('/dashboard');
              return;
            }
            setCompanyName(meData.tenant?.name || '');
            setSector(meData.tenant?.sector || '');
          }
        }

        // Create or recover session
        const existingSessionId = localStorage.getItem('onboarding_session_id');
        if (!existingSessionId) {
          const startRes = await fetch(buildApiUrl('/api/v1/onboarding/start'), {
            method: 'POST',
            headers: getAuthHeaders(),
          });
          if (startRes.ok) {
            const startData = await startRes.json();
            const newId = startData.session_id || startData.sessionId || startData.id;
            if (newId) localStorage.setItem('onboarding_session_id', newId);
          }
        }
      } catch {
        // Continue with defaults
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  // ── Navigation ───────────────────────────────────────────────
  const markCompleted = useCallback((step: number) => {
    setCompletedSteps(prev => new Set(prev).add(step));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const saveStep = useCallback(async (stepName: string, data?: Record<string, unknown>) => {
    try {
      await fetch(buildApiUrl('/api/v1/onboarding/step'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ step: stepName, data }),
      });
    } catch {
      // Continue even if save fails
    }
  }, []);

  // ── Instrumentation (QW3) ────────────────────────────────────
  // L'événement 'saved' est écrit côté backend par /onboarding/step. Ici on émet ce que
  // le backend ne peut pas voir : l'étape ATTEINTE puis abandonnée, et le « Passer ».
  // Fire-and-forget : la mesure ne doit jamais retarder ni casser le parcours.
  const trackEvent = useCallback((stepName: string, event: 'entered' | 'skipped', stepIndex: number) => {
    fetch(buildApiUrl('/api/v1/onboarding/event'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ step: stepName, event, step_index: stepIndex }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (loading) return;
    const stepName = STEP_NAMES[currentStep];
    if (stepName) trackEvent(stepName, 'entered', currentStep);
  }, [currentStep, loading, trackEvent]);

  // ── Phone verification ───────────────────────────────────────
  const handleSendPhoneCode = async () => {
    const normalizedPhone = buildE164(dialCode, phoneNational);
    if (!normalizedPhone) return;

    setPhoneSending(true);
    setPhoneMsg('');
    try {
      const res = await fetch(buildApiUrl('/api/v1/onboarding/send-verification'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ phone: normalizedPhone }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        try {
          const errJson = JSON.parse(errText);
          setPhoneMsg(errJson.error || `Erreur ${res.status}`);
        } catch {
          setPhoneMsg(`Erreur ${res.status}`);
        }
      } else {
        const data = await res.json();
        if (data.success) {
          setPhoneCodeSent(true);
          setPhoneMsg('Code envoyé par SMS');
          setPhone(normalizedPhone);
        } else {
          setPhoneMsg(data.error || 'Erreur envoi');
        }
      }
    } catch (err) {
      console.error('[Onboarding] send-verification error:', err);
      setPhoneMsg('Erreur réseau');
    } finally {
      setPhoneSending(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (phoneCode.length !== 6) return;
    setPhoneVerifying(true);
    setPhoneMsg('');
    try {
      const res = await fetch(buildApiUrl('/api/v1/onboarding/verify-phone'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ code: phoneCode }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        try {
          const errJson = JSON.parse(errText);
          setPhoneMsg(errJson.error || `Erreur ${res.status}`);
        } catch {
          setPhoneMsg(`Erreur ${res.status}`);
        }
      } else {
        const data = await res.json();
        if (data.success) {
          setPhoneVerified(true);
          setPhoneMsg('Vérifié');
        } else {
          setPhoneMsg(data.error || 'Code incorrect');
        }
      }
    } catch (err) {
      console.error('[Onboarding] verify-phone error:', err);
      setPhoneMsg('Erreur réseau');
    } finally {
      setPhoneVerifying(false);
    }
  };

  // Item 4 — auto-submit : vérifie dès que les 6 chiffres sont saisis
  useEffect(() => {
    if (phoneCodeSent && !phoneVerified && !phoneVerifying && phoneCode.length === 6) {
      handleVerifyPhoneCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneCode, phoneCodeSent, phoneVerified]);

  // ── Voice preview ────────────────────────────────────────────
  const handlePlayVoice = async (voice: VoiceOption) => {
    if (playingVoiceId === voice.id) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }
    setPlayingVoiceId(voice.id);
    const previewText = `Bonjour, je suis ${agentName.trim() || 'votre assistant'}, de ${companyName.trim() || 'votre entreprise'}, comment puis-je vous aider ?`;
    try {
      const res = await fetch(buildApiUrl('/api/v1/ai/voice-preview'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ voice_id: voice.id, text: previewText }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setPlayingVoiceId(null);
        audio.play();
      } else {
        setPlayingVoiceId(null);
      }
    } catch {
      setPlayingVoiceId(null);
    }
  };

  // ── KB handlers ──────────────────────────────────────────────
  const handleKbAddQA = () => {
    if (!kbCurrentQA.question.trim() || !kbCurrentQA.answer.trim()) return;
    if (kbQaItems.length >= 3) return;
    setKbQaItems([...kbQaItems, kbCurrentQA]);
    setKbCurrentQA({ question: '', answer: '' });
  };

  // ── Step handlers ────────────────────────────────────────────
  const handleStep0Next = async () => {
    if (!companyName.trim() || !sector) {
      setError('Le nom de l\'entreprise et le secteur sont requis');
      return;
    }
    setError('');
    const e164 = buildE164(dialCode, phoneNational);
    await saveStep('business', {
      company_name: companyName.trim(),
      sector,
      phone: e164 || undefined,
      horaires,
    });
    markCompleted(0);
    setCurrentStep(1);
  };

  const handleStep1Next = async () => {
    setError('');
    const finalAgentName = agentName.trim() || 'Assistant';
    const voiceId = selectedVoice || VOICE_OPTIONS.find(v => v.gender === voiceGender)?.id || VOICE_OPTIONS[0].id;

    // Build system_prompt from sector template
    const sectorPrompt = getSectorPrompt(sector);
    let systemPrompt = sectorPrompt?.system_prompt || '';
    if (systemPrompt) {
      systemPrompt = systemPrompt
        .replace(/\{NOM_AGENT\}/g, finalAgentName)
        .replace(/\{NOM_ENTREPRISE\}/g, companyName.trim())
        .replace(/\{HORAIRES\}/g, horairesToText(horaires) || 'sur rendez-vous')
        .replace(/\{TELEPHONE\}/g, phone.trim() || '');
    }

    await saveStep('assistant', {
      agent_name: finalAgentName,
      voice_id: voiceId,
      secteur: sector,
      system_prompt: systemPrompt || undefined,
    });
    markCompleted(1);
    setCurrentStep(2);
  };

  const handleStep2Next = async () => {
    if (!kbAdresse.trim() || !kbServices.trim()) {
      setError('L\'adresse et les services sont requis');
      return;
    }
    setError('');
    setKbSaving(true);
    try {
      await saveStep('knowledge', {
        adresse: kbAdresse.trim(),
        services: kbServices.trim(),
        tarifs: kbTarifs.trim() || undefined,
        qa_items: kbQaItems.length > 0 ? kbQaItems : undefined,
      });
    } finally {
      setKbSaving(false);
    }
    markCompleted(2);
    setCurrentStep(3);
  };

  const handleStep2Skip = () => {
    trackEvent('knowledge', 'skipped', 2);
    setCurrentStep(3);
  };

  const handleComplete = async () => {
    markCompleted(3);
    await saveStep('complete');
    localStorage.removeItem('onboarding_session_id');
    router.push('/dashboard');
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  // ── Filtered voices ──────────────────────────────────────────
  const filteredVoices = VOICE_OPTIONS.filter(v => v.gender === voiceGender);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-white py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <StepperProgress
          currentStep={currentStep}
          completedSteps={completedSteps}
          onGotoStep={goToStep}
        />

        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* ══════════════ STEP 0 — ENTREPRISE ══════════════ */}
          {currentStep === 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Votre entreprise</h2>
              <p className="text-gray-500 text-center mb-8">
                Ces informations personnalisent votre assistant vocal
              </p>

              <div className="max-w-lg mx-auto space-y-6">
                {/* Nom entreprise */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l&apos;entreprise <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Ex : Mon Salon de Beauté"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  />
                </div>

                {/* Secteur */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secteur d&apos;activité <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {SECTORS.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSector(s.value)}
                        className={`border-2 rounded-lg p-3 flex flex-col items-center gap-1.5 transition-all text-center
                          ${sector === s.value
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-400'
                          }`}
                      >
                        <span className={sector === s.value ? 'text-gray-900' : 'text-gray-400'}>
                          {SECTOR_ICONS[s.value] || SECTOR_ICONS.autre}
                        </span>
                        <span className={`text-xs font-medium leading-tight ${sector === s.value ? 'text-gray-900' : 'text-gray-600'}`}>
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horaires par jour (item 2) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horaires d&apos;ouverture
                  </label>
                  <div className="space-y-1.5">
                    {DAY_LABELS.map(({ key, label }) => {
                      const d = horaires[key];
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <span className="w-20 text-gray-700">{label}</span>
                          <button
                            type="button"
                            onClick={() => setHoraires(prev => ({ ...prev, [key]: { ...prev[key], ouvert: !prev[key].ouvert } }))}
                            className={`w-20 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              d.ouvert ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {d.ouvert ? 'Ouvert' : 'Fermé'}
                          </button>
                          {d.ouvert ? (
                            <>
                              <select
                                value={d.debut}
                                onChange={e => setHoraires(prev => ({ ...prev, [key]: { ...prev[key], debut: e.target.value } }))}
                                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                              >
                                {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                              <span className="text-gray-400">–</span>
                              <select
                                value={d.fin}
                                onChange={e => setHoraires(prev => ({ ...prev, [key]: { ...prev[key], fin: e.target.value } }))}
                                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                              >
                                {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">Fermé</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {horairesToText(horaires) && (
                    <p className="mt-2 text-xs text-gray-500">{horairesToText(horaires)}</p>
                  )}
                </div>

                {/* Téléphone avec indicatif (item 3) + vérification */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone professionnel
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={dialCode}
                      onChange={e => { setDialCode(e.target.value); setPhone(buildE164(e.target.value, phoneNational)); setPhoneVerified(false); setPhoneCodeSent(false); }}
                      disabled={phoneVerified}
                      className="px-2 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none disabled:bg-gray-50 text-sm"
                      aria-label="Indicatif pays"
                    >
                      {COUNTRIES.map(c => <option key={c.code} value={c.dial}>{c.flag} {c.dial}</option>)}
                    </select>
                    <input
                      type="tel"
                      value={phoneNational}
                      onChange={e => { setPhoneNational(e.target.value); setPhone(buildE164(dialCode, e.target.value)); setPhoneVerified(false); setPhoneCodeSent(false); }}
                      placeholder="06 12 34 56 78"
                      disabled={phoneVerified}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none disabled:bg-gray-50"
                    />
                    {phoneVerified ? (
                      <span className="flex items-center px-4 py-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium whitespace-nowrap">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Vérifié
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendPhoneCode}
                        disabled={phoneSending || !phoneNational.trim()}
                        className="px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                      >
                        {phoneSending ? 'Envoi...' : phoneCodeSent ? 'Renvoyer' : 'Vérifier'}
                      </button>
                    )}
                  </div>
                  {phoneMsg && (
                    <p className={`text-xs mt-1 ${phoneVerified ? 'text-green-600' : 'text-gray-500'}`}>{phoneMsg}</p>
                  )}

                  {/* Code input */}
                  {phoneCodeSent && !phoneVerified && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={phoneCode}
                        onChange={e => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Code 6 chiffres"
                        maxLength={6}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-center text-lg tracking-[0.3em] font-mono"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleVerifyPhoneCode}
                        disabled={phoneVerifying || phoneCode.length !== 6}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {phoneVerifying ? '...' : 'OK'}
                      </button>
                    </div>
                  )}

                  {/* Item 5 — vérification passable */}
                  {!phoneVerified && (
                    <button
                      type="button"
                      onClick={handleStep0Next}
                      className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                      Passer, je vérifierai plus tard
                    </button>
                  )}
                </div>

              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={handleStep0Next}
                  disabled={!companyName.trim() || !sector}
                  className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* ══════════════ STEP 1 — AGENT ══════════════ */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Votre assistant vocal</h2>
              <p className="text-gray-500 text-center mb-8">
                Choisissez le prénom et la voix de votre assistant
              </p>

              <div className="max-w-lg mx-auto space-y-6">
                {/* Prénom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom de l&apos;assistant
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={e => setAgentName(e.target.value)}
                    placeholder="Ex : Lina, Julie, Marc..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  />
                </div>

                {/* Genre toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de voix</label>
                  <div className="flex gap-3">
                    {(['Féminin', 'Masculin'] as const).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => { setVoiceGender(g); setSelectedVoice(''); }}
                        className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                          voiceGender === g
                            ? 'bg-gray-900 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {g === 'Féminin' ? 'Féminine' : 'Masculine'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice cards */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choisissez une voix
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {filteredVoices.map(voice => (
                      <button
                        key={voice.id}
                        type="button"
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`text-left p-3 rounded-lg border-2 transition-all ${
                          selectedVoice === voice.id
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-medium text-sm ${selectedVoice === voice.id ? 'text-gray-900' : 'text-gray-700'}`}>
                            {voice.label}
                          </span>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); handlePlayVoice(voice); }}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                          >
                            {playingVoiceId === voice.id ? (
                              <svg className="w-3.5 h-3.5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="6" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-gray-700 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{voice.style}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(0)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleStep1Next}
                  className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* ══════════════ STEP 2 — CONNAISSANCES (simplifie) ══════════════ */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Quelques infos essentielles</h2>
              <p className="text-gray-500 text-center mb-8">
                Vos clients posent toujours ces questions. 2 minutes suffisent.
              </p>

              <div className="max-w-lg mx-auto space-y-6">
                {/* Adresse */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={kbAdresse}
                    onChange={e => setKbAdresse(e.target.value)}
                    placeholder="Ex: 12 rue de la Paix, 31000 Toulouse"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Vos clients demandent souvent ou vous etes</p>
                </div>

                {/* Services */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ce que vous proposez <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={kbServices}
                    onChange={e => setKbServices(e.target.value)}
                    placeholder="Ex: Vente et location de biens immobiliers, estimations, gestion locative..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Decrivez vos services en langage naturel</p>
                </div>

                {/* Tarifs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tarifs ou fourchette de prix <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
                  </label>
                  <textarea
                    value={kbTarifs}
                    onChange={e => setKbTarifs(e.target.value)}
                    placeholder="Ex: Honoraires 3% du prix de vente, gestion locative 8%/mois..."
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Laissez vide si vous preferez ne pas l&apos;afficher</p>
                </div>

                {/* Extra Q&A */}
                {!kbShowExtra && (
                  <button
                    type="button"
                    onClick={() => setKbShowExtra(true)}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    + Ajouter d&apos;autres infos
                  </button>
                )}

                {kbShowExtra && (
                  <div className="border border-gray-200 rounded-xl p-5">
                    <h3 className="font-semibold text-gray-900 mb-3">Questions-reponses supplementaires</h3>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={kbCurrentQA.question}
                        onChange={e => setKbCurrentQA({ ...kbCurrentQA, question: e.target.value })}
                        placeholder="Question : ex. Quels sont vos horaires ?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
                      />
                      <textarea
                        value={kbCurrentQA.answer}
                        onChange={e => setKbCurrentQA({ ...kbCurrentQA, answer: e.target.value })}
                        placeholder="Reponse : ex. Nous sommes ouverts du lundi au samedi, de 9h a 19h."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm resize-none"
                      />
                      <button
                        type="button"
                        onClick={handleKbAddQA}
                        disabled={!kbCurrentQA.question.trim() || !kbCurrentQA.answer.trim() || kbQaItems.length >= 3}
                        className="text-sm text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + Ajouter ({3 - kbQaItems.length} restant{3 - kbQaItems.length > 1 ? 's' : ''})
                      </button>
                    </div>
                    {kbQaItems.length > 0 && (
                      <div className="mt-3 border border-gray-100 rounded-lg divide-y divide-gray-100">
                        {kbQaItems.map((qa, i) => (
                          <div key={i} className="px-3 py-2">
                            <p className="text-xs font-medium text-gray-700">{qa.question}</p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{qa.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-400 text-center">
                  Vous pourrez completer ces informations depuis votre tableau de bord.
                </p>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
                >
                  Retour
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleStep2Skip}
                    className="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    Passer
                  </button>
                  <button
                    type="button"
                    onClick={handleStep2Next}
                    disabled={!kbAdresse.trim() || !kbServices.trim() || kbSaving}
                    className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {kbSaving ? 'Enregistrement...' : 'Continuer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ STEP 3 — PRÊT ══════════════ */}
          {currentStep === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tout est prêt !</h2>
              <p className="text-gray-500 mb-8">
                Votre assistant vocal est configuré et prêt à répondre à vos clients.
              </p>

              <div className="max-w-md mx-auto space-y-3 text-left mb-8">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{companyName}</p>
                    <p className="text-xs text-gray-500">{SECTORS.find(s => s.value === sector)?.label || sector}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Assistant : {agentName || 'Assistant'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Voix {voiceGender === 'Féminin' ? 'féminine' : 'masculine'}
                      {selectedVoice && ` — ${VOICE_OPTIONS.find(v => v.id === selectedVoice)?.label || ''}`}
                    </p>
                  </div>
                </div>

                {phone && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <svg className={`w-5 h-5 flex-shrink-0 ${phoneVerified ? 'text-green-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{phone}</p>
                      <p className="text-xs text-gray-500">{phoneVerified ? 'Vérifié' : 'Non vérifié'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Magic moment : appeler son assistant maintenant ── */}
              {phoneVerified ? (
                <div className="max-w-md mx-auto mb-8 border-2 border-gray-900 rounded-xl p-6">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Appelez votre assistant maintenant
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Depuis votre téléphone vérifié ({phone}), composez ce numéro : {agentName || 'votre assistant'} décroche.
                  </p>
                  <a
                    href={`tel:${TRIAL_PHONE_NUMBER.replace(/\s/g, '')}`}
                    className="block w-full px-6 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition-colors text-xl tracking-wide"
                  >
                    {TRIAL_PHONE_NUMBER}
                  </a>
                  <p className="text-xs text-gray-400 mt-3">
                    Votre assistant vous reconnaît grâce à votre numéro vérifié.
                  </p>
                </div>
              ) : (
                <div className="max-w-md mx-auto mb-8 border border-gray-200 rounded-xl p-5 text-left">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Testez votre assistant par téléphone
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Vérifiez votre numéro : c&apos;est ce qui permet à votre assistant de vous
                    reconnaître quand vous appelez.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(0)}
                    className="text-sm font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600 transition-colors"
                  >
                    Vérifier mon numéro
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleComplete}
                className="px-10 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition-colors text-lg"
              >
                Découvrir mon dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
