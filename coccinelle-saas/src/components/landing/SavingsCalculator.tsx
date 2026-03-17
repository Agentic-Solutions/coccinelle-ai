'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const HOURLY_COST = 25;
const WORK_DAYS = 22;

function calculate(callsPerDay: number, avgDuration: number) {
  const monthlyMinutes = callsPerDay * avgDuration * WORK_DAYS;
  const employeeHours = (monthlyMinutes / 60) * 1.5;
  const employeeCost = Math.min(
    Math.round(employeeHours * HOURLY_COST),
    WORK_DAYS * 7 * HOURLY_COST
  );

  let plan: string, base: number, included: number, extraRate: number;
  if (monthlyMinutes <= 500) {
    plan = 'Starter';
    base = 79;
    included = 500;
    extraRate = 0.15;
  } else {
    plan = 'Pro';
    base = 199;
    included = 2000;
    extraRate = 0.12;
  }

  const extraMinutes = Math.max(0, monthlyMinutes - included);
  const extraCost = Math.round(extraMinutes * extraRate);
  const coccinelleCost = base + extraCost;
  const savings = Math.max(0, employeeCost - coccinelleCost);
  const savingsPct = employeeCost > 0 ? Math.round((savings / employeeCost) * 100) : 0;

  return {
    monthlyMinutes,
    plan,
    base,
    included,
    extraMinutes,
    extraCost,
    coccinelleCost,
    employeeCost,
    savings,
    savingsPct,
    extraRate,
  };
}

export default function SavingsCalculator() {
  const [callsPerDay, setCallsPerDay] = useState(30);
  const [avgDuration, setAvgDuration] = useState(4);
  const [showDetail, setShowDetail] = useState(false);

  const r = calculate(callsPerDay, avgDuration);

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Calculez vos économies
          </h2>
          <p className="text-xl text-gray-600">
            Comparez le coût d&apos;un employé dédié aux appels avec Coccinelle
          </p>
        </div>

        {/* Sliders */}
        <div className="bg-white rounded-xl p-6 sm:p-8 shadow-lg border border-gray-200 mb-8">
          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Appels à traiter par jour
                </label>
                <span className="text-lg font-bold text-gray-900">{callsPerDay}</span>
              </div>
              <input
                type="range"
                min={5}
                max={200}
                value={callsPerDay}
                onChange={(e) => setCallsPerDay(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#D85A30] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#D85A30] [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#D85A30] [&::-moz-range-thumb]:border-0"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5</span>
                <span>200</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Durée moyenne d&apos;un appel
                </label>
                <span className="text-lg font-bold text-gray-900">{avgDuration} min</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={avgDuration}
                onChange={(e) => setAvgDuration(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#D85A30] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#D85A30] [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#D85A30] [&::-moz-range-thumb]:border-0"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 min</span>
                <span>15 min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 text-center">
            <p className="text-sm font-medium text-gray-500 mb-2">Coccinelle / mois</p>
            <p className="text-4xl font-bold text-[#D85A30] mb-1">
              {r.coccinelleCost.toLocaleString('fr-FR')} €
            </p>
            <p className="text-sm text-gray-500">
              Plan {r.plan} — le plus avantageux
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 text-center">
            <p className="text-sm font-medium text-gray-500 mb-2">Employé / mois</p>
            <p className="text-4xl font-bold text-gray-900 mb-1">
              {r.employeeCost.toLocaleString('fr-FR')} €
            </p>
            <p className="text-sm text-gray-500">
              Coût chargé temps plein
            </p>
          </div>
        </div>

        {/* Savings banner */}
        {r.savings > 0 && (
          <div className="bg-[#E1F5EE] rounded-xl p-6 text-center mb-6 border border-[#0F6E56]/20">
            <p className="text-sm font-medium text-[#0F6E56] mb-1">Vous économisez chaque mois</p>
            <p className="text-4xl font-bold text-[#0F6E56] mb-1">
              {r.savings.toLocaleString('fr-FR')} €
            </p>
            <p className="text-sm text-[#0F6E56]/80">
              soit {r.savingsPct}% d&apos;économie
            </p>
          </div>
        )}

        {/* Detail toggle */}
        <div className="text-center mb-4">
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Voir le détail
            {showDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showDetail && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 text-gray-600">Minutes d&apos;appel par mois</td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    {r.monthlyMinutes.toLocaleString('fr-FR')} min
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Plan recommandé</td>
                  <td className="py-2 text-right font-medium text-gray-900">{r.plan}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Minutes incluses</td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    {r.included.toLocaleString('fr-FR')} min
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Minutes supplémentaires</td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    {r.extraMinutes > 0
                      ? `${r.extraMinutes.toLocaleString('fr-FR')} min × ${r.extraRate.toFixed(2).replace('.', ',')} € = ${r.extraCost.toLocaleString('fr-FR')} €`
                      : 'Aucune'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600 font-medium">Total Coccinelle</td>
                  <td className="py-2 text-right font-bold text-[#D85A30]">
                    {r.coccinelleCost.toLocaleString('fr-FR')} €
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">
                    Coût employé (25 €/h chargé × heures d&apos;appel × 1,5)
                  </td>
                  <td className="py-2 text-right font-bold text-gray-900">
                    {r.employeeCost.toLocaleString('fr-FR')} €
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 leading-relaxed">
          Calcul basé sur 22 jours ouvrés par mois et un coût employé moyen de 25 €/heure chargé
          en France (salaire + charges patronales). Vous gardez votre propre numéro de téléphone.
        </p>
      </div>
    </section>
  );
}
