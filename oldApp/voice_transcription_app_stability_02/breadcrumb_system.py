"""
LED Light Trail Debugging Infrastructure for ChromaDB RAG System

This module provides comprehensive breadcrumb trail debugging for the voice coaching RAG system.
LED numbering system:
- 200-299: Vector Database Operations (ChromaDB, embeddings, search)
- 300-399: Knowledge Retrieval Operations (document processing, semantic search)
- 400-499: Coaching Prompt Generation (prompt formatting, context assembly)
- 500-599: Performance Monitoring (latency, accuracy, caching)
"""

import time
import json
import threading
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from collections import deque


@dataclass
class Breadcrumb:
    """Individual breadcrumb in the LED trail"""
    id: int
    name: str
    component: str
    timestamp: float
    duration: float
    data: Optional[Any]
    success: bool
    error: Optional[str] = None
    stack: Optional[str] = None


class BreadcrumbTrail:
    """
    LED debugging trail for ChromaDB RAG operations.
    Provides real-time performance monitoring and error location identification.
    """
    
    def __init__(self, component_name: str):
        self.component_name = component_name
        self.sequence: List[Breadcrumb] = []
        self.start_time = time.time()
        self._lock = threading.Lock()
        
        # Global breadcrumb registry
        if not hasattr(BreadcrumbTrail, '_global_registry'):
            BreadcrumbTrail._global_registry = {}
            BreadcrumbTrail._global_trail = deque(maxlen=1000)
            BreadcrumbTrail._global_failures = []
            
        BreadcrumbTrail._global_registry[component_name] = self
    
    def light(self, led_id: int, data: Optional[Any] = None) -> None:
        """
        Light up an LED in the debugging trail.
        
        Args:
            led_id: LED number (200-599 for RAG operations)
            data: Optional data payload for debugging context
        """
        led_name = self._get_led_name(led_id)
        
        with self._lock:
            breadcrumb = Breadcrumb(
                id=led_id,
                name=led_name,
                component=self.component_name,
                timestamp=time.time(),
                duration=time.time() - self.start_time,
                data=data,
                success=True
            )
            
            self.sequence.append(breadcrumb)
            BreadcrumbTrail._global_trail.append(breadcrumb)
        
        # Console output with RAG-specific formatting (Windows-compatible)
        if 200 <= led_id <= 299:
            icon = "[VDB]"  # Vector DB operations
        elif 300 <= led_id <= 399:
            icon = "[KNW]"  # Knowledge retrieval
        elif 400 <= led_id <= 499:
            icon = "[CGP]"  # Coaching prompts
        elif 500 <= led_id <= 599:
            icon = "[PRF]"  # Performance monitoring
        else:
            icon = "[GEN]"  # General operations
            
        print(f"{icon} {str(led_id).zfill(3)} OK {led_name} [{self.component_name}] {data or ''}")
    
    def fail(self, led_id: int, error: Exception, stack: Optional[str] = None) -> None:
        """
        Record a failure at a specific LED point.
        
        Args:
            led_id: LED number where failure occurred
            error: Exception that caused the failure
            stack: Optional stack trace for debugging
        """
        led_name = self._get_led_name(led_id)
        
        with self._lock:
            breadcrumb = Breadcrumb(
                id=led_id,
                name=led_name,
                component=self.component_name,
                timestamp=time.time(),
                duration=time.time() - self.start_time,
                data=None,
                success=False,
                error=str(error),
                stack=stack
            )
            
            self.sequence.append(breadcrumb)
            BreadcrumbTrail._global_trail.append(breadcrumb)
            BreadcrumbTrail._global_failures.append(breadcrumb)
        
        # Error output with component context
        print(f"[ERR] {str(led_id).zfill(3)} FAIL {led_name} [{self.component_name}] ERROR: {error}")
    
    def performance_checkpoint(self, led_id: int, operation: str, duration_ms: float, metadata: Dict[str, Any] = None) -> None:
        """
        Record performance checkpoint for RAG operations.
        
        Args:
            led_id: LED number for performance tracking (500-599)
            operation: Operation name (e.g., "semantic_search", "embedding_generation")
            duration_ms: Operation duration in milliseconds
            metadata: Additional performance metadata
        """
        perf_data = {
            "operation": operation,
            "duration_ms": duration_ms,
            "metadata": metadata or {}
        }
        
        # Performance threshold warnings
        if operation == "semantic_search" and duration_ms > 100:
            perf_data["warning"] = f"Semantic search exceeded 100ms target: {duration_ms:.1f}ms"
        elif operation == "embedding_generation" and duration_ms > 500:
            perf_data["warning"] = f"Embedding generation slow: {duration_ms:.1f}ms"
        elif operation == "document_retrieval" and duration_ms > 50:
            perf_data["warning"] = f"Document retrieval slow: {duration_ms:.1f}ms"
        
        self.light(led_id, perf_data)
    
    def _get_led_name(self, led_id: int) -> str:
        """Get descriptive name for LED based on ID range and specific number."""
        
        # Vector Database Operations (200-299)
        if 200 <= led_id <= 299:
            led_map = {
                200: "CHROMADB_INIT_START",
                201: "CHROMADB_INIT_COMPLETE",
                202: "EMBEDDING_MODEL_LOAD_START",
                203: "EMBEDDING_MODEL_LOAD_COMPLETE",
                204: "COLLECTION_CREATE_START",
                205: "COLLECTION_CREATE_COMPLETE",
                206: "COLLECTION_ACCESS_START",
                207: "COLLECTION_ACCESS_COMPLETE",
                210: "DOCUMENT_EMBEDDING_START",
                211: "DOCUMENT_EMBEDDING_COMPLETE",
                212: "BATCH_EMBEDDING_START",
                213: "BATCH_EMBEDDING_COMPLETE",
                220: "VECTOR_SEARCH_START",
                221: "VECTOR_SEARCH_COMPLETE",
                222: "SIMILARITY_CALCULATION_START",
                223: "SIMILARITY_CALCULATION_COMPLETE",
                230: "DOCUMENT_STORAGE_START",
                231: "DOCUMENT_STORAGE_COMPLETE",
                232: "METADATA_INDEXING_START",
                233: "METADATA_INDEXING_COMPLETE",
                240: "DATABASE_QUERY_START",
                241: "DATABASE_QUERY_COMPLETE",
                250: "VECTOR_DB_HEALTH_CHECK",
                251: "EMBEDDING_CACHE_HIT",
                252: "EMBEDDING_CACHE_MISS",
            }
            return led_map.get(led_id, f"VECTOR_DB_OPERATION_{led_id}")
        
        # Knowledge Retrieval Operations (300-399)
        elif 300 <= led_id <= 399:
            led_map = {
                300: "KNOWLEDGE_SEARCH_START",
                301: "KNOWLEDGE_SEARCH_COMPLETE",
                302: "DOCUMENT_CHUNKING_START",
                303: "DOCUMENT_CHUNKING_COMPLETE",
                304: "SEMANTIC_SIMILARITY_START",
                305: "SEMANTIC_SIMILARITY_COMPLETE",
                310: "COACHING_KNOWLEDGE_RETRIEVE_START",
                311: "COACHING_KNOWLEDGE_RETRIEVE_COMPLETE",
                312: "SALES_CONTEXT_EXTRACT_START",
                313: "SALES_CONTEXT_EXTRACT_COMPLETE",
                320: "DOCUMENT_RANKING_START",
                321: "DOCUMENT_RANKING_COMPLETE",
                322: "RELEVANCE_SCORING_START",
                323: "RELEVANCE_SCORING_COMPLETE",
                330: "KNOWLEDGE_FILTERING_START",
                331: "KNOWLEDGE_FILTERING_COMPLETE",
                332: "CONTEXT_ASSEMBLY_START",
                333: "CONTEXT_ASSEMBLY_COMPLETE",
                340: "SNIPPET_EXTRACTION_START",
                341: "SNIPPET_EXTRACTION_COMPLETE",
                350: "KNOWLEDGE_CACHE_CHECK",
                351: "KNOWLEDGE_CACHE_UPDATE",
            }
            return led_map.get(led_id, f"KNOWLEDGE_RETRIEVAL_{led_id}")
        
        # Coaching Prompt Generation (400-499)
        elif 400 <= led_id <= 499:
            led_map = {
                400: "PROMPT_GENERATION_START",
                401: "PROMPT_GENERATION_COMPLETE",
                402: "CONTEXT_FORMATTING_START",
                403: "CONTEXT_FORMATTING_COMPLETE",
                410: "COACHING_TEMPLATE_LOAD_START",
                411: "COACHING_TEMPLATE_LOAD_COMPLETE",
                412: "PROMPT_PERSONALIZATION_START",
                413: "PROMPT_PERSONALIZATION_COMPLETE",
                420: "SALES_COACHING_PROMPT_START",
                421: "SALES_COACHING_PROMPT_COMPLETE",
                422: "OBJECTION_HANDLING_PROMPT_START",
                423: "OBJECTION_HANDLING_PROMPT_COMPLETE",
                430: "REAL_TIME_COACHING_START",
                431: "REAL_TIME_COACHING_COMPLETE",
                440: "PROMPT_VALIDATION_START",
                441: "PROMPT_VALIDATION_COMPLETE",
                450: "COACHING_RESPONSE_FORMAT_START",
                451: "COACHING_RESPONSE_FORMAT_COMPLETE",
            }
            return led_map.get(led_id, f"COACHING_PROMPT_{led_id}")
        
        # Performance Monitoring (500-599)
        elif 500 <= led_id <= 599:
            led_map = {
                500: "PERFORMANCE_MONITOR_START",
                501: "PERFORMANCE_MONITOR_COMPLETE",
                502: "LATENCY_MEASUREMENT_START",
                503: "LATENCY_MEASUREMENT_COMPLETE",
                510: "SEARCH_PERFORMANCE_CHECK",
                511: "EMBEDDING_PERFORMANCE_CHECK",
                512: "RETRIEVAL_PERFORMANCE_CHECK",
                520: "ACCURACY_MEASUREMENT_START",
                521: "ACCURACY_MEASUREMENT_COMPLETE",
                522: "RELEVANCE_QUALITY_CHECK",
                530: "CACHE_PERFORMANCE_CHECK",
                531: "MEMORY_USAGE_CHECK",
                532: "CPU_USAGE_CHECK",
                540: "TAURI_INTEGRATION_START",
                541: "TAURI_INTEGRATION_COMPLETE",
                550: "REAL_TIME_METRICS_UPDATE",
                560: "SYSTEM_HEALTH_CHECK",
            }
            return led_map.get(led_id, f"PERFORMANCE_MONITOR_{led_id}")
        
        else:
            return f"OPERATION_{led_id}"
    
    def get_sequence(self) -> List[Dict[str, Any]]:
        """Get the complete breadcrumb sequence for this component."""
        with self._lock:
            return [
                {
                    "id": bc.id,
                    "name": bc.name,
                    "component": bc.component,
                    "timestamp": bc.timestamp,
                    "duration": bc.duration,
                    "data": bc.data,
                    "success": bc.success,
                    "error": bc.error,
                    "stack": bc.stack
                }
                for bc in self.sequence
            ]
    
    @classmethod
    def get_global_trail(cls) -> List[Dict[str, Any]]:
        """Get the global breadcrumb trail across all components."""
        if not hasattr(cls, '_global_trail'):
            return []
        
        return [
            {
                "id": bc.id,
                "name": bc.name,
                "component": bc.component,
                "timestamp": bc.timestamp,
                "duration": bc.duration,
                "data": bc.data,
                "success": bc.success,
                "error": bc.error,
                "stack": bc.stack
            }
            for bc in cls._global_trail
        ]
    
    @classmethod
    def get_failures(cls) -> List[Dict[str, Any]]:
        """Get all recorded failures across components."""
        if not hasattr(cls, '_global_failures'):
            return []
            
        return [
            {
                "id": bc.id,
                "name": bc.name,
                "component": bc.component,
                "timestamp": bc.timestamp,
                "duration": bc.duration,
                "error": bc.error,
                "stack": bc.stack
            }
            for bc in cls._global_failures
        ]
    
    @classmethod
    def get_component(cls, component_name: str) -> Optional['BreadcrumbTrail']:
        """Get breadcrumb trail for a specific component."""
        if not hasattr(cls, '_global_registry'):
            return None
        return cls._global_registry.get(component_name)
    
    @classmethod
    def clear_all(cls) -> None:
        """Clear all breadcrumb trails and global state."""
        if hasattr(cls, '_global_registry'):
            cls._global_registry.clear()
        if hasattr(cls, '_global_trail'):
            cls._global_trail.clear()
        if hasattr(cls, '_global_failures'):
            cls._global_failures.clear()


