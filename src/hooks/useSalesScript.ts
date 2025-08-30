/**
 * VoiceCoach V2 - Sales Script Hook
 * Manages sales script items and their state
 */
import { useState, useCallback } from 'react';
import { SalesScriptItem } from '../types/coaching';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

export const useSalesScript = () => {
  const trail = new BreadcrumbTrail('SalesScript');
  
  // Initialize with empty state - data would come from RAG processing
  const [scriptItems, setScriptItems] = useState<SalesScriptItem[]>([]);
  
  const markItemUsed = useCallback((id: string) => {
    setScriptItems(prev => prev.map(item => 
      item.id === id ? { ...item, used: true } : item
    ));
    
    trail.light(7126, {
      script_action: 'item_marked_used',
      item_id: id
    });
  }, [trail]);
  
  const clearUsedItems = useCallback(() => {
    const usedCount = scriptItems.filter(item => item.used).length;
    setScriptItems(prev => prev.map(item => ({ ...item, used: false })));
    
    trail.light(7127, {
      script_action: 'cleared_used_items',
      count: usedCount
    });
  }, [scriptItems, trail]);
  
  const loadScriptItems = useCallback((items: SalesScriptItem[]) => {
    setScriptItems(items);
    trail.light(7128, {
      script_action: 'items_loaded',
      count: items.length
    });
  }, [trail]);
  
  return {
    scriptItems,
    markItemUsed,
    clearUsedItems,
    loadScriptItems
  };
};