"""
AI-Powered Voice Transcription Breadcrumb System
LED Light Trail Infrastructure for Faster-Whisper Integration

This module provides detailed tracing for AI model operations, real-time transcription pipelines,
and performance monitoring with <500ms latency requirements.
"""

import time
import json
import threading
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import IntEnum
import logging

# Set up logging for breadcrumb system
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("AI_BreadcrumbSystem")

class AILEDRanges(IntEnum):
    """LED numbering ranges for AI transcription pipeline operations"""
    # 100-199: Audio Capture & Processing
    AUDIO_CAPTURE_START = 100
    AUDIO_CAPTURE_CHUNK = 101
    AUDIO_CAPTURE_QUEUE = 102
    AUDIO_CAPTURE_SILENCE_DETECT = 103
    AUDIO_CAPTURE_VAD = 104
    AUDIO_CAPTURE_BUFFER = 105
    AUDIO_CAPTURE_STOP = 106
    
    # 200-299: AI Model Operations
    AI_MODEL_INIT = 200
    AI_MODEL_LOADING = 201
    AI_MODEL_LOADED = 202
    AI_MODEL_GPU_CHECK = 203
    AI_MODEL_INFERENCE_START = 204
    AI_MODEL_INFERENCE_COMPLETE = 205
    AI_MODEL_FALLBACK = 206
    AI_MODEL_ERROR = 207
    
    # 300-399: Transcription Pipeline
    TRANSCRIPTION_START = 300
    TRANSCRIPTION_LOOP_INIT = 301
    TRANSCRIPTION_SEGMENT_PROCESS = 302
    TRANSCRIPTION_CONFIDENCE_CHECK = 303
    TRANSCRIPTION_PHANTOM_FILTER = 304
    TRANSCRIPTION_RESULT_QUEUE = 305
    TRANSCRIPTION_LATENCY_MEASURE = 306
    TRANSCRIPTION_STOP = 307
    
    # 400-499: Real-time Performance
    PERFORMANCE_LATENCY_START = 400
    PERFORMANCE_LATENCY_END = 401
    PERFORMANCE_GPU_MEMORY = 402
    PERFORMANCE_AUDIO_BUFFER_SIZE = 403
    PERFORMANCE_THREAD_SYNC = 404
    PERFORMANCE_QUEUE_STATUS = 405
    
    # 500-599: Speaker Identification & Dual-Channel
    SPEAKER_CHANNEL_SEPARATION = 500
    SPEAKER_IDENTIFICATION = 501
    SPEAKER_USER_CHANNEL = 502
    SPEAKER_PROSPECT_CHANNEL = 503
    SPEAKER_VOICE_ACTIVITY = 504
    
    # 600-699: IPC Communication (Python-Tauri)
    IPC_MESSAGE_SEND = 600
    IPC_MESSAGE_RECEIVE = 601
    IPC_TRANSCRIPTION_FORWARD = 602
    IPC_STATUS_UPDATE = 603
    IPC_ERROR_REPORT = 604

@dataclass
class AIBreadcrumb:
    """Enhanced breadcrumb for AI transcription operations"""
    led_id: int
    component: str
    operation: str
    timestamp: float
    duration: float
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    performance_metrics: Optional[Dict[str, float]] = None
    ai_metrics: Optional[Dict[str, Any]] = None

