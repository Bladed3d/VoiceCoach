/**
 * VoiceCoach V2 - Sales Celebration Component
 * Full-screen celebration overlay with confetti and balloons
 * Triggered when stage 9 completes (sale closed!)
 * LED Range: 7400-7449
 */
import React, { useEffect, useState } from 'react';
import { Trophy, DollarSign, Sparkles } from 'lucide-react';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

interface SalesCelebrationProps {
  show: boolean;
  onComplete?: () => void;
  duration?: number; // Duration in ms (default: 5000)
}

export const SalesCelebration: React.FC<SalesCelebrationProps> = ({
  show,
  onComplete,
  duration = 5000
}) => {
  const [trail] = useState(() => new BreadcrumbTrail('SalesCelebration'));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      trail.light(7400, {
        operation: 'celebration_triggered',
        duration,
        timestamp: Date.now()
      });

      setIsVisible(true);

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        setIsVisible(false);
        trail.light(7401, {
          operation: 'celebration_complete',
          timestamp: Date.now()
        });
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete, trail]);

  if (!isVisible) return null;

  // Generate random confetti particles
  const confettiCount = 50;
  const confetti = Array.from({ length: confettiCount }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
    color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][Math.floor(Math.random() * 6)]
  }));

  // Generate balloons
  const balloonCount = 10;
  const balloons = Array.from({ length: balloonCount }, (_, i) => ({
    id: i,
    left: 10 + (i * 8),
    delay: Math.random() * 1,
    duration: 4 + Math.random() * 2,
    color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'][i % 6]
  }));

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dark overlay with fade */}
      <div className="absolute inset-0 bg-black/30 animate-fadeIn" />

      {/* Confetti particles */}
      {confetti.map((particle) => (
        <div
          key={`confetti-${particle.id}`}
          className="absolute top-0 w-2 h-2 animate-confettiFall"
          style={{
            left: `${particle.left}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            backgroundColor: particle.color
          }}
        />
      ))}

      {/* Balloons */}
      {balloons.map((balloon) => (
        <div
          key={`balloon-${balloon.id}`}
          className="absolute bottom-0 animate-balloonRise"
          style={{
            left: `${balloon.left}%`,
            animationDelay: `${balloon.delay}s`,
            animationDuration: `${balloon.duration}s`
          }}
        >
          <div
            className="w-12 h-16 rounded-full shadow-lg relative"
            style={{ backgroundColor: balloon.color }}
          >
            {/* Balloon string */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-8 bg-slate-600" />
          </div>
        </div>
      ))}

      {/* Main celebration message */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl shadow-2xl p-12 max-w-2xl mx-4 animate-scaleIn">
          {/* Trophy icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Trophy className="w-24 h-24 text-yellow-400 animate-bounce" />
              <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-300 animate-pulse" />
              <Sparkles className="absolute -bottom-2 -left-2 w-8 h-8 text-yellow-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          {/* Main text */}
          <h1 className="text-6xl font-bold text-white text-center mb-4 animate-pulse">
            SALE COMPLETED!
          </h1>

          {/* Subtitle */}
          <div className="flex items-center justify-center gap-3 text-2xl text-yellow-300 mb-6">
            <DollarSign className="w-8 h-8" />
            <span className="font-semibold">Congratulations!</span>
            <DollarSign className="w-8 h-8" />
          </div>

          {/* Success message */}
          <p className="text-xl text-white/90 text-center">
            You've successfully closed the deal!
          </p>

          {/* Animated success bar */}
          <div className="mt-6 h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full animate-progressFill" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes balloonRise {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-120vh) translateX(${Math.random() > 0.5 ? '20px' : '-20px'});
            opacity: 0;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes progressFill {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        .animate-confettiFall {
          animation: confettiFall linear forwards;
        }

        .animate-balloonRise {
          animation: balloonRise ease-in forwards;
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .animate-scaleIn {
          animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-progressFill {
          animation: progressFill 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