# Debug command registration for easy access
class DebugCommands:
    """Debug commands for breadcrumb trail access and analysis."""
    
    @staticmethod
    def get_all_trails() -> Dict[str, List[Dict[str, Any]]]:
        """Get all component breadcrumb trails."""
        if not hasattr(BreadcrumbTrail, '_global_registry'):
            return {}
        
        return {
            name: trail.get_sequence() 
            for name, trail in BreadcrumbTrail._global_registry.items()
        }
    
    @staticmethod
    def get_global_trail() -> List[Dict[str, Any]]:
        """Get the global breadcrumb trail."""
        return BreadcrumbTrail.get_global_trail()
    
    @staticmethod
    def get_failures() -> List[Dict[str, Any]]:
        """Get all recorded failures."""
        return BreadcrumbTrail.get_failures()
    
    @staticmethod
    def get_component_trail(component_name: str) -> List[Dict[str, Any]]:
        """Get breadcrumb trail for a specific component."""
        trail = BreadcrumbTrail.get_component(component_name)
        return trail.get_sequence() if trail else []
    
    @staticmethod
    def get_performance_summary() -> Dict[str, Any]:
        """Get performance summary from performance monitoring LEDs."""
        global_trail = BreadcrumbTrail.get_global_trail()
        
        performance_entries = [
            bc for bc in global_trail 
            if 500 <= bc["id"] <= 599 and bc["success"] and bc.get("data", {}).get("operation")
        ]
        
        summary = {}
        for entry in performance_entries:
            operation = entry["data"]["operation"]
            duration = entry["data"]["duration_ms"]
            
            if operation not in summary:
                summary[operation] = {
                    "count": 0,
                    "total_duration": 0,
                    "min_duration": float('inf'),
                    "max_duration": 0,
                    "warnings": 0
                }
            
            summary[operation]["count"] += 1
            summary[operation]["total_duration"] += duration
            summary[operation]["min_duration"] = min(summary[operation]["min_duration"], duration)
            summary[operation]["max_duration"] = max(summary[operation]["max_duration"], duration)
            
            if "warning" in entry["data"]:
                summary[operation]["warnings"] += 1
        
        # Calculate averages
        for operation in summary:
            if summary[operation]["count"] > 0:
                summary[operation]["avg_duration"] = summary[operation]["total_duration"] / summary[operation]["count"]
        
        return summary
    
    @staticmethod
    def clear_all() -> None:
        """Clear all breadcrumb trails."""
        BreadcrumbTrail.clear_all()