class AIBreadcrumbTrail:
    """
    Specialized breadcrumb trail for AI-powered voice transcription systems.
    Provides detailed tracing for Faster-Whisper operations, performance monitoring,
    and real-time transcription pipeline debugging.
    """
    
    def __init__(self, component_name: str, max_breadcrumbs: int = 1000):
        self.component_name = component_name
        self.max_breadcrumbs = max_breadcrumbs
        self.breadcrumbs: List[AIBreadcrumb] = []
        self.start_time = time.time()
        self.current_operation_start: Optional[float] = None
        self.lock = threading.RLock()
        
        # Performance tracking
        self.latency_measurements = []
        self.gpu_memory_usage = []
        self.throughput_measurements = []
        
        # AI-specific metrics
        self.model_inference_times = []
        self.confidence_scores = []
        self.transcription_accuracy_metrics = []
        
    def light(self, led_id: int, operation: str = "", data: Any = None, 
              performance_metrics: Optional[Dict[str, float]] = None,
              ai_metrics: Optional[Dict[str, Any]] = None) -> None:
        """
        Light up an LED in the AI transcription pipeline with detailed metrics.
        
        Args:
            led_id: LED number from AILEDRanges
            operation: Description of the operation
            data: Operation-specific data
            performance_metrics: Latency, memory, throughput measurements
            ai_metrics: AI model confidence, accuracy, inference time
        """
        current_time = time.time()
        duration = current_time - self.start_time
        
        # Auto-detect operation name if not provided
        if not operation:
            operation = self._get_operation_name(led_id)
        
        # Create enhanced breadcrumb
        breadcrumb = AIBreadcrumb(
            led_id=led_id,
            component=self.component_name,
            operation=operation,
            timestamp=current_time,
            duration=duration,
            success=True,
            data=self._serialize_data(data),
            performance_metrics=performance_metrics,
            ai_metrics=ai_metrics
        )
        
        with self.lock:
            self.breadcrumbs.append(breadcrumb)
            self._limit_breadcrumbs()
            
            # Track performance metrics
            if performance_metrics:
                self._update_performance_tracking(performance_metrics)
            
            if ai_metrics:
                self._update_ai_tracking(ai_metrics)
        
        # Enhanced console output with AI context
        led_name = self._get_led_name(led_id)
        console_output = f"💡 {str(led_id).zfill(3)} ✅ {led_name} [{self.component_name}]"
        
        if operation:
            console_output += f" - {operation}"
            
        if performance_metrics and 'latency_ms' in performance_metrics:
            latency = performance_metrics['latency_ms']
            console_output += f" ({latency:.1f}ms)"
            
        if ai_metrics and 'confidence' in ai_metrics:
            confidence = ai_metrics['confidence']
            console_output += f" (conf: {confidence:.2f})"
        
        if data:
            console_output += f" | {self._format_data_summary(data)}"
            
        print(console_output)
        logger.debug(f"LED {led_id} lit: {operation}")
    
    def fail(self, led_id: int, error: Exception, operation: str = "", 
             performance_metrics: Optional[Dict[str, float]] = None) -> None:
        """
        Record a failure in the AI transcription pipeline.
        
        Args:
            led_id: LED number where failure occurred
            error: Exception that occurred
            operation: Description of failed operation
            performance_metrics: Performance data at time of failure
        """
        current_time = time.time()
        duration = current_time - self.start_time
        
        if not operation:
            operation = self._get_operation_name(led_id)
        
        breadcrumb = AIBreadcrumb(
            led_id=led_id,
            component=self.component_name,
            operation=operation,
            timestamp=current_time,
            duration=duration,
            success=False,
            error=str(error),
            performance_metrics=performance_metrics
        )
        
        with self.lock:
            self.breadcrumbs.append(breadcrumb)
            self._limit_breadcrumbs()
        
        # Error output with context
        led_name = self._get_led_name(led_id)
        error_output = f"💡 {str(led_id).zfill(3)} ❌ {led_name} [{self.component_name}] - {operation}"
        
        if performance_metrics and 'latency_ms' in performance_metrics:
            latency = performance_metrics['latency_ms']
            error_output += f" (failed at {latency:.1f}ms)"
            
        print(error_output)
        logger.error(f"LED {led_id} failed: {operation} - {str(error)}")
    
    def measure_latency(self, led_start: int, led_end: int, 
                       operation: str = "latency_measurement") -> float:
        """
        Measure latency between two LED points for performance monitoring.
        
        Args:
            led_start: Starting LED number
            led_end: Ending LED number  
            operation: Description of what's being measured
            
        Returns:
            Latency in milliseconds
        """
        start_time = time.time()
        self.light(led_start, f"{operation}_start")
        
        # Return function to call when operation completes
        def end_measurement():
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            
            performance_metrics = {
                'latency_ms': latency_ms,
                'start_time': start_time,
                'end_time': end_time
            }
            
            self.light(led_end, f"{operation}_end", performance_metrics=performance_metrics)
            
            # Track latency for analytics
            with self.lock:
                self.latency_measurements.append({
                    'operation': operation,
                    'latency_ms': latency_ms,
                    'timestamp': end_time
                })
            
            return latency_ms
        
        return end_measurement
    
    def track_ai_inference(self, led_id: int, model_name: str, 
                          confidence: float, inference_time_ms: float,
                          input_duration_sec: float, output_text: str = "") -> None:
        """
        Track AI model inference operations with detailed metrics.
        
        Args:
            led_id: LED number for this inference
            model_name: Name of the AI model used
            confidence: Confidence score of the inference
            inference_time_ms: Time taken for inference in milliseconds
            input_duration_sec: Duration of input audio in seconds
            output_text: Transcribed text (optional, truncated for logging)
        """
        ai_metrics = {
            'model_name': model_name,
            'confidence': confidence,
            'inference_time_ms': inference_time_ms,
            'input_duration_sec': input_duration_sec,
            'output_length': len(output_text) if output_text else 0,
            'throughput_ratio': input_duration_sec / (inference_time_ms / 1000) if inference_time_ms > 0 else 0
        }
        
        performance_metrics = {
            'latency_ms': inference_time_ms
        }
        
        # Truncate output text for logging
        display_text = output_text[:50] + "..." if len(output_text) > 50 else output_text
        
        operation_data = {
            'model': model_name,
            'text_preview': display_text,
            'duration': f"{input_duration_sec:.2f}s"
        }
        
        self.light(led_id, "ai_inference", operation_data, performance_metrics, ai_metrics)
        
        # Track for analytics
        with self.lock:
            self.model_inference_times.append(inference_time_ms)
            self.confidence_scores.append(confidence)
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """
        Get comprehensive performance summary for the AI transcription system.
        
        Returns:
            Dictionary with performance analytics
        """
        with self.lock:
            summary = {
                'component': self.component_name,
                'total_operations': len(self.breadcrumbs),
                'failed_operations': len([b for b in self.breadcrumbs if not b.success]),
                'success_rate': len([b for b in self.breadcrumbs if b.success]) / len(self.breadcrumbs) * 100 if self.breadcrumbs else 0,
                'uptime_seconds': time.time() - self.start_time
            }
            
            # Latency analytics
            if self.latency_measurements:
                latencies = [m['latency_ms'] for m in self.latency_measurements]
                summary['latency'] = {
                    'avg_ms': sum(latencies) / len(latencies),
                    'min_ms': min(latencies),
                    'max_ms': max(latencies),
                    'count': len(latencies),
                    'under_500ms': len([l for l in latencies if l < 500]) / len(latencies) * 100
                }
            
            # AI model analytics
            if self.model_inference_times:
                summary['ai_performance'] = {
                    'avg_inference_ms': sum(self.model_inference_times) / len(self.model_inference_times),
                    'total_inferences': len(self.model_inference_times)
                }
            
            if self.confidence_scores:
                summary['ai_quality'] = {
                    'avg_confidence': sum(self.confidence_scores) / len(self.confidence_scores),
                    'high_confidence_rate': len([c for c in self.confidence_scores if c > 0.8]) / len(self.confidence_scores) * 100
                }
            
            return summary
    
    def get_recent_failures(self, count: int = 10) -> List[AIBreadcrumb]:
        """Get most recent failures for debugging."""
        with self.lock:
            failures = [b for b in self.breadcrumbs if not b.success]
            return failures[-count:] if failures else []
    
    def get_latency_violations(self, threshold_ms: float = 500) -> List[AIBreadcrumb]:
        """Get operations that exceeded latency thresholds."""
        with self.lock:
            violations = []
            for breadcrumb in self.breadcrumbs:
                if breadcrumb.performance_metrics and 'latency_ms' in breadcrumb.performance_metrics:
                    if breadcrumb.performance_metrics['latency_ms'] > threshold_ms:
                        violations.append(breadcrumb)
            return violations
    
    def export_trace(self, filename: str = None) -> str:
        """Export complete breadcrumb trace to JSON file."""
        if not filename:
            timestamp = int(time.time())
            filename = f"ai_transcription_trace_{self.component_name}_{timestamp}.json"
        
        trace_data = {
            'component': self.component_name,
            'trace_start_time': self.start_time,
            'trace_end_time': time.time(),
            'performance_summary': self.get_performance_summary(),
            'breadcrumbs': [asdict(b) for b in self.breadcrumbs]
        }
        
        with open(filename, 'w') as f:
            json.dump(trace_data, f, indent=2, default=str)
        
        print(f"📊 AI transcription trace exported to {filename}")
        return filename
    
    def _get_led_name(self, led_id: int) -> str:
        """Get descriptive name for LED based on ranges."""
        if 100 <= led_id <= 199:
            return f"AUDIO_CAPTURE_{led_id}"
        elif 200 <= led_id <= 299:
            return f"AI_MODEL_{led_id}"
        elif 300 <= led_id <= 399:
            return f"TRANSCRIPTION_{led_id}"
        elif 400 <= led_id <= 499:
            return f"PERFORMANCE_{led_id}"
        elif 500 <= led_id <= 599:
            return f"SPEAKER_ID_{led_id}"
        elif 600 <= led_id <= 699:
            return f"IPC_COMM_{led_id}"
        else:
            return f"OPERATION_{led_id}"
    
    def _get_operation_name(self, led_id: int) -> str:
        """Auto-detect operation name from LED ID."""
        led_map = {
            100: "audio_capture_start",
            101: "audio_chunk_received", 
            102: "audio_queue_update",
            103: "silence_detection",
            104: "voice_activity_detection",
            105: "audio_buffer_update",
            106: "audio_capture_stop",
            
            200: "ai_model_initialization",
            201: "ai_model_loading",
            202: "ai_model_loaded",
            203: "gpu_availability_check",
            204: "ai_inference_start",
            205: "ai_inference_complete",
            206: "model_fallback_attempt",
            207: "model_error",
            
            300: "transcription_pipeline_start",
            301: "transcription_loop_init",
            302: "segment_processing",
            303: "confidence_evaluation",
            304: "phantom_text_filtering",
            305: "result_queue_update",
            306: "latency_measurement",
            307: "transcription_pipeline_stop",
            
            400: "performance_monitoring_start",
            401: "performance_monitoring_end",
            402: "gpu_memory_check",
            403: "audio_buffer_analysis",
            404: "thread_synchronization",
            405: "queue_status_check",
            
            500: "speaker_channel_separation",
            501: "speaker_identification",
            502: "user_channel_processing",
            503: "prospect_channel_processing", 
            504: "voice_activity_analysis",
            
            600: "ipc_message_send",
            601: "ipc_message_receive",
            602: "transcription_forward",
            603: "status_update",
            604: "error_report"
        }
        return led_map.get(led_id, f"operation_{led_id}")
    
    def _serialize_data(self, data: Any) -> Any:
        """Safely serialize data for storage."""
        if data is None:
            return None
        
        try:
            # Handle numpy arrays, torch tensors, etc.
            if hasattr(data, 'tolist'):
                return {'array': data.tolist(), 'shape': getattr(data, 'shape', None)}
            elif hasattr(data, 'shape'):
                return {'tensor_shape': str(data.shape)}
            elif isinstance(data, (dict, list, str, int, float, bool)):
                return data
            else:
                return str(data)
        except Exception:
            return str(data)
    
    def _format_data_summary(self, data: Any) -> str:
        """Format data for console display."""
        if isinstance(data, dict):
            if 'text_preview' in data:
                return f"text: '{data['text_preview']}'"
            elif 'model' in data:
                return f"model: {data['model']}"
            else:
                return f"dict({len(data)} keys)"
        elif isinstance(data, (list, tuple)):
            return f"list({len(data)} items)"
        elif isinstance(data, str):
            return f"'{data[:30]}...'" if len(data) > 30 else f"'{data}'"
        else:
            return str(data)[:50]
    
    def _limit_breadcrumbs(self):
        """Limit breadcrumb storage to prevent memory issues."""
        if len(self.breadcrumbs) > self.max_breadcrumbs:
            # Keep most recent breadcrumbs
            self.breadcrumbs = self.breadcrumbs[-int(self.max_breadcrumbs * 0.8):]
    
    def _update_performance_tracking(self, metrics: Dict[str, float]):
        """Update internal performance tracking."""
        if 'latency_ms' in metrics:
            self.latency_measurements.append({
                'latency_ms': metrics['latency_ms'],
                'timestamp': time.time()
            })
            # Limit stored measurements
            if len(self.latency_measurements) > 100:
                self.latency_measurements = self.latency_measurements[-50:]
    
    def _update_ai_tracking(self, metrics: Dict[str, Any]):
        """Update AI-specific tracking."""
        if 'inference_time_ms' in metrics:
            self.model_inference_times.append(metrics['inference_time_ms'])
            if len(self.model_inference_times) > 100:
                self.model_inference_times = self.model_inference_times[-50:]
        
        if 'confidence' in metrics:
            self.confidence_scores.append(metrics['confidence'])
            if len(self.confidence_scores) > 100:
                self.confidence_scores = self.confidence_scores[-50:]

