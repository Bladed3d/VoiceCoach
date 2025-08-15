'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Activity, DailySchedule, LightwalkerState } from '@/types/daily-use';
import { 
  Clock, 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Target,
  MapPin,
  Zap,
  CheckCircle2,
  Circle,
  MoreHorizontal
} from 'lucide-react';

// Enhanced Timeline Interface Component
// Implements the magnetic smart navigation system with energy flow visualization
// and immersive depth design as specified in the design specifications

interface TimelineInterfaceProps {
  schedule: DailySchedule;
  lightwalkerState: LightwalkerState;
  currentTime: Date;
  onActivityComplete: (activityId: string) => void;
  onActivitySelect: (activity: Activity) => void;
  onTimeNavigate?: (time: Date) => void;
  className?: string;
}

interface EnhancedActivity extends Activity {
  energyInput: number;
  energyOutput: number;
  flowMultiplier: number;
}

interface EnergyParticle {
  id: string;
  x: number;
  y: number;
  velocity: { x: number; y: number };
  color: string;
  opacity: number;
  size: number;
  lifetime: number;
  sourceActivity: string;
  targetActivity: string;
}

interface TimelineViewport {
  centerTime: Date;
  zoomLevel: number; // 1 = hour view, 2 = 30-min, 3 = 15-min, 4 = 5-min
  isDragging: boolean;
  dragStartX: number;
  dragStartTime: Date;
  momentum: number;
}

// Physics constants for magnetic navigation
const PHYSICS_CONFIG = {
  FRICTION: 0.92,
  MAGNETIC_STRENGTH: 0.8,
  SNAP_THRESHOLD: 30, // pixels
  MOMENTUM_THRESHOLD: 0.5,
  DECELERATION_RATE: 0.95
};

// Animation configuration
const ANIMATION_CONFIG = {
  DURATION_FAST: 200,
  DURATION_NORMAL: 400,
  DURATION_SLOW: 800,
  EASING_OUT_QUART: 'cubic-bezier(0.25, 1, 0.5, 1)',
  EASING_OUT_EXPO: 'cubic-bezier(0.19, 1, 0.22, 1)',
  EASING_OUT_BACK: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
};

// Timeline zoom levels and their display properties
const ZOOM_LEVELS = {
  1: { minutes: 240, label: '4 hours', majorTicks: 60, minorTicks: 15 },
  2: { minutes: 120, label: '2 hours', majorTicks: 30, minorTicks: 10 },
  3: { minutes: 60, label: '1 hour', majorTicks: 15, minorTicks: 5 },
  4: { minutes: 30, label: '30 minutes', majorTicks: 10, minorTicks: 2 },
  5: { minutes: 15, label: '15 minutes', majorTicks: 5, minorTicks: 1 }
};

