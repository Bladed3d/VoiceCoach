/**
 * VoiceCoach V2 - Liquid Grid Animation Component
 * Animated idle state display for AI Coaching Assistant panel
 * Adapted from liquid-grid-animation.html with VoiceCoach branding
 */
import React, { useEffect, useRef } from 'react';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

interface LiquidGridAnimationProps {
  className?: string;
  isActive?: boolean;
  onAnimationClick?: () => void;
}

export const LiquidGridAnimation: React.FC<LiquidGridAnimationProps> = ({ 
  className = '', 
  isActive = true,
  onAnimationClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const liquidGridRef = useRef<LiquidGrid | null>(null);
  const pinLightManagerRef = useRef<PinLightManager | null>(null);
  const [isAnimationStarted, setIsAnimationStarted] = React.useState(false);
  const [debugInfo, setDebugInfo] = React.useState('Initializing...');
  const trail = new BreadcrumbTrail('LiquidGridAnimation');
  
  // IMMEDIATE LED to test if component renders at all
  trail.light(7199, { 
    event: 'COMPONENT_MOUNT_TEST',
    isActive,
    className,
    timestamp: Date.now()
  });

  useEffect(() => {
    trail.light(7200, { 
      component: 'LiquidGridAnimation', 
      event: 'useEffect_triggered',
      containerReady: !!containerRef.current,
      isActive: isActive
    });
    
    if (!containerRef.current || !isActive) {
      trail.light(7201, { 
        event: 'early_exit',
        reason: !containerRef.current ? 'no_container' : 'not_active',
        containerRef: !!containerRef.current,
        isActive: isActive
      });
      setDebugInfo('Container not ready or not active');
      return;
    }

    trail.light(7202, { 
      event: 'starting_delay',
      delay_ms: 5000,
      container_dimensions: {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      }
    });
    setDebugInfo('Starting 5-second delay...');
    
    // 5-second delay before starting animation
    const startDelay = setTimeout(() => {
      trail.light(7203, { 
        event: 'delay_complete',
        initializing: 'animation_systems'
      });
      setDebugInfo('Initializing animation systems...');
      setIsAnimationStarted(true);
      
      if (containerRef.current) {
        trail.light(7204, { 
          event: 'creating_animation_instances',
          container_ready: true
        });
        
        // Initialize the animation systems
        liquidGridRef.current = new LiquidGrid(containerRef.current);
        pinLightManagerRef.current = new PinLightManager(containerRef.current);
        
        trail.light(7205, { 
          event: 'animation_systems_created',
          liquidGrid: !!liquidGridRef.current,
          pinLightManager: !!pinLightManagerRef.current
        });
        setDebugInfo('Animation systems active!');
      } else {
        trail.light(7206, { 
          event: 'container_lost',
          error: 'container_ref_became_null'
        });
      }
    }, 5000); // 5 second delay

    // Cleanup function
    return () => {
      trail.light(7207, { 
        event: 'cleanup_started',
        hadLiquidGrid: !!liquidGridRef.current,
        hadPinLightManager: !!pinLightManagerRef.current
      });
      
      clearTimeout(startDelay);
      if (liquidGridRef.current) {
        liquidGridRef.current.destroy();
        trail.light(7208, { event: 'liquidGrid_destroyed' });
      }
      if (pinLightManagerRef.current) {
        pinLightManagerRef.current.destroy();
        trail.light(7209, { event: 'pinLightManager_destroyed' });
      }
      setIsAnimationStarted(false);
      setDebugInfo('Cleaned up');
      trail.light(7210, { event: 'cleanup_complete' });
    };
  }, [isActive]);
  
  // Handle click to stop animation (only if already started)
  const handleClick = () => {
    if (isAnimationStarted) {
      trail.light(7211, { 
        event: 'animation_clicked_stopping',
        was_started: isAnimationStarted
      });
      console.log('Animation clicked - stopping');
      setIsAnimationStarted(false);
      if (liquidGridRef.current) {
        liquidGridRef.current.destroy();
        trail.light(7212, { event: 'liquidGrid_destroyed_by_click' });
      }
      if (pinLightManagerRef.current) {
        pinLightManagerRef.current.destroy();
        trail.light(7213, { event: 'pinLightManager_destroyed_by_click' });
      }
      if (onAnimationClick) {
        onAnimationClick();
      }
      trail.light(7214, { event: 'click_handler_complete' });
    } else {
      trail.light(7215, { 
        event: 'animation_clicked_but_not_started',
        was_started: isAnimationStarted
      });
      console.log('Animation not started yet, ignoring click');
    }
  };

  if (!isActive) return null;

  return (
    <div 
      ref={containerRef}
      className={`liquid-grid-container ${className}`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="liquid-grid" />
      
      {/* VoiceCoach V2 Branded Overlay */}
      <div className="content-overlay">
        <div className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
          <span className="text-white font-bold text-xl">VC</span>
        </div>
        <h2 className="text-2xl font-light text-white mb-2 tracking-wide">
          AI Coaching Assistant
        </h2>
        <p className="text-slate-400 text-sm opacity-70 tracking-wide">
          {isAnimationStarted ? 'Click anywhere to stop animation' : 'Starting animation in 5 seconds...'}
        </p>
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <p className="text-yellow-400 text-xs mt-2 opacity-60">
            Debug: {debugInfo}
          </p>
        )}
      </div>

      <style jsx>{`
        .liquid-grid-container {
          position: relative;
          width: 100%;
          height: 100%;
          background-color: rgba(15, 23, 42, 0.8); /* slate-900 with opacity */
          overflow: hidden;
          border-radius: 0.5rem;
          z-index: 1;
        }

        .liquid-grid {
          position: absolute;
          width: 100%;
          height: 100%;
          display: flex;
          flex-wrap: wrap;
          z-index: 2;
        }

        .content-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          z-index: 200;
          pointer-events: none;
        }

        /* VoiceCoach color scheme adaptations */
        :global(.grid-square) {
          width: 30px;
          height: 30px;
          border: 1px solid rgba(148, 163, 184, 0.1); /* slate-400 */
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.3);
        }

        :global(.liquid-fill) {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 0%;
          transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* VoiceCoach V2 Primary Colors */
        :global(.liquid-fill.primary) {
          background: linear-gradient(to top, 
            rgba(14, 165, 233, 0.9) 0%, 
            rgba(14, 165, 233, 0.7) 50%, 
            rgba(14, 165, 233, 0.5) 100%);
          box-shadow: inset 0 -2px 10px rgba(14, 165, 233, 0.5);
        }

        :global(.liquid-fill.success) {
          background: linear-gradient(to top, 
            rgba(34, 197, 94, 0.9) 0%, 
            rgba(34, 197, 94, 0.7) 50%, 
            rgba(34, 197, 94, 0.5) 100%);
          box-shadow: inset 0 -2px 10px rgba(34, 197, 94, 0.5);
        }

        :global(.liquid-fill.warning) {
          background: linear-gradient(to top, 
            rgba(245, 158, 11, 0.9) 0%, 
            rgba(245, 158, 11, 0.7) 50%, 
            rgba(245, 158, 11, 0.5) 100%);
          box-shadow: inset 0 -2px 10px rgba(245, 158, 11, 0.5);
        }

        :global(.liquid-fill.danger) {
          background: linear-gradient(to top, 
            rgba(239, 68, 68, 0.9) 0%, 
            rgba(239, 68, 68, 0.7) 50%, 
            rgba(239, 68, 68, 0.5) 100%);
          box-shadow: inset 0 -2px 10px rgba(239, 68, 68, 0.5);
        }

        /* Wave effect for enhanced squares */
        :global(.liquid-fill.has-wave::before) {
          content: '';
          position: absolute;
          top: -2px;
          left: -100%;
          width: 200%;
          height: 3px;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(255, 255, 255, 0.6), 
            transparent);
          animation: wave 2s linear infinite;
        }

        @keyframes wave {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        /* Animation cycles with VoiceCoach timing */
        @keyframes fillCycleSlow {
          0% { height: 0%; opacity: 0.8; }
          45% { height: 100%; opacity: 1; }
          50% { height: 100%; opacity: 1; filter: brightness(1.8); }
          55% { height: 100%; opacity: 1; filter: brightness(1); }
          100% { height: 0%; opacity: 0.8; }
        }

        @keyframes fillCycleMedium {
          0% { height: 0%; opacity: 0.8; }
          40% { height: 100%; opacity: 1; }
          50% { height: 100%; opacity: 1; filter: brightness(1.8); }
          60% { height: 100%; opacity: 1; filter: brightness(1); }
          100% { height: 0%; opacity: 0.8; }
        }

        @keyframes fillCycleFast {
          0% { height: 0%; opacity: 0.8; }
          35% { height: 100%; opacity: 1; }
          50% { height: 100%; opacity: 1; filter: brightness(2); }
          65% { height: 100%; opacity: 1; filter: brightness(1); }
          100% { height: 0%; opacity: 0.8; }
        }

        :global(.grid-square.animating-slow .liquid-fill) {
          animation: fillCycleSlow 3s ease-in-out;
        }

        :global(.grid-square.animating-medium .liquid-fill) {
          animation: fillCycleMedium 2s ease-in-out;
        }

        :global(.grid-square.animating-fast .liquid-fill) {
          animation: fillCycleFast 1.2s ease-in-out;
        }

        /* Enhanced glow effects for VoiceCoach colors */
        :global(.grid-square.animating-slow.primary .liquid-fill),
        :global(.grid-square.animating-medium.primary .liquid-fill),
        :global(.grid-square.animating-fast.primary .liquid-fill) {
          box-shadow: 0 0 15px rgba(14, 165, 233, 1), 
                      inset 0 0 8px rgba(14, 165, 233, 0.8);
        }

        :global(.grid-square.animating-slow.success .liquid-fill),
        :global(.grid-square.animating-medium.success .liquid-fill),
        :global(.grid-square.animating-fast.success .liquid-fill) {
          box-shadow: 0 0 15px rgba(34, 197, 94, 1), 
                      inset 0 0 8px rgba(34, 197, 94, 0.8);
        }

        /* Pin lights with VoiceCoach colors */
        :global(.pin-light) {
          position: absolute;
          width: 2px;
          height: 180px;
          bottom: -220px;
          pointer-events: none;
          z-index: 150;
        }

        :global(.pin-light::before) {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: linear-gradient(to top,
            transparent 0%,
            rgba(255, 255, 255, 0.05) 10%,
            rgba(255, 255, 255, 0.15) 30%,
            rgba(255, 255, 255, 0.4) 60%,
            rgba(255, 255, 255, 0.8) 85%,
            rgba(255, 255, 255, 1) 100%);
        }

        :global(.pin-light::after) {
          content: '';
          position: absolute;
          top: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 4px #fff, 0 0 8px #fff, 0 0 12px rgba(255, 255, 255, 0.5);
        }

        :global(.pin-light.primary::before) {
          background: linear-gradient(to top,
            transparent 0%,
            rgba(14, 165, 233, 0.05) 10%,
            rgba(14, 165, 233, 0.15) 30%,
            rgba(14, 165, 233, 0.4) 60%,
            rgba(14, 165, 233, 0.8) 85%,
            rgba(14, 165, 233, 1) 100%);
        }

        :global(.pin-light.primary::after) {
          background: #0ea5e9;
          box-shadow: 0 0 4px #0ea5e9, 0 0 8px #0ea5e9, 0 0 12px rgba(14, 165, 233, 0.5);
        }

        @keyframes pinLightStreak {
          0% { transform: translateY(0); opacity: 0; }
          5% { opacity: 0.8; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(calc(-100% - 300px)); opacity: 0; }
        }

        :global(.pin-light.animating) {
          animation: pinLightStreak linear forwards;
        }
      `}</style>
    </div>
  );
};

