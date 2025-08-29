/**
 * VoiceCoach V2 - Resizable Panels Hook
 * Manages 3-panel layout with collapsible/resizable functionality
 */
import { useState, useCallback, useEffect } from 'react';
import { PanelState } from '../types/coaching';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface ResizablePanelsConfig {
  coaching: {
    minWidth: number;
    defaultWidth: number;
  };
  script: {
    minWidth: number;
    maxWidth: number;
    defaultWidth: number;
    collapsedWidth: number;
  };
  transcription: {
    minWidth: number;
    maxWidth: number;
    defaultWidth: number;
    collapsedWidth: number;
  };
}

// Responsive panel configurations for different screen sizes
const SMALL_SCREEN_CONFIG: ResizablePanelsConfig = {
  coaching: {
    minWidth: 200,
    defaultWidth: 300,
  },
  script: {
    minWidth: 180,
    maxWidth: 350,
    defaultWidth: 220,
    collapsedWidth: 40,
  },
  transcription: {
    minWidth: 150,
    maxWidth: 280,
    defaultWidth: 200,
    collapsedWidth: 40,
  },
};

const MEDIUM_SCREEN_CONFIG: ResizablePanelsConfig = {
  coaching: {
    minWidth: 250,
    defaultWidth: 380,
  },
  script: {
    minWidth: 220,
    maxWidth: 400,
    defaultWidth: 260,
    collapsedWidth: 44,
  },
  transcription: {
    minWidth: 180,
    maxWidth: 340,
    defaultWidth: 240,
    collapsedWidth: 44,
  },
};

const DEFAULT_CONFIG: ResizablePanelsConfig = {
  coaching: {
    minWidth: 300,
    defaultWidth: 450,
  },
  script: {
    minWidth: 250,
    maxWidth: 500,
    defaultWidth: 300,
    collapsedWidth: 48,
  },
  transcription: {
    minWidth: 200,
    maxWidth: 400,
    defaultWidth: 280,
    collapsedWidth: 48,
  },
};

// Get responsive configuration based on viewport width
const getResponsiveConfig = (width: number): ResizablePanelsConfig => {
  if (width < 1280) {
    return SMALL_SCREEN_CONFIG;
  } else if (width < 1440) {
    return MEDIUM_SCREEN_CONFIG;
  }
  return DEFAULT_CONFIG;
};