export default function TimelineInterface({
  schedule,
  lightwalkerState,
  currentTime,
  onActivityComplete,
  onActivitySelect,
  onTimeNavigate,
  className = ''
}: TimelineInterfaceProps) {
  
  // Core timeline state
  const [viewport, setViewport] = useState<TimelineViewport>({
    centerTime: currentTime,
    zoomLevel: 2,
    isDragging: false,
    dragStartX: 0,
    dragStartTime: currentTime,
    momentum: 0
  });

  // Animation state
  const [animatingToTime, setAnimatingToTime] = useState<Date | null>(null);
  const [particles, setParticles] = useState<EnergyParticle[]>([]);
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  // Refs for DOM manipulation and physics
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const momentumRef = useRef<number>(0);
  const lastDragTime = useRef<number>(0);

  // Enhanced activities with energy flow data
  const enhancedActivities: EnhancedActivity[] = useMemo(() => {
    return schedule.activities.map((activity, index) => ({
      ...activity,
      energyInput: calculateEnergyInput(activity),
      energyOutput: calculateEnergyOutput(activity),
      flowMultiplier: calculateFlowMultiplier(activity, schedule.activities, index)
    }));
  }, [schedule.activities]);

  // Current timeline configuration based on zoom level
  const timelineConfig = ZOOM_LEVELS[viewport.zoomLevel as keyof typeof ZOOM_LEVELS];
  const pixelsPerMinute = 800 / timelineConfig.minutes; // 800px viewport width

  // ========================================
  // UTILITY FUNCTIONS - Using function declarations to avoid temporal dead zone
  // ========================================

  function calculateEnergyInput(activity: Activity): number {
    // Mock energy calculation based on difficulty and time of day
    const baseEnergy = activity.difficulty * 10;
    const timeBonus = activity.timeOfDay === 'morning' ? 1.2 : 
                     activity.timeOfDay === 'afternoon' ? 1.0 : 0.8;
    return Math.round(baseEnergy * timeBonus);
  }

  function calculateEnergyOutput(activity: Activity): number {
    // Mock energy output calculation
    const baseOutput = activity.points * 1.5;
    const categoryMultiplier = {
      'mindfulness': 1.3,
      'physical': 1.4,
      'creative': 1.2,
      'decision-making': 1.1,
      'communication': 1.2,
      'reflection': 1.0
    }[activity.category] || 1.0;
    return Math.round(baseOutput * categoryMultiplier);
  }

  function calculateFlowMultiplier(activity: Activity, activities: Activity[], index: number): number {
    // Calculate flow bonus based on optimal activity sequencing
    if (index === 0) return 1.0;
    
    const prevActivity = activities[index - 1];
    const optimalSequences = {
      'mindfulness': ['decision-making', 'communication'],
      'physical': ['mindfulness', 'reflection'],
      'decision-making': ['physical', 'creative'],
      'creative': ['mindfulness', 'reflection'],
      'communication': ['decision-making'],
      'reflection': ['mindfulness']
    };

    const optimal = optimalSequences[prevActivity?.category as keyof typeof optimalSequences] || [];
    return optimal.includes(activity.category) ? 1.2 : 1.0;
  }

  const timeToPixels = (time: Date): number => {
    const timeDiff = time.getTime() - viewport.centerTime.getTime();
    const minutes = timeDiff / (1000 * 60);
    return minutes * pixelsPerMinute;
  };

  const pixelsToTime = (pixels: number): Date => {
    const minutes = pixels / pixelsPerMinute;
    return new Date(viewport.centerTime.getTime() + minutes * 60 * 1000);
  };

  const getActivityTimeInMinutes = (activity: Activity): number => {
    if (!activity.scheduledTime) return 0;
    const [hours, minutes] = activity.scheduledTime.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const findNearestSnapPoint = (targetTime: Date): Date => {
    const targetMinutes = targetTime.getHours() * 60 + targetTime.getMinutes();
    const snapInterval = timelineConfig.minorTicks;
    const snappedMinutes = Math.round(targetMinutes / snapInterval) * snapInterval;
    
    const snappedTime = new Date(targetTime);
    snappedTime.setHours(Math.floor(snappedMinutes / 60));
    snappedTime.setMinutes(snappedMinutes % 60);
    snappedTime.setSeconds(0);
    snappedTime.setMilliseconds(0);
    
    return snappedTime;
  };

  // ========================================
  // MAGNETIC NAVIGATION SYSTEM
  // ========================================

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    setViewport(prev => ({
      ...prev,
      isDragging: true,
      dragStartX: clientX,
      dragStartTime: prev.centerTime
    }));
    
    momentumRef.current = 0;
    lastDragTime.current = Date.now();
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!viewport.isDragging) return;
    
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - viewport.dragStartX;
    const deltaTime = -deltaX / pixelsPerMinute * 60 * 1000; // Convert pixels to milliseconds
    
    const newCenterTime = new Date(viewport.dragStartTime.getTime() + deltaTime);
    
    // Calculate momentum for physics-based deceleration
    const now = Date.now();
    const timeDelta = now - lastDragTime.current;
    if (timeDelta > 0) {
      momentumRef.current = deltaX / timeDelta;
    }
    lastDragTime.current = now;
    
    setViewport(prev => ({
      ...prev,
      centerTime: newCenterTime
    }));
  }, [viewport.isDragging, viewport.dragStartX, viewport.dragStartTime, pixelsPerMinute]);

  const handleDragEnd = useCallback(() => {
    if (!viewport.isDragging) return;
    
    setViewport(prev => ({
      ...prev,
      isDragging: false
    }));
    
    // Apply momentum-based deceleration with magnetic snapping
    let currentMomentum = Math.abs(momentumRef.current);
    let currentTime = viewport.centerTime;
    
    if (currentMomentum > PHYSICS_CONFIG.MOMENTUM_THRESHOLD) {
      const animate = () => {
        currentMomentum *= PHYSICS_CONFIG.DECELERATION_RATE;
        
        if (currentMomentum > 0.1) {
          const direction = momentumRef.current > 0 ? 1 : -1;
          const deltaTime = direction * currentMomentum * 60000; // Convert to milliseconds
          currentTime = new Date(currentTime.getTime() + deltaTime);
          
          setViewport(prev => ({
            ...prev,
            centerTime: currentTime
          }));
          
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Apply magnetic snapping when momentum stops
          const snappedTime = findNearestSnapPoint(currentTime);
          smoothScrollToTime(snappedTime);
        }
      };
      
      animate();
    } else {
      // Immediate snap for low momentum
      const snappedTime = findNearestSnapPoint(viewport.centerTime);
      if (Math.abs(snappedTime.getTime() - viewport.centerTime.getTime()) < 30000) { // 30 seconds
        smoothScrollToTime(snappedTime);
      }
    }
  }, [viewport.isDragging, viewport.centerTime]);

  const smoothScrollToTime = useCallback((targetTime: Date, duration: number = ANIMATION_CONFIG.DURATION_SLOW) => {
    const startTime = viewport.centerTime;
    const startTimestamp = Date.now();
    setAnimatingToTime(targetTime);
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out-expo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentTime = new Date(
        startTime.getTime() + (targetTime.getTime() - startTime.getTime()) * easeProgress
      );
      
      setViewport(prev => ({
        ...prev,
        centerTime: currentTime
      }));
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setAnimatingToTime(null);
        if (onTimeNavigate) {
          onTimeNavigate(targetTime);
        }
      }
    };
    
    animate();
  }, [viewport.centerTime, onTimeNavigate]);

  // ========================================
  // CONTROL HANDLERS
  // ========================================

  const jumpToNow = useCallback(() => {
    smoothScrollToTime(currentTime);
  }, [currentTime, smoothScrollToTime]);

  const changeZoom = useCallback((delta: number) => {
    const newZoomLevel = Math.max(1, Math.min(5, viewport.zoomLevel + delta));
    setViewport(prev => ({
      ...prev,
      zoomLevel: newZoomLevel
    }));
  }, [viewport.zoomLevel]);

  const navigateTime = useCallback((minutes: number) => {
    const newTime = new Date(viewport.centerTime.getTime() + minutes * 60000);
    smoothScrollToTime(newTime);
  }, [viewport.centerTime, smoothScrollToTime]);

  // ========================================
  // ACTIVITY INTERACTION HANDLERS
  // ========================================

  const handleActivityClick = useCallback((activity: Activity) => {
    setSelectedActivity(activity.id);
    onActivitySelect(activity);
    
    // Center timeline on activity time
    if (activity.scheduledTime) {
      const [hours, minutes] = activity.scheduledTime.split(':').map(Number);
      const activityTime = new Date(currentTime);
      activityTime.setHours(hours, minutes, 0, 0);
      smoothScrollToTime(activityTime);
    }
  }, [onActivitySelect, currentTime, smoothScrollToTime]);

  const handleActivityComplete = useCallback((activityId: string) => {
    onActivityComplete(activityId);
    // Add completion animation particles
    createCompletionParticles(activityId);
  }, [onActivityComplete]);

  // ========================================
  // ENERGY FLOW & PARTICLE SYSTEM
  // ========================================

  const createCompletionParticles = useCallback((activityId: string) => {
    const activity = enhancedActivities.find(a => a.id === activityId);
    if (!activity) return;
    
    const newParticles: EnergyParticle[] = [];
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: `${activityId}-${i}-${Date.now()}`,
        x: Math.random() * 100, // Percentage of container width
        y: 50 + Math.random() * 20, // Center area
        velocity: {
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 2
        },
        color: activity.roleModelColor,
        opacity: 0.8,
        size: 2 + Math.random() * 4,
        lifetime: 1000 + Math.random() * 500,
        sourceActivity: activityId,
        targetActivity: ''
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
    
    // Remove particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !p.id.startsWith(activityId)));
    }, 2000);
  }, [enhancedActivities]);

  // ========================================
  // KEYBOARD NAVIGATION
  // ========================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't handle keys when user is typing
      }
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigateTime(-15);
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateTime(15);
          break;
        case 'Home':
          e.preventDefault();
          jumpToNow();
          break;
        case '=':
        case '+':
          e.preventDefault();
          changeZoom(1);
          break;
        case '-':
          e.preventDefault();
          changeZoom(-1);
          break;
        case ' ':
          e.preventDefault();
          // Toggle current activity
          const currentActivity = enhancedActivities.find(a => 
            !a.isCompleted && a.scheduledTime && 
            Math.abs(getActivityTimeInMinutes(a) - (currentTime.getHours() * 60 + currentTime.getMinutes())) <= 30
          );
          if (currentActivity) {
            handleActivityComplete(currentActivity.id);
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateTime, jumpToNow, changeZoom, enhancedActivities, currentTime, handleActivityComplete]);

  // ========================================
  // RENDER TIMELINE COMPONENTS
  // ========================================

  const renderTimeGrid = () => {
    const startTime = new Date(viewport.centerTime.getTime() - (timelineConfig.minutes / 2) * 60000);
    const endTime = new Date(viewport.centerTime.getTime() + (timelineConfig.minutes / 2) * 60000);
    
    const timeMarkers = [];
    let currentMarker = new Date(startTime);
    currentMarker.setMinutes(Math.floor(currentMarker.getMinutes() / timelineConfig.minorTicks) * timelineConfig.minorTicks);
    
    while (currentMarker <= endTime) {
      const x = timeToPixels(currentMarker) + 400; // Center offset
      const isMajor = currentMarker.getMinutes() % timelineConfig.majorTicks === 0;
      
      timeMarkers.push(
        <div
          key={currentMarker.getTime()}
          className={`absolute top-0 bottom-0 ${
            isMajor ? 'border-l-2 border-slate-600' : 'border-l border-slate-700'
          }`}
          style={{ left: `${x}px` }}
        >
          {isMajor && (
            <div className="absolute -top-6 left-1 text-xs text-slate-400 font-medium">
              {currentMarker.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      );
      
      currentMarker = new Date(currentMarker.getTime() + timelineConfig.minorTicks * 60000);
    }
    
    return timeMarkers;
  };

  const renderCurrentTimeIndicator = () => {
    const x = timeToPixels(currentTime) + 400;
    
    return (
      <div
        className="absolute top-0 bottom-0 z-30 pointer-events-none"
        style={{ left: `${x}px` }}
      >
        <div className="relative h-full">
          <div className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-lg shadow-cyan-400/50">
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50" />
          </div>
          <div className="absolute -top-8 -left-8 px-2 py-1 bg-cyan-500 text-white text-xs font-bold rounded shadow-lg">
            NOW
          </div>
        </div>
      </div>
    );
  };

  const renderActivityCards = () => {
    return enhancedActivities.map((activity) => {
      if (!activity.scheduledTime) return null;
      
      const [hours, minutes] = activity.scheduledTime.split(':').map(Number);
      const activityTime = new Date(currentTime);
      activityTime.setHours(hours, minutes, 0, 0);
      
      const x = timeToPixels(activityTime) + 400;
      const isCurrentActivity = selectedActivity === activity.id || 
        (lightwalkerState.currentActivity?.id === activity.id);
      const isHovered = hoveredActivity === activity.id;
      const isCompleted = activity.isCompleted;
      
      // Calculate card styling based on state
      let cardClasses = `absolute top-8 w-40 h-20 rounded-xl border-2 transition-all duration-300 cursor-pointer transform`;
      let shadowClasses = '';
      let zIndex = 10;
      
      if (isCompleted) {
        cardClasses += ' bg-green-800/80 border-green-500 text-green-100';
        shadowClasses = 'shadow-lg shadow-green-500/20';
        zIndex = 5;
      } else if (isCurrentActivity) {
        cardClasses += ` bg-gradient-to-br from-blue-600 to-purple-600 border-blue-400 text-white scale-105`;
        shadowClasses = 'shadow-xl shadow-blue-500/40';
        zIndex = 20;
      } else if (isHovered) {
        cardClasses += ' bg-slate-700 border-slate-500 text-white scale-102';
        shadowClasses = 'shadow-lg shadow-slate-500/20';
        zIndex = 15;
      } else {
        cardClasses += ' bg-slate-800/80 border-slate-600 text-slate-300';
        shadowClasses = 'shadow-md shadow-black/20';
      }
      
      return (
        <div
          key={activity.id}
          className={`${cardClasses} ${shadowClasses}`}
          style={{ 
            left: `${x - 80}px`,
            zIndex
          }}
          onMouseEnter={() => setHoveredActivity(activity.id)}
          onMouseLeave={() => setHoveredActivity(null)}
          onClick={() => handleActivityClick(activity)}
        >
          {/* Activity Card Content */}
          <div className="p-3 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {activity.title}
                </div>
                <div className="text-xs opacity-75 truncate">
                  {activity.scheduledTime} • {activity.duration}
                </div>
              </div>
              <div className="ml-2 flex-shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <Circle className="w-4 h-4 opacity-60" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3 opacity-60" />
                <span className="text-xs">{activity.points} pts</span>
              </div>
              <div 
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: activity.roleModelColor }}
              />
            </div>
          </div>
          
          {/* Energy Flow Indicator */}
          {!isCompleted && activity.flowMultiplier > 1 && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <Zap className="w-3 h-3 text-yellow-900" />
            </div>
          )}
          
          {/* Hover Tooltip */}
          {isHovered && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 p-3 bg-slate-900 border border-slate-600 rounded-lg shadow-xl z-50 w-64">
              <div className="text-sm font-medium text-white mb-2">{activity.title}</div>
              <div className="text-xs text-slate-300 mb-2">{activity.description}</div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Energy: +{activity.energyOutput}</span>
                <span>Difficulty: {activity.difficulty}/9</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Role Model: {activity.roleModel}
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  const renderEnergyFlowParticles = () => {
    return particles.map((particle) => (
      <div
        key={particle.id}
        className="absolute w-1 h-1 rounded-full pointer-events-none animate-pulse"
        style={{
          left: `${particle.x}%`,
          top: `${particle.y}%`,
          backgroundColor: particle.color,
          opacity: particle.opacity,
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          animation: `float ${particle.lifetime}ms ease-out forwards`
        }}
      />
    ));
  };

  // ========================================
  // MAIN RENDER
  // ========================================

  return (
    <div className={`timeline-interface ${className}`}>
      {/* Timeline Controls */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-400" />
            Enhanced Timeline
          </h3>
          <div className="text-sm text-slate-400">
            {timelineConfig.label} view
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Navigation Controls */}
          <button
            onClick={() => navigateTime(-30)}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Go back 30 minutes"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={jumpToNow}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-cyan-600/20"
            title="Jump to current time"
          >
            NOW
          </button>
          
          <button
            onClick={() => navigateTime(30)}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Go forward 30 minutes"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          {/* Zoom Controls */}
          <div className="border-l border-slate-600 pl-2 ml-2">
            <button
              onClick={() => changeZoom(1)}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors mr-1"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => changeZoom(-1)}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Timeline Container */}
      <div className="relative bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
        <div
          ref={timelineRef}
          className="relative h-32 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          style={{
            background: `linear-gradient(135deg, 
              ${viewport.zoomLevel > 3 ? '#1e293b' : '#0f172a'} 0%, 
              ${viewport.zoomLevel > 3 ? '#334155' : '#1e293b'} 100%)`
          }}
        >
          {/* Background Time Grid */}
          <div className="absolute inset-0 z-0">
            {renderTimeGrid()}
          </div>
          
          {/* Energy Flow Particles */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {renderEnergyFlowParticles()}
          </div>
          
          {/* Activity Cards */}
          <div className="absolute inset-0 z-20">
            {renderActivityCards()}
          </div>
          
          {/* Current Time Indicator */}
          {renderCurrentTimeIndicator()}
          
          {/* Magnetic Snap Ghost Indicator */}
          {viewport.isDragging && (
            <div className="absolute inset-0 z-40 pointer-events-none">
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-blue-500/80 text-white text-sm rounded-lg shadow-lg">
                {viewport.centerTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}
        </div>
        
        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-t border-slate-700">
          <div className="flex items-center space-x-4 text-sm text-slate-400">
            <span>
              Center: {viewport.centerTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>•</span>
            <span>
              Activities: {enhancedActivities.length}
            </span>
            <span>•</span>
            <span>
              Completed: {enhancedActivities.filter(a => a.isCompleted).length}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>Drag to scroll</span>
            <span>•</span>
            <span>Click NOW to center</span>
            <span>•</span>
            <span>Use ± to zoom</span>
          </div>
        </div>
      </div>

      {/* Timeline Legend */}
      <div className="mt-4 flex items-center justify-center space-x-6 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-slate-800 border border-slate-600 rounded" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded" />
          <span>Active</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-800 border border-green-500 rounded" />
          <span>Completed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-0.5 h-4 bg-cyan-400" />
          <span>Current Time</span>
        </div>
        <div className="flex items-center space-x-2">
          <Zap className="w-3 h-3 text-yellow-500" />
          <span>Flow Bonus</span>
        </div>
      </div>

      {/* Custom Styles for Animations */}
      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0px);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-20px);
            opacity: 1;
          }
          100% {
            transform: translateY(-40px);
            opacity: 0;
          }
        }
        
        .timeline-interface .cursor-grab:active {
          cursor: grabbing !important;
        }
        
        .scale-102 {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}