# Global AI breadcrumb registry
ai_breadcrumb_trails: Dict[str, AIBreadcrumbTrail] = {}
ai_breadcrumb_lock = threading.RLock()

def get_ai_trail(component_name: str) -> AIBreadcrumbTrail:
    """Get or create an AI breadcrumb trail for a component."""
    with ai_breadcrumb_lock:
        if component_name not in ai_breadcrumb_trails:
            ai_breadcrumb_trails[component_name] = AIBreadcrumbTrail(component_name)
        return ai_breadcrumb_trails[component_name]

def get_all_ai_trails() -> Dict[str, AIBreadcrumbTrail]:
    """Get all active AI breadcrumb trails."""
    with ai_breadcrumb_lock:
        return ai_breadcrumb_trails.copy()

def export_all_traces(directory: str = ".") -> List[str]:
    """Export traces from all AI components."""
    with ai_breadcrumb_lock:
        exported_files = []
        for component_name, trail in ai_breadcrumb_trails.items():
            filename = f"{directory}/ai_trace_{component_name}_{int(time.time())}.json"
            exported_files.append(trail.export_trace(filename))
        return exported_files

# Debug commands for AI transcription system
def print_ai_performance_summary():
    """Print performance summary for all AI components."""
    print("\n🤖 AI TRANSCRIPTION PERFORMANCE SUMMARY")
    print("=" * 50)
    
    with ai_breadcrumb_lock:
        for component_name, trail in ai_breadcrumb_trails.items():
            summary = trail.get_performance_summary()
            print(f"\n📊 Component: {component_name}")
            print(f"   Operations: {summary['total_operations']}")
            print(f"   Success Rate: {summary['success_rate']:.1f}%")
            print(f"   Uptime: {summary['uptime_seconds']:.1f}s")
            
            if 'latency' in summary:
                lat = summary['latency']
                print(f"   Avg Latency: {lat['avg_ms']:.1f}ms")
                print(f"   Under 500ms: {lat['under_500ms']:.1f}%")
            
            if 'ai_performance' in summary:
                ai_perf = summary['ai_performance']
                print(f"   AI Inference: {ai_perf['avg_inference_ms']:.1f}ms avg")
            
            if 'ai_quality' in summary:
                ai_qual = summary['ai_quality']
                print(f"   AI Confidence: {ai_qual['avg_confidence']:.2f} avg")

