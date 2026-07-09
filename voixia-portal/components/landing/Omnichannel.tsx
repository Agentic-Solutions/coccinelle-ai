import { Phone, MessageSquare, MessagesSquare } from "lucide-react";

const CHANNELS = [
  { icon: Phone, name: "Voix", desc: "Appels entrants et sortants, voix françaises naturelles.", status: "Actif" },
  { icon: MessageSquare, name: "SMS", desc: "Réponses et notifications par SMS, dans la même conversation.", status: "Actif" },
  { icon: MessagesSquare, name: "WhatsApp", desc: "Conversations WhatsApp Business unifiées avec la voix et le SMS.", status: "Bientôt" },
];

export function Omnichannel() {
  return (
    <section className="mx-auto max-w-[1120px] px-7 py-24">
      <div className="mb-13 text-center">
        <div className="vx-eyebrow mb-3.5">Omnicanal</div>
        <h2 className="vx-h2" style={{ fontSize: 40 }}>
          Un agent, plusieurs canaux
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          const soon = c.status === "Bientôt";
          return (
            <div key={c.name} className="vx-card relative p-7">
              <span
                className="absolute right-4 top-4 rounded-md px-2 py-0.5 text-[11px] font-medium"
                style={
                  soon
                    ? { background: "var(--soon-bg)", color: "var(--soon-text)" }
                    : { background: "var(--ok-soft)", color: "var(--ok)" }
                }
              >
                {c.status}
              </span>
              <span
                className="mb-4 inline-flex items-center justify-center rounded-[10px] p-2.5"
                style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
              >
                <Icon size={20} />
              </span>
              <h3 className="mb-2 text-lg font-semibold" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>
                {c.name}
              </h3>
              <p className="text-[14px]" style={{ lineHeight: 1.6, color: "var(--muted-2)" }}>
                {c.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