// Liquid Grid Animation System
class LiquidGrid {
  private container: HTMLElement;
  private squares: HTMLElement[] = [];
  private activeAnimations = new Set<string>();
  private maxConcurrentAnimations = 12; // Reduced for panel size
  private squareSize = 30; // Smaller for panel
  private colors = ['primary', 'success', 'warning', 'danger'];
  private speeds = ['slow', 'medium', 'fast'];
  private animationInterval?: number;

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  init() {
    const gridContainer = this.container.querySelector('.liquid-grid') as HTMLElement;
    if (!gridContainer) return;

    // Calculate grid dimensions based on container size
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    const cols = Math.floor(containerWidth / this.squareSize);
    const rows = Math.floor(containerHeight / this.squareSize);
    const totalSquares = cols * rows;

    // Create grid squares
    for (let i = 0; i < totalSquares; i++) {
      const square = document.createElement('div');
      square.className = 'grid-square';
      square.dataset.index = i.toString();
      
      const liquidFill = document.createElement('div');
      liquidFill.className = 'liquid-fill';
      square.appendChild(liquidFill);
      
      gridContainer.appendChild(square);
      this.squares.push(square);
    }

    // Start animation cycle
    this.startAnimationCycle();
  }

  getRandomSquare(): HTMLElement | null {
    const availableSquares = this.squares.filter(
      square => !this.activeAnimations.has(square.dataset.index!)
    );
    
    if (availableSquares.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * availableSquares.length);
    return availableSquares[randomIndex];
  }

