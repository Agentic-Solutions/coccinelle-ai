'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu, X, ChevronDown, ChevronRight,
  Phone, MessageSquare, Mail, Smartphone,
  BookOpen, Calendar, Users, BarChart3,
  Building2, Heart, UtensilsCrossed, Car,
  Scissors, Scale, Calculator, Stethoscope, Building, Landmark, Briefcase, Activity,
  FileText, Bookmark, ArrowLeftRight,
  Headphones, PhoneCall, History,
} from 'lucide-react';
import { CoccinelleIcon } from '@/components/CoccinelleIcon';

type MenuKey = 'features' | 'sectors' | 'resources' | null;

// ─── Announcement Banner ───────────────────────────────────────────────────────

function AnnouncementBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('banner_dismissed_insights_v1');
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('banner_dismissed_insights_v1', '1');
  };

  if (!visible) return null;

  return (
    <div className="w-full bg-gray-900 text-white text-center py-2 text-sm">
      <span className="inline-flex items-center gap-1 flex-wrap justify-center">
        Nouveau : Analytics avancés disponibles sur le plan Pro
        <Link href="/signup" className="ml-2 underline hover:no-underline font-medium">
          Essayer gratuitement &rarr;
        </Link>
      </span>
      <button
        onClick={dismiss}
        className="ml-4 text-gray-400 hover:text-white transition-colors"
        aria-label="Fermer"
      >
        &times;
      </button>
    </div>
  );
}

// ─── Mega-menu: Fonctionnalites ────────────────────────────────────────────────

function FeaturesMenu() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="bg-gray-900 rounded-xl p-6 text-white flex flex-col justify-between min-h-[200px]">
        <div>
          <h3 className="text-lg font-bold mb-2">VoixIA</h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            L&apos;agent vocal IA souverain pour PME fran&ccedil;aises
          </p>
        </div>
        <span className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full text-xs font-medium w-fit">
          H&eacute;berg&eacute; en France
        </span>
        <Link href="/pricing#digital" className="mt-3 text-xs text-gray-400 hover:text-gray-200 transition-colors">
          Plans Digital (sans voix) &rarr; d&egrave;s 39&#8239;&#8364;/mois
        </Link>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Canaux</h4>
        <div className="space-y-1">
          <MegaLink icon={Phone} title="Agent vocal" desc="R&eacute;pond 24h/24" />
          <MegaLink icon={MessageSquare} title="SMS automatiques" desc="Confirmations et rappels" />
          <MegaLink icon={Mail} title="Email intelligent" desc="R&eacute;capitulatifs automatiques" />
          <MegaLink icon={Smartphone} title="WhatsApp" desc="Bient&ocirc;t disponible" badge="Bient&ocirc;t" />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Intelligence</h4>
        <div className="space-y-1">
          <MegaLink icon={BookOpen} title="Base de connaissances" desc="R&eacute;ponses pr&eacute;cises" />
          <MegaLink icon={Calendar} title="Agenda & RDV" desc="Prise de RDV automatique" />
          <MegaLink icon={Users} title="CRM int&eacute;gr&eacute;" desc="Gestion des contacts" />
          <MegaLink icon={BarChart3} title="Insights" desc="Analyses et statistiques" />
        </div>
      </div>
    </div>
  );
}

// ─── Mega-menu: Secteurs ───────────────────────────────────────────────────────

function SectorsMenu() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="bg-gray-900 rounded-xl p-6 text-white flex flex-col justify-between min-h-[200px]">
        <div>
          <h3 className="text-lg font-bold mb-2">Par secteur</h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            Solutions adapt&eacute;es &agrave; votre m&eacute;tier
          </p>
        </div>
        <Link href="/signup" className="mt-4 inline-flex items-center text-sm font-medium text-white hover:text-gray-300 transition-colors">
          D&eacute;marrer &rarr;
        </Link>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">PME & Services</h4>
        <div className="space-y-1">
          <MegaLink icon={Building2} title="Immobilier" desc="Agences et gestionnaires" href="/secteurs/immobilier" />
          <MegaLink icon={Building} title="Syndic" desc="Copropri&eacute;t&eacute;s et gestion" href="/secteurs/syndic" />
          <MegaLink icon={Stethoscope} title="Sant&eacute; & M&eacute;dical" desc="Cabinets et cliniques" href="/secteurs/sante" />
          <MegaLink icon={UtensilsCrossed} title="Restaurant & H&ocirc;tellerie" desc="R&eacute;servations automatiques" href="/secteurs/restaurant" />
          <MegaLink icon={Car} title="Automobile" desc="Garages et concessions" href="/secteurs/automobile" />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Professions lib&eacute;rales</h4>
        <div className="space-y-1">
          <MegaLink icon={Landmark} title="Notaire" desc="&Eacute;tudes notariales" href="/secteurs/notaire" />
          <MegaLink icon={Briefcase} title="Avocat" desc="Cabinets d&apos;avocats" href="/secteurs/avocat" />
          <MegaLink icon={Activity} title="M&eacute;decin" desc="Cabinets m&eacute;dicaux" href="/secteurs/medecin" />
          <MegaLink icon={Scale} title="Juridique" desc="Droit et conseil" href="/secteurs/juridique" />
          <MegaLink icon={Calculator} title="Comptable & Finance" desc="Experts-comptables" />
          <MegaLink icon={Scissors} title="Beaut&eacute; & Bien-&ecirc;tre" desc="Salons et instituts" href="/secteurs/beaute" />
        </div>
      </div>
    </div>
  );
}

