"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://coccinelle-api.youssef-amrouche.workers.dev";

function FeedbackForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Lien de feedback invalide.");
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/v1/feedback/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          setError("Ce lien de feedback est invalide ou a expire.");
        } else if (data.feedback?.already_submitted) {
          setAlreadySubmitted(true);
        }
        if (data.feedback?.appointment_date) {
          setAppointmentDate(data.feedback.appointment_date);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Impossible de charger les informations.");
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async () => {
    if (!token || rating === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, comment: comment || undefined }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || "Erreur lors de l'envoi.");
      }
    } catch {
      setError("Erreur de connexion. Veuillez reessayer.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Oups !</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Feedback deja envoye
          </h2>
          <p className="text-gray-600">
            Vous avez deja donne votre avis pour ce rendez-vous. Merci !
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Merci pour votre avis !
          </h2>
          <p className="text-gray-600">
            Votre retour nous aide a ameliorer nos services. A bientot !
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Votre avis compte
          </h1>
          <p className="text-gray-600">
            Comment s&apos;est passe votre rendez-vous
            {appointmentDate
              ? ` du ${new Date(appointmentDate).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}`
              : ""}
            &nbsp;?
          </p>
        </div>

        {/* Etoiles */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
              className="focus:outline-none transition-transform hover:scale-110"
              aria-label={`${star} etoile${star > 1 ? "s" : ""}`}
            >
              <svg
                className={`w-12 h-12 ${
                  star <= (hoveredRating || rating)
                    ? "text-yellow-400"
                    : "text-gray-300"
                } transition-colors`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p className="text-center text-sm text-gray-500 mb-4">
            {rating === 1 && "Tres insatisfait"}
            {rating === 2 && "Insatisfait"}
            {rating === 3 && "Moyen"}
            {rating === 4 && "Satisfait"}
            {rating === 5 && "Tres satisfait"}
          </p>
        )}

        {/* Commentaire */}
        <div className="mb-6">
          <label
            htmlFor="comment"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Un commentaire ? (optionnel)
          </label>
          <textarea
            id="comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            placeholder="Dites-nous en plus..."
          />
        </div>

        {/* Bouton */}
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
            rating === 0
              ? "bg-gray-300 cursor-not-allowed"
              : submitting
              ? "bg-red-400 cursor-wait"
              : "bg-red-500 hover:bg-red-600 active:scale-[0.98]"
          }`}
        >
          {submitting ? "Envoi en cours..." : "Envoyer mon avis"}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          Propulse par Coccinelle.ai
        </p>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500" />
        </div>
      }
    >
      <FeedbackForm />
    </Suspense>
  );
}