  animateSquare(square: HTMLElement) {
    if (!square || this.activeAnimations.has(square.dataset.index!)) return;

    this.activeAnimations.add(square.dataset.index!);
    
    // Choose random color and speed
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    const speed = this.speeds[Math.floor(Math.random() * this.speeds.length)];
    
    // Get the liquid fill element
    const liquidFill = square.querySelector('.liquid-fill') as HTMLElement;
    
    // Add color class
    liquidFill.classList.add(color);
    square.classList.add(color);
    
    // 15% chance to have wave effect
    if (Math.random() < 0.15) {
      liquidFill.classList.add('has-wave');
    }
    
    // Add animation class based on speed
    square.classList.add(`animating-${speed}`);

    // Animation duration based on speed
    const durations: Record<string, number> = {
      'slow': 3000,
      'medium': 2000,
      'fast': 1200
    };
    const duration = durations[speed];

    // Remove animation class after animation completes
    setTimeout(() => {
      square.classList.remove(`animating-${speed}`, color);
      liquidFill.classList.remove(color, 'has-wave');
      this.activeAnimations.delete(square.dataset.index!);
    }, duration);
  }

  startAnimationCycle() {
    // Initial staggered animations
    for (let i = 0; i < Math.min(this.maxConcurrentAnimations, 8); i++) {
      setTimeout(() => {
        const square = this.getRandomSquare();
        if (square) this.animateSquare(square);
      }, i * 100 + Math.random() * 500);
    }

    // Continuous animation loop
    this.animationInterval = window.setInterval(() => {
      if (this.activeAnimations.size < this.maxConcurrentAnimations) {
        const numToStart = Math.min(
          2, // Start fewer at once for smoother animation
          this.maxConcurrentAnimations - this.activeAnimations.size
        );
        
        for (let i = 0; i < numToStart; i++) {
          setTimeout(() => {
            const square = this.getRandomSquare();
            if (square) this.animateSquare(square);
          }, i * 100 + Math.random() * 300);
        }
      }
    }, 400); // Slower pace for professional feel
  }

