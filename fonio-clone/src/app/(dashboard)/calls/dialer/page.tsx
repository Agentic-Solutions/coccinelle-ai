'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { Phone, PhoneOff, Mic, MicOff, Volume2, Pause, UserPlus, ArrowLeftRight, Delete } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE DIALER - Passer un appel
// ═══════════════════════════════════════
// Clavier téléphonique + WebRTC via Telnyx

const dialPad = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
]

export default function DialerPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [selectedLine, setSelectedLine] = useState('Ligne principale')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Timer pour la durée de l'appel
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isCallActive])

  const addDigit = useCallback((digit: string) => {
    setPhoneNumber(prev => prev + digit)
  }, [])

  const removeLastDigit = useCallback(() => {
    setPhoneNumber(prev => prev.slice(0, -1))
  }, [])

  const startCall = useCallback(() => {
    if (!phoneNumber) return
    setIsCallActive(true)
    setCallDuration(0)
    // TODO: Utiliser Telnyx WebRTC pour passer l'appel
    // import { TelnyxRTC } from '@telnyx/webrtc'
    // const client = new TelnyxRTC({ login: 'user', password: 'pass' })
    // client.call({ destinationNumber: phoneNumber, callerName: 'VoxyPhone' })
  }, [phoneNumber])

  const endCall = useCallback(() => {
    setIsCallActive(false)
    setCallDuration(0)
    // TODO: Raccrocher via Telnyx
  }, [])

  return (
    <div>
      <Header title="Dialer" subtitle="Passer un appel" />

      <div className="p-6 flex justify-center">
        <div className="w-full max-w-sm">
          {/* Sélection de la ligne */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Appeler depuis
            </label>
            <select
              value={selectedLine}
              onChange={e => setSelectedLine(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
            >
              <option>Ligne principale (+33 1 00 00 00 01)</option>
              <option>Ligne commerciale (+33 1 00 00 00 02)</option>
              <option>Ligne support (+33 1 00 00 00 03)</option>
            </select>
          </div>

          {/* Affichage du numéro */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="text-center mb-2">
              {isCallActive && (
                <p className="text-sm text-green-600 font-medium mb-1">Appel en cours</p>
              )}
              <input
                type="text"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="Entrez un numéro"
                className="text-2xl font-semibold text-gray-900 text-center w-full focus:outline-none"
                readOnly={isCallActive}
              />
              {isCallActive && (
                <p className="text-sm text-gray-500 mt-1">
                  {Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>

            {/* Contrôles d'appel actif */}
            {isCallActive && (
              <div className="flex justify-center gap-4 mt-4 mb-4">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={cn('p-3 rounded-full', isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                  title={isMuted ? 'Réactiver micro' : 'Couper micro'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200" title="Volume">
                  <Volume2 className="w-5 h-5" />
                </button>
                <button className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200" title="Mettre en attente">
                  <Pause className="w-5 h-5" />
                </button>
                <button className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200" title="Transférer">
                  <ArrowLeftRight className="w-5 h-5" />
                </button>
                <button className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200" title="Ajouter participant">
                  <UserPlus className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Clavier */}
            {!isCallActive && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {dialPad.map(({ digit, letters }) => (
                  <button
                    key={digit}
                    onClick={() => addDigit(digit)}
                    className="flex flex-col items-center justify-center h-16 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <span className="text-xl font-semibold text-gray-900">{digit}</span>
                    {letters && <span className="text-[10px] text-gray-400 tracking-widest">{letters}</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex items-center justify-center gap-4 mt-6">
              {!isCallActive && phoneNumber && (
                <button
                  onClick={removeLastDigit}
                  className="p-3 rounded-full hover:bg-gray-100"
                >
                  <Delete className="w-5 h-5 text-gray-500" />
                </button>
              )}

              <button
                onClick={isCallActive ? endCall : startCall}
                disabled={!phoneNumber && !isCallActive}
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
                  isCallActive
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed'
                )}
              >
                {isCallActive ? (
                  <PhoneOff className="w-6 h-6 text-white" />
                ) : (
                  <Phone className="w-6 h-6 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