# Export debug interface
debug = DebugCommands()

# Example usage and testing
if __name__ == "__main__":
    # Test the breadcrumb system
    trail = BreadcrumbTrail("ChromaDBRAGSystem")
    
    # Simulate ChromaDB initialization
    trail.light(200, {"action": "initializing_chromadb"})
    time.sleep(0.1)
    trail.light(201, {"status": "chromadb_ready"})
    
    # Simulate embedding generation
    trail.light(210, {"documents": 5, "embedding_model": "sentence-transformers"})
    trail.performance_checkpoint(511, "embedding_generation", 45.2, {"batch_size": 5})
    trail.light(211, {"embeddings_generated": 5})
    
    # Simulate semantic search
    trail.light(220, {"query": "sales objection handling"})
    trail.performance_checkpoint(510, "semantic_search", 23.8, {"results": 3})
    trail.light(221, {"results_found": 3, "top_similarity": 0.87})
    
    # Simulate coaching prompt generation
    trail.light(400, {"context_chunks": 3})
    trail.light(420, {"prompt_type": "sales_coaching"})
    trail.light(421, {"prompt_length": 156, "personalized": True})
    
    # Print debug information
    print("\n=== Breadcrumb Trail Summary ===")
    print(f"Component: {trail.component_name}")
    print(f"Total breadcrumbs: {len(trail.sequence)}")
    
    print("\n=== Performance Summary ===")
    perf_summary = debug.get_performance_summary()
    for operation, stats in perf_summary.items():
        print(f"{operation}: {stats['avg_duration']:.1f}ms avg ({stats['count']} samples)")
    
    print("\n=== Global Trail (last 5) ===")
    global_trail = debug.get_global_trail()
    for bc in global_trail[-5:]:
        status = "✅" if bc["success"] else "❌"
        print(f"LED {bc['id']:03d} {status} {bc['name']} [{bc['component']}]")