// ─── Mega-menu: Ressources ─────────────────────────────────────────────────────

function ResourcesMenu() {
  return (
    <div className="grid grid-cols-2 gap-6 max-w-lg">
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Apprendre</h4>
        <div className="space-y-1">
          <MegaLink icon={FileText} title="Blog" desc="Articles et guides" href="/blog" />
          <MegaLink icon={Bookmark} title="Documentation" desc="Guides techniques" href="/docs" />
          <MegaLink icon={ArrowLeftRight} title="Comparatif" desc="vs autres solutions" href="/comparatif" />
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Support</h4>
        <div className="space-y-1">
          <MegaLink icon={Headphones} title="Support" desc="Nous contacter" href="mailto:support@coccinelle.ai" />
          <MegaLink icon={PhoneCall} title="D&eacute;mo" desc="Voir en action" href="/demo" />
          <MegaLink icon={History} title="Changelog" desc="Nouveaut&eacute;s" href="/changelog" />
        </div>
      </div>
    </div>
  );
}

// ─── Mega-menu link item ───────────────────────────────────────────────────────

function MegaLink({ icon: Icon, title, desc, href, badge }: {
  icon: typeof Phone;
  title: string;
  desc: string;
  href?: string;
  badge?: string;
}) {
  const inner = (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
        <Icon className="w-4 h-4 text-gray-700" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{title}</span>
          {badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );

  if (href?.startsWith('mailto:')) return <a href={href}>{inner}</a>;
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

// ─── Desktop nav trigger button ────────────────────────────────────────────────

function NavTrigger({ label, menuKey, activeMenu, onOpen, onClose }: {
  label: string;
  menuKey: MenuKey;
  activeMenu: MenuKey;
  onOpen: (k: MenuKey) => void;
  onClose: () => void;
}) {
  return (
    <button
      onMouseEnter={() => onOpen(menuKey)}
      onMouseLeave={onClose}
      className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        activeMenu === menuKey
          ? 'text-gray-900 bg-gray-50'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {label}
      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeMenu === menuKey ? 'rotate-180' : ''}`} />
    </button>
  );
}

// ─── Mobile accordion ──────────────────────────────────────────────────────────

function MobileAccordion({ label, open, onToggle, children }: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
      >
        {label}
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="pl-3">{children}</div>}
    </div>
  );
}

// ─── Mobile link ───────────────────────────────────────────────────────────────

function MobileItem({ icon: Icon, label, href, onClick }: {
  icon: typeof Phone;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex items-center gap-2.5 px-2 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
      <Icon className="w-4 h-4 text-gray-400" />
      {label}
    </div>
  );

  if (href?.startsWith('mailto:')) return <a href={href} onClick={onClick}>{inner}</a>;
  if (href) return <Link href={href} onClick={onClick}>{inner}</Link>;
  return inner;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function LandingNav() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<MenuKey>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = useCallback((menu: MenuKey) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveMenu(menu);
  }, []);

  const closeMenu = useCallback(() => {
    timeoutRef.current = setTimeout(() => setActiveMenu(null), 200);
  }, []);

  const clearAndClose = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveMenu(null);
  }, []);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <AnnouncementBanner />

      <div className="sticky top-4 z-50 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* ─── Navbar ──────────────────────────────────────────────── */}
          <nav className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between h-14 px-6">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                  <CoccinelleIcon size={18} color="white" />
                </div>
                <span className="text-lg font-semibold text-gray-900">Coccinelle.ai</span>
              </Link>

              {/* Desktop nav items */}
              <div className="hidden lg:flex items-center gap-1">
                <NavTrigger label="Fonctionnalit&eacute;s" menuKey="features" activeMenu={activeMenu} onOpen={openMenu} onClose={closeMenu} />
                <NavTrigger label="Secteurs" menuKey="sectors" activeMenu={activeMenu} onOpen={openMenu} onClose={closeMenu} />
                <Link
                  href="/pricing"
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                  onMouseEnter={clearAndClose}
                >
                  Tarifs
                </Link>
                <NavTrigger label="Ressources" menuKey="resources" activeMenu={activeMenu} onOpen={openMenu} onClose={closeMenu} />
                <a
                  href="#a-propos"
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                  onMouseEnter={clearAndClose}
                >
                  &Agrave; propos
                </a>
              </div>

              {/* Desktop CTAs */}
              <div className="hidden lg:flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Se connecter
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Essai gratuit
                </Link>
              </div>

              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </nav>

          {/* ─── Desktop mega-menu panel ──────────────────────────────── */}
          {activeMenu && (
            <div
              className="absolute left-0 right-0 mt-2 px-4 sm:px-6 lg:px-8 z-50 hidden lg:block"
              onMouseEnter={() => openMenu(activeMenu)}
              onMouseLeave={closeMenu}
            >
              <div
                className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6"
                style={{ animation: 'megaMenuFadeIn 150ms ease-out' }}
              >
                {activeMenu === 'features' && <FeaturesMenu />}
                {activeMenu === 'sectors' && <SectorsMenu />}
                {activeMenu === 'resources' && <ResourcesMenu />}
              </div>
            </div>
          )}

          {/* ─── Mobile menu panel ───────────────────────────────────── */}
          {mobileOpen && (
            <div className="lg:hidden mt-2 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="p-4 space-y-1">
                <MobileAccordion
                  label="Fonctionnalit&eacute;s"
                  open={mobileAccordion === 'features'}
                  onToggle={() => setMobileAccordion(prev => prev === 'features' ? null : 'features')}
                >
                  <div className="space-y-0.5 py-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 mb-1.5">Canaux</p>
                    <MobileItem icon={Phone} label="Agent vocal" onClick={closeMobile} />
                    <MobileItem icon={MessageSquare} label="SMS automatiques" onClick={closeMobile} />
                    <MobileItem icon={Mail} label="Email intelligent" onClick={closeMobile} />
                    <MobileItem icon={Smartphone} label="WhatsApp" onClick={closeMobile} />
                    <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 mt-3 mb-1.5">Intelligence</p>
                    <MobileItem icon={BookOpen} label="Base de connaissances" onClick={closeMobile} />
                    <MobileItem icon={Calendar} label="Agenda & RDV" onClick={closeMobile} />
                    <MobileItem icon={Users} label="CRM int&eacute;gr&eacute;" onClick={closeMobile} />
                    <MobileItem icon={BarChart3} label="Insights" onClick={closeMobile} />
                  </div>
                </MobileAccordion>

                <MobileAccordion
                  label="Secteurs"
                  open={mobileAccordion === 'sectors'}
                  onToggle={() => setMobileAccordion(prev => prev === 'sectors' ? null : 'sectors')}
                >
                  <div className="space-y-0.5 py-2">
                    <MobileItem icon={Building2} label="Immobilier" href="/secteurs/immobilier" onClick={closeMobile} />
                    <MobileItem icon={Building} label="Syndic" href="/secteurs/syndic" onClick={closeMobile} />
                    <MobileItem icon={Stethoscope} label="Sant&eacute; & M&eacute;dical" href="/secteurs/sante" onClick={closeMobile} />
                    <MobileItem icon={UtensilsCrossed} label="Restaurant & H&ocirc;tellerie" href="/secteurs/restaurant" onClick={closeMobile} />
                    <MobileItem icon={Car} label="Automobile" href="/secteurs/automobile" onClick={closeMobile} />
                    <MobileItem icon={Landmark} label="Notaire" href="/secteurs/notaire" onClick={closeMobile} />
                    <MobileItem icon={Briefcase} label="Avocat" href="/secteurs/avocat" onClick={closeMobile} />
                    <MobileItem icon={Activity} label="M&eacute;decin" href="/secteurs/medecin" onClick={closeMobile} />
                    <MobileItem icon={Scale} label="Juridique" href="/secteurs/juridique" onClick={closeMobile} />
                    <MobileItem icon={Calculator} label="Comptable & Finance" onClick={closeMobile} />
                    <MobileItem icon={Scissors} label="Beaut&eacute; & Bien-&ecirc;tre" href="/secteurs/beaute" onClick={closeMobile} />
                  </div>
                </MobileAccordion>

                <Link
                  href="/pricing"
                  className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                  onClick={closeMobile}
                >
                  Tarifs
                </Link>

                <MobileAccordion
                  label="Ressources"
                  open={mobileAccordion === 'resources'}
                  onToggle={() => setMobileAccordion(prev => prev === 'resources' ? null : 'resources')}
                >
                  <div className="space-y-0.5 py-2">
                    <MobileItem icon={FileText} label="Blog" href="/blog" onClick={closeMobile} />
                    <MobileItem icon={Bookmark} label="Documentation" href="/docs" onClick={closeMobile} />
                    <MobileItem icon={ArrowLeftRight} label="Comparatif" href="/comparatif" onClick={closeMobile} />
                    <MobileItem icon={Headphones} label="Support" href="mailto:support@coccinelle.ai" onClick={closeMobile} />
                    <MobileItem icon={PhoneCall} label="D&eacute;mo" href="/demo" onClick={closeMobile} />
                    <MobileItem icon={History} label="Changelog" href="/changelog" onClick={closeMobile} />
                  </div>
                </MobileAccordion>

                <a
                  href="#a-propos"
                  className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                  onClick={closeMobile}
                >
                  &Agrave; propos
                </a>

                <div className="pt-3 mt-2 border-t border-gray-100 space-y-2">
                  <Link
                    href="/login"
                    className="block w-full text-center px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                    onClick={closeMobile}
                  >
                    Se connecter
                  </Link>
                  <Link
                    href="/signup"
                    className="block w-full text-center px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
                    onClick={closeMobile}
                  >
                    Essai gratuit
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes megaMenuFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