  destroy() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
    
    // Clean up DOM elements
    const gridContainer = this.container.querySelector('.liquid-grid');
    if (gridContainer) {
      gridContainer.innerHTML = '';
    }
  }
}

// Pin Light Manager
class PinLightManager {
  private container: HTMLElement;
  private colors = ['white', 'primary'];
  private activeLights = new Set<HTMLElement>();
  private maxConcurrentLights = 6; // Reduced for panel size
  private squareSize = 30;
  private gridLinePositions: number[] = [];
  private spawnInterval?: number;
  private trail: BreadcrumbTrail;

  constructor(container: HTMLElement) {
    this.container = container;
    this.trail = new BreadcrumbTrail('PinLightManager');
    this.trail.light(7240, { 
      event: 'PinLightManager_constructor',
      container_width: container.clientWidth,
      container_height: container.clientHeight
    });
    this.init();
  }

  init() {
    // Calculate grid line positions
    const containerWidth = this.container.clientWidth;
    for (let x = 0; x <= containerWidth; x += this.squareSize) {
      this.gridLinePositions.push(x);
    }
    
    // Start spawning pin lights
    this.spawnLight();
    
    // Continuous spawning
    this.spawnInterval = window.setInterval(() => {
      if (this.activeLights.size < this.maxConcurrentLights) {
        const spawnCount = Math.random() < 0.3 ? 1 : 1; // Single lights for cleaner look
        this.spawnLight();
      }
    }, 800 + Math.random() * 1200); // Slower, more elegant
  }

  spawnLight() {
    const light = document.createElement('div');
    light.className = 'pin-light';
    
    // Random color (favor primary for branding)
    const color = Math.random() < 0.7 ? 'primary' : 'white';
    if (color !== 'white') {
      light.classList.add(color);
    }
    
    // Position on a random grid line
    const gridLineIndex = Math.floor(Math.random() * this.gridLinePositions.length);
    const xPosition = this.gridLinePositions[gridLineIndex];
    light.style.left = `${xPosition - 1}px`;
    
    // Animation duration
    const duration = 2 + Math.random() * 1.5; // 2-3.5s
    light.style.animationDuration = `${duration}s`;
    
    // Add to container and track
    this.container.appendChild(light);
    this.activeLights.add(light);
    light.classList.add('animating');
    
    // Remove after animation
    setTimeout(() => {
      if (light.parentNode) {
        light.remove();
      }
      this.activeLights.delete(light);
    }, duration * 1000);
  }

  destroy() {
    if (this.spawnInterval) {
      clearInterval(this.spawnInterval);
    }
    
    // Clean up active lights
    this.activeLights.forEach(light => {
      if (light.parentNode) {
        light.remove();
      }
    });
    this.activeLights.clear();
  }
}