export const useResizablePanels = (initialConfig?: ResizablePanelsConfig) => {
  const trail = new BreadcrumbTrail('ResizablePanels');
  
  // Get responsive configuration based on current viewport
  const [config, setConfig] = useState<ResizablePanelsConfig>(() => {
    if (initialConfig) return initialConfig;
    return getResponsiveConfig(window.innerWidth);
  });
  
  // Track viewport width for responsive updates
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  
  // Panel states
  const [scriptPanel, setScriptPanel] = useState<PanelState>({
    isCollapsed: true, // Start collapsed for clean interface
    isHidden: false, // Visible but collapsed
    width: config.script.defaultWidth,
    minWidth: config.script.minWidth,
    maxWidth: config.script.maxWidth,
  });
  
  const [transcriptionPanel, setTranscriptionPanel] = useState<PanelState>({
    isCollapsed: false,
    isHidden: false, // Visible and expanded
    width: config.transcription.defaultWidth,
    minWidth: config.transcription.minWidth,
    maxWidth: config.transcription.maxWidth,
  });
  
  // Drag state
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartWidth, setDragStartWidth] = useState(0);
  
  // Calculate coaching panel width (fills remaining space)
  const calculateCoachingWidth = useCallback((containerWidth: number) => {
    let scriptWidth = 0;
    let transcriptWidth = 0;
    
    // Only count width if panel is visible
    if (!scriptPanel.isHidden) {
      scriptWidth = scriptPanel.isCollapsed ? config.script.collapsedWidth : scriptPanel.width;
    }
    if (!transcriptionPanel.isHidden) {
      transcriptWidth = transcriptionPanel.isCollapsed ? config.transcription.collapsedWidth : transcriptionPanel.width;
    }
    
    const gaps = (scriptWidth > 0 ? 12 : 0) + (transcriptWidth > 0 ? 12 : 0); // 12px gap per visible panel
    const remainingWidth = containerWidth - scriptWidth - transcriptWidth - gaps;
    
    return Math.max(config.coaching.minWidth, remainingWidth);
  }, [scriptPanel, transcriptionPanel, config]);
  
  // Toggle panel collapse state
  const toggleScriptPanel = useCallback(() => {
    setScriptPanel(prev => {
      const newState = { ...prev, isCollapsed: !prev.isCollapsed };
      trail.light(7120, {
        panel_toggle: 'script_panel',
        action: newState.isCollapsed ? 'collapsed' : 'expanded',
        width: newState.isCollapsed ? config.script.collapsedWidth : newState.width
      });
      return newState;
    });
  }, [config.script.collapsedWidth, trail]);
  
  const toggleTranscriptionPanel = useCallback(() => {
    setTranscriptionPanel(prev => {
      const newState = { ...prev, isCollapsed: !prev.isCollapsed };
      trail.light(7121, {
        panel_toggle: 'transcription_panel',
        action: newState.isCollapsed ? 'collapsed' : 'expanded',
        width: newState.isCollapsed ? config.transcription.collapsedWidth : newState.width
      });
      return newState;
    });
  }, [config.transcription.collapsedWidth, trail]);

  // Toggle panel visibility (completely hide/show)
  const toggleScriptVisibility = useCallback(() => {
    setScriptPanel(prev => {
      const newState = { ...prev, isHidden: !prev.isHidden };
      trail.light(7124, {
        panel_visibility: 'script_panel',
        action: newState.isHidden ? 'hidden' : 'visible'
      });
      return newState;
    });
  }, [trail]);

  const toggleTranscriptionVisibility = useCallback(() => {
    setTranscriptionPanel(prev => {
      const newState = { ...prev, isHidden: !prev.isHidden };
      trail.light(7125, {
        panel_visibility: 'transcription_panel',
        action: newState.isHidden ? 'hidden' : 'visible'
      });
      return newState;
    });
  }, [trail]);
  
  // Start drag resize
  const startResize = useCallback((panelType: 'script' | 'transcription', clientX: number) => {
    const currentPanel = panelType === 'script' ? scriptPanel : transcriptionPanel;
    if (currentPanel.isCollapsed) return;
    
    setIsDragging(panelType);
    setDragStartX(clientX);
    setDragStartWidth(currentPanel.width);
    
    trail.light(7122, {
      resize_start: panelType,
      start_x: clientX,
      start_width: currentPanel.width
    });
  }, [scriptPanel, transcriptionPanel, trail]);
  
  // Handle drag resize
  const handleResize = useCallback((clientX: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - dragStartX;
    // REVERSED: Drag left to make larger, drag right to make smaller
    let newWidth = dragStartWidth - deltaX;
    
    // Apply constraints based on panel type
    if (isDragging === 'script') {
      newWidth = Math.max(config.script.minWidth, Math.min(config.script.maxWidth, newWidth));
      setScriptPanel(prev => ({ ...prev, width: newWidth }));
    } else if (isDragging === 'transcription') {
      newWidth = Math.max(config.transcription.minWidth, Math.min(config.transcription.maxWidth, newWidth));
      setTranscriptionPanel(prev => ({ ...prev, width: newWidth }));
    }
  }, [isDragging, dragStartX, dragStartWidth, config]);
  
  // End drag resize
  const endResize = useCallback(() => {
    if (isDragging) {
      trail.light(7123, {
        resize_end: isDragging,
        final_width: isDragging === 'script' ? scriptPanel.width : transcriptionPanel.width
      });
    }
    setIsDragging(null);
    setDragStartX(0);
    setDragStartWidth(0);
  }, [isDragging, scriptPanel.width, transcriptionPanel.width, trail]);
  
  // Mouse event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        handleResize(e.clientX);
      }
    };
    
    const handleMouseUp = () => {
      if (isDragging) {
        endResize();
      }
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleResize, endResize]);
  
  // Handle viewport resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setViewportWidth(newWidth);
      
      const newConfig = getResponsiveConfig(newWidth);
      const prevConfig = config;
      
      // Update configuration if screen size category changed
      if (JSON.stringify(newConfig) !== JSON.stringify(prevConfig)) {
        setConfig(newConfig);
        
        // Auto-hide panels on small screens
        if (newWidth < 1280) {
          // Hide transcription panel on small screens if both panels are visible
          if (!scriptPanel.isHidden && !transcriptionPanel.isHidden) {
            setTranscriptionPanel(prev => ({ ...prev, isHidden: true }));
            trail.light(7126, { auto_hide: 'transcription_panel', reason: 'small_screen', width: newWidth });
          }
        }
        if (newWidth < 1024) {
          // Hide script panel on very small screens
          if (!scriptPanel.isHidden) {
            setScriptPanel(prev => ({ ...prev, isHidden: true }));
            trail.light(7127, { auto_hide: 'script_panel', reason: 'very_small_screen', width: newWidth });
          }
        }
        
        trail.light(7128, { 
          responsive_config: 'updated', 
          old_config: prevConfig.coaching.minWidth, 
          new_config: newConfig.coaching.minWidth,
          viewport_width: newWidth
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    
    return () => window.removeEventListener('resize', handleResize);
  }, [config, scriptPanel.isHidden, transcriptionPanel.isHidden, trail]);
  
  // Persist panel configurations to localStorage (run once on mount)
  useEffect(() => {
    const savedConfig = localStorage.getItem('voicecoach-panel-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.script) {
          setScriptPanel(prev => ({ ...prev, ...parsed.script }));
        }
        if (parsed.transcription) {
          setTranscriptionPanel(prev => ({ ...prev, ...parsed.transcription }));
        }
        trail.light(7124, { panel_config: 'loaded_from_storage' });
      } catch (e) {
        trail.light(7125, { panel_config: 'failed_to_load', error: e });
      }
    }
  }, []); // No dependencies - run only on mount
  
  // Debounced localStorage saving to prevent excessive writes during resize
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const configToSave = {
        script: scriptPanel,
        transcription: transcriptionPanel,
      };
      try {
        localStorage.setItem('voicecoach-panel-config', JSON.stringify(configToSave));
        trail.light(7129, { panel_config: 'saved_to_storage', panels: Object.keys(configToSave) });
      } catch (e) {
        trail.light(7130, { panel_config: 'save_failed', error: e });
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [scriptPanel, transcriptionPanel]); // Removed trail dependency to prevent infinite loops
  
  return {
    // Panel states
    scriptPanel,
    transcriptionPanel,
    calculateCoachingWidth,
    isDragging,
    viewportWidth,
    
    // Panel controls
    toggleScriptPanel,
    toggleTranscriptionPanel,
    toggleScriptVisibility,
    toggleTranscriptionVisibility,
    startResize,
    
    // Responsive configuration
    config,
    
    // Calculated dimensions
    getScriptWidth: () => scriptPanel.isCollapsed ? config.script.collapsedWidth : scriptPanel.width,
    getTranscriptionWidth: () => transcriptionPanel.isCollapsed ? config.transcription.collapsedWidth : transcriptionPanel.width,
  };
};