def print_ai_recent_failures():
    """Print recent failures across all AI components."""
    print("\n❌ RECENT AI FAILURES")
    print("=" * 30)
    
    with ai_breadcrumb_lock:
        for component_name, trail in ai_breadcrumb_trails.items():
            failures = trail.get_recent_failures(5)
            if failures:
                print(f"\n🔧 {component_name}:")
                for failure in failures:
                    print(f"   LED {failure.led_id}: {failure.operation} - {failure.error}")

def print_ai_latency_violations():
    """Print operations that exceeded latency thresholds."""
    print("\n⚠️ LATENCY VIOLATIONS (>500ms)")
    print("=" * 35)
    
    with ai_breadcrumb_lock:
        for component_name, trail in ai_breadcrumb_trails.items():
            violations = trail.get_latency_violations(500)
            if violations:
                print(f"\n🐌 {component_name}:")
                for violation in violations:
                    latency = violation.performance_metrics.get('latency_ms', 0)
                    print(f"   LED {violation.led_id}: {violation.operation} - {latency:.1f}ms")

if __name__ == "__main__":
    # Example usage for AI transcription system
    trail = AIBreadcrumbTrail("TestAITranscription")
    
    # Simulate AI model loading
    trail.light(AILEDRanges.AI_MODEL_LOADING, "Loading Distil-Whisper model")
    
    # Simulate inference with metrics
    trail.track_ai_inference(
        AILEDRanges.AI_MODEL_INFERENCE_COMPLETE,
        "distil-large-v3",
        confidence=0.92,
        inference_time_ms=234.5,
        input_duration_sec=2.1,
        output_text="Hello, this is a test transcription."
    )
    
    # Simulate latency measurement
    end_latency = trail.measure_latency(
        AILEDRanges.PERFORMANCE_LATENCY_START,
        AILEDRanges.PERFORMANCE_LATENCY_END,
        "end_to_end_transcription"
    )
    
    # Simulate completing the operation
    import time
    time.sleep(0.1)  # Simulate work
    latency = end_latency()  # End measurement
    
    # Print summary
    print("\n" + "=" * 50)
    print("AI TRANSCRIPTION BREADCRUMB SYSTEM DEMO")
    print("=" * 50)
    
    summary = trail.get_performance_summary()
    print(f"Operations completed: {summary['total_operations']}")
    print(f"Success rate: {summary['success_rate']:.1f}%")
    
    if 'latency' in summary:
        print(f"Average latency: {summary['latency']['avg_ms']:.1f}ms")
    
    # Export trace
    trace_file = trail.export_trace()
    print(f"Trace exported to: {trace_file}")