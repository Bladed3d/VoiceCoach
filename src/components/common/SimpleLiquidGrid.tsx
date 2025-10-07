/**
 * VoiceCoach V2 - Simplified Liquid Grid Animation
 * Rebuilt for reliability with pure CSS and minimal JavaScript
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

interface SimpleLiquidGridProps {
  className?: string;
  isActive?: boolean;
}

export const SimpleLiquidGrid: React.FC<SimpleLiquidGridProps> = ({ 
  className = '', 
  isActive = true 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  const trail = new BreadcrumbTrail('SimpleLiquidGrid');

  // Grid generation function that can be called on resize
  const createGrid = useCallback(() => {
    if (!containerRef.current || !isActive) return { activeSquares: [], cleanup: () => {} };

    const container = containerRef.current;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Clear existing intervals
    intervalsRef.current.forEach(interval => clearInterval(interval));
    intervalsRef.current = [];

    console.log('SimpleLiquidGrid: Creating responsive grid');
    
    // Responsive grid creation - calculate optimal size for container
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate optimal grid size based on container dimensions
    const targetCols = Math.max(8, Math.floor(containerWidth / 45)); // At least 8 columns
    const targetRows = Math.max(6, Math.floor(containerHeight / 45)); // At least 6 rows
    
    const gridSize = Math.min(
      Math.floor(containerWidth / targetCols) - 3, // Leave 3px spacing
      Math.floor(containerHeight / targetRows) - 3
    );
    
    const spacing = gridSize + 4; // Consistent 4px spacing
    const actualCols = Math.floor(containerWidth / spacing);
    const actualRows = Math.floor(containerHeight / spacing);
    
    console.log(`Creating ${actualCols}x${actualRows} responsive grid (${gridSize}px squares) for ${containerWidth}x${containerHeight}`);
    const colors = [
      'rgba(14, 165, 233, 0.8)', // primary blue
      'rgba(34, 197, 94, 0.8)',  // success green  
      'rgba(245, 158, 11, 0.8)', // warning orange
      'rgba(239, 68, 68, 0.8)',  // danger red
      'rgba(168, 85, 247, 0.8)', // purple
      'rgba(236, 72, 153, 0.8)'  // pink
    ];
    
    const activeSquares = [];
    
    // Create grid squares
    for (let row = 0; row < actualRows; row++) {
      for (let col = 0; col < actualCols; col++) {
        const square = document.createElement('div');
        square.style.cssText = `
          position: absolute;
          left: ${col * spacing}px;
          top: ${row * spacing}px;
          width: ${gridSize}px;
          height: ${gridSize}px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          overflow: hidden;
          background: rgba(0, 0, 0, 0.2);
        `;
        
        const fill = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        fill.style.cssText = `
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 0%;
          background: linear-gradient(to top, ${color}, ${color.replace('0.8', '0.4')});
          transition: height 0.8s ease;
          box-shadow: 0 0 15px ${color};
        `;
        
        square.appendChild(fill);
        container.appendChild(square);
        activeSquares.push({ square, fill, color });
      }
    }
    
    
    // Create pin lights more frequently - 2x as many streaks
    const pinLightInterval = setInterval(() => {
      // Higher probability and more frequent spawning
      if (Math.random() < 0.8) createPinLightWithAnimation();
      // Sometimes spawn two at once
      if (Math.random() < 0.3) {
        setTimeout(() => createPinLightWithAnimation(), 200 + Math.random() * 400);
      }
    }, 800 + Math.random() * 1000); // Faster interval
    
    // Store interval for cleanup
    intervalsRef.current.push(pinLightInterval);

    // Add CSS animation for pin lights - contained within bounds with unique ID
    const animationId = `pinStreak_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const style = document.createElement('style');
    style.id = animationId;
    style.textContent = `
      @keyframes ${animationId} {
        0% { transform: translateY(0); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-${container.clientHeight + 50}px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    // Update pin light animation to use unique name
    const createPinLightWithAnimation = () => {
      const pinLight = document.createElement('div');
      const gridLineOptions = [];
      
      for (let col = 0; col <= actualCols; col++) {
        if (col === 0) {
          gridLineOptions.push(0);
        } else {
          gridLineOptions.push(col * spacing - (spacing - gridSize) / 2);
        }
      }
      
      const xPos = gridLineOptions[Math.floor(Math.random() * gridLineOptions.length)];
      pinLight.style.cssText = `
        position: absolute;
        left: ${xPos}px;
        bottom: -50px;
        width: 2px;
        height: 100px;
        background: linear-gradient(to top, 
          transparent, 
          rgba(255, 255, 255, 0.2),
          rgba(14, 165, 233, 0.8),
          #00D4FF);
        animation: ${animationId} 2s linear forwards;
        pointer-events: none;
        z-index: 1;
      `;
      
      const dot = document.createElement('div');
      dot.style.cssText = `
        position: absolute;
        top: -3px;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 4px;
        background: #00D4FF;
        border-radius: 50%;
        box-shadow: 0 0 8px #00D4FF;
      `;
      pinLight.appendChild(dot);
      
      container.appendChild(pinLight);
      
      setTimeout(() => {
        if (pinLight.parentNode) pinLight.remove();
      }, 2000);
    };

    // Return grid data and cleanup function
    return {
      activeSquares,
      cleanup: () => {
        intervalsRef.current.forEach(interval => clearInterval(interval));
        intervalsRef.current = [];
        if (style.parentNode) {
          style.remove();
        }
      }
    };
  }, [isActive]);

  // Main effect that handles grid creation and resize listening
  useEffect(() => {
    if (!containerRef.current || !isActive) return;

    let gridData = createGrid();
    let currentlyVisible = 0;
    const minBoxes = 6;
    const maxBoxes = 50;

    // Enhanced animation with min/max constraints
    const animateRandomSquares = () => {
      if (!gridData.activeSquares.length) return;
      
      // Calculate how many boxes to show based on current count
      let targetVisible;
      if (currentlyVisible < minBoxes) {
        // Force minimum boxes
        targetVisible = minBoxes + Math.floor(Math.random() * 10);
      } else if (currentlyVisible > maxBoxes) {
        // Don't add more, let some drain
        targetVisible = Math.max(minBoxes, currentlyVisible - Math.floor(Math.random() * 20));
      } else {
        // Normal operation - random between 6-50
        targetVisible = Math.min(maxBoxes, Math.max(minBoxes, 
          currentlyVisible + Math.floor(Math.random() * 20) - 10));
      }
      
      const numToActivate = Math.max(0, targetVisible - currentlyVisible);
      const selectedSquares = [];
      
      // Activate new squares
      for (let i = 0; i < numToActivate; i++) {
        const availableSquares = gridData.activeSquares.filter(sq => sq.fill.style.height === '0%' || !sq.fill.style.height);
        if (availableSquares.length === 0) break;
        
        const randomSquare = availableSquares[Math.floor(Math.random() * availableSquares.length)];
        if (!selectedSquares.includes(randomSquare)) {
          selectedSquares.push(randomSquare);
          
          // Add individual random delay for each square
          setTimeout(() => {
            randomSquare.fill.style.height = '100%';
            currentlyVisible++;
            
            // Random duration visible (3-8 seconds)
            setTimeout(() => {
              randomSquare.fill.style.height = '0%';
              currentlyVisible--;
            }, 3000 + Math.random() * 5000);
          }, Math.random() * 2000); // Random delay up to 2 seconds
        }
      }
      
      // Schedule next animation cycle
      const timeoutId = setTimeout(animateRandomSquares, 1000 + Math.random() * 2000);
      intervalsRef.current.push(timeoutId as any);
    };

    // Start animations after a delay
    const startTimeout = setTimeout(animateRandomSquares, 2000);
    intervalsRef.current.push(startTimeout as any);

    // Resize handler that debounces grid recreation
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (containerRef.current && isActive) {
          // Clean up current grid
          gridData.cleanup();
          currentlyVisible = 0;

          // Recreate grid with new dimensions
          gridData = createGrid();

          // Restart animation cycle
          const restartTimeout = setTimeout(animateRandomSquares, 500);
          intervalsRef.current.push(restartTimeout as any);

          trail.light(7216, {
            event: 'grid_recreated_on_resize',
            newWidth: containerRef.current?.clientWidth,
            newHeight: containerRef.current?.clientHeight
          });
          console.log('SimpleLiquidGrid: Grid recreated on resize');
        }
      }, 150); // 150ms debounce
    };

    // Use ResizeObserver to detect panel width changes (not just window resize)
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef.current) {
          handleResize();
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup function
    return () => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimeout);
      gridData.cleanup();
      
      // Force cleanup of container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        // Remove any dynamically added styles
        const styles = document.querySelectorAll(`style[id*="pinStreak_"]`);
        styles.forEach(style => style.remove());
      }
    };
  }, [isActive, createGrid]);

  if (!isActive) return null;

  return (
    <div className={`relative w-full h-full ${className} overflow-hidden rounded-lg`}>
      {/* Grid Container */}
      <div 
        ref={containerRef}
        className="absolute inset-1 overflow-hidden rounded-lg"
        style={{
          background: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '0.5rem'
        }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <span className="text-white font-bold text-xl">VC</span>
          </div>
          <h2 className="text-2xl font-light text-white mb-2 tracking-wide">
            AI Coaching Assistant
          </h2>
          <p className="text-slate-400 text-sm opacity-70">
            Start recording to receive real-time coaching insights
          </p>
        </div>
      </div>
    </div>
  );
};