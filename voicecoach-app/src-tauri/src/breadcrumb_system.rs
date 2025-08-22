#![allow(dead_code)]  // These functions are part of the debugging infrastructure

use std::collections::HashMap;
use std::sync::{Arc, Mutex, RwLock};
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use log::{info, error};
use tauri::Manager;

/// Individual breadcrumb entry representing a traced operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Breadcrumb {
    pub id: u16,
    pub name: String,
    pub component: String,
    pub timestamp: u64,
    pub duration_ms: u64,
    pub data: Option<serde_json::Value>,
    pub success: bool,
    pub error: Option<String>,
    pub stack_trace: Option<String>,
}

/// Breadcrumb trail for a specific component/module
pub struct BreadcrumbTrail {
    component_name: String,
    sequence: Arc<Mutex<Vec<Breadcrumb>>>,
    start_time: Instant,
    current_led: Arc<RwLock<Option<u16>>>,
    app_handle: Option<tauri::AppHandle>,
}

impl BreadcrumbTrail {
    /// Create a new breadcrumb trail for a component
    pub fn new(component_name: &str) -> Self {
        let trail = Self {
            component_name: component_name.to_string(),
            sequence: Arc::new(Mutex::new(Vec::new())),
            start_time: Instant::now(),
            current_led: Arc::new(RwLock::new(None)),
            app_handle: None,
        };
        
        // Register with global trail manager
        get_global_manager().lock().unwrap().register_trail(component_name, trail.clone());
        
        trail
    }
    
    /// Create a new breadcrumb trail with app handle for event emission
    pub fn new_with_app_handle(component_name: &str, app_handle: tauri::AppHandle) -> Self {
        let trail = Self {
            component_name: component_name.to_string(),
            sequence: Arc::new(Mutex::new(Vec::new())),
            start_time: Instant::now(),
            current_led: Arc::new(RwLock::new(None)),
            app_handle: Some(app_handle),
        };
        
        // Register with global trail manager
        get_global_manager().lock().unwrap().register_trail(component_name, trail.clone());
        trail
    }
    
    /// Light up an LED with optional data payload
    pub fn light(&self, led_id: u16, data: Option<serde_json::Value>) {
        let led_name = self.get_led_name(led_id);
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        
        let breadcrumb = Breadcrumb {
            id: led_id,
            name: led_name.clone(),
            component: self.component_name.clone(),
            timestamp: current_time,
            duration_ms: self.start_time.elapsed().as_millis() as u64,
            data: data.clone(),
            success: true,
            error: None,
            stack_trace: None,
        };
        
        // Store current LED for potential failure tracking
        *self.current_led.write().unwrap() = Some(led_id);
        
        // Add to sequence
        if let Ok(mut sequence) = self.sequence.lock() {
            sequence.push(breadcrumb.clone());
            
            // Limit trail size to prevent memory growth
            if sequence.len() > 1000 {
                sequence.drain(0..500);
            }
        }
        
        // Console output with LED formatting
        let data_str = data
            .map(|d| format!(" {:?}", d))
            .unwrap_or_default();
        
        info!(
            "💡 {:03} ✅ {} [{}]{}",
            led_id, led_name, self.component_name, data_str
        );
        
        // Emit breadcrumb event to frontend if app handle available
        if let Some(ref app) = self.app_handle {
            let _ = app.emit_all("breadcrumb_event", &breadcrumb);
        }
        
        // Update global trail
        get_global_manager().lock().unwrap().add_breadcrumb(breadcrumb);
    }
    
    /// Mark current operation as failed
    pub fn fail(&self, led_id: u16, error: anyhow::Error) {
        let led_name = self.get_led_name(led_id);
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        
        let error_msg = error.to_string();
        let stack_trace = format!("{:?}", error);
        
        let breadcrumb = Breadcrumb {
            id: led_id,
            name: led_name.clone(),
            component: self.component_name.clone(),
            timestamp: current_time,
            duration_ms: self.start_time.elapsed().as_millis() as u64,
            data: None,
            success: false,
            error: Some(error_msg.clone()),
            stack_trace: Some(stack_trace.clone()),
        };
        
        // Add to sequence
        if let Ok(mut sequence) = self.sequence.lock() {
            sequence.push(breadcrumb.clone());
        }
        
        // Error output with LED formatting
        error!(
            "💡 {:03} ❌ {} [{}] ERROR: {}",
            led_id, led_name, self.component_name, error_msg
        );
        
        // Emit breadcrumb error event to frontend if app handle available
        if let Some(ref app) = self.app_handle {
            let _ = app.emit_all("breadcrumb_event", &breadcrumb);
        }
        
        // Update global trail and failure tracking
        let mut manager = get_global_manager().lock().unwrap();
        manager.add_breadcrumb(breadcrumb.clone());
        manager.add_failure(breadcrumb);
    }
    
    /// Get current LED ID (for failure tracking)
    pub fn get_current_led(&self) -> Option<u16> {
        *self.current_led.read().unwrap()
    }
    
    /// Get LED name based on numbering scheme
    fn get_led_name(&self, led_id: u16) -> String {
        match led_id {
            // 3000-3099: Main initialization and Tauri setup
            3000..=3099 => format!("MAIN_INIT_{}", led_id),
            
            // 3100-3199: Audio device enumeration and selection
            3100..=3199 => format!("DEVICE_ENUM_{}", led_id),
            
            // 3200-3299: Stream creation and lifecycle
            3200..=3299 => format!("STREAM_LIFECYCLE_{}", led_id),
            
            // 3300-3399: Audio processing and sample conversion
            3300..=3399 => format!("AUDIO_PROCESSING_{}", led_id),
            
            // 3400-3499: Async operations and mutex handling
            3400..=3499 => format!("ASYNC_MUTEX_{}", led_id),
            
            // 3500-3599: Error conditions and recovery
            3500..=3599 => format!("ERROR_RECOVERY_{}", led_id),
            
            // 3600-3699: AudioDeviceManager operations (Phase 2 Enhancement)
            3600..=3699 => format!("AUDIO_DEVICE_MGR_{}", led_id),
            
            // 3700-3799: Ring buffer operations (Phase 2 Enhancement)
            3700..=3799 => format!("RING_BUFFER_{}", led_id),
            
            // 3800-3899: Sample format conversions (Phase 2 Enhancement)
            3800..=3899 => format!("SAMPLE_FORMAT_{}", led_id),
            
            // 3900-3999: Audio mixing operations (Phase 2 Enhancement)
            3900..=3999 => format!("AUDIO_MIXER_{}", led_id),
            
            // 4000-4099: Level monitoring (Phase 2 Enhancement)
            4000..=4099 => format!("LEVEL_MONITOR_{}", led_id),
            
            // 4100-4199: WASAPI loopback specific (Phase 2 Enhancement)
            4100..=4199 => format!("WASAPI_LOOPBACK_{}", led_id),
            
            // 4200-4299: Async runtime operations (Phase 3 Integration)
            4200..=4299 => format!("ASYNC_RUNTIME_{}", led_id),
            
            // 4300-4399: Stream lifecycle management (Phase 3 Integration)
            4300..=4399 => format!("STREAM_LIFECYCLE_MGR_{}", led_id),
            
            // 4400-4499: User guidance and error messages (Phase 3 Integration)
            4400..=4499 => format!("USER_GUIDANCE_{}", led_id),
            
            // 4500-4599: Performance monitoring (Phase 3 Integration)
            4500..=4599 => format!("PERFORMANCE_MONITOR_{}", led_id),
            
            // 4600-4699: Error recovery paths (Phase 3 Integration)
            4600..=4699 => format!("ERROR_RECOVERY_PATH_{}", led_id),
            
            // 4700-4799: Integration test tracking (Phase 3 Integration)
            4700..=4799 => format!("INTEGRATION_TEST_{}", led_id),
            
            // Phase 1 LED Range Allocation (Extended to accommodate all operations):
            // 7000-7009: Vosk initialization (Task 1.2 - Vosk Model Manager Initialization)
            7000..=7009 => format!("VOSK_INIT_{}", led_id),
            // 7010-7034: Model download and management operations (Task 1.2 - Vosk Model Download)
            7010..=7034 => format!("MODEL_DOWNLOAD_{}", led_id),
            // 7035-7039: Test operations (Task 1.3 - Standalone Vosk Test)
            7035..=7039 => format!("VOSK_TEST_{}", led_id),
            // 7040-7049: Event emission and reception tracking (Phase 2)
            7040..=7049 => format!("TRANSCRIPTION_EVENT_{}", led_id),
            // 7050-7089: Audio format conversion (Task 1.4 - Audio Format Conversion)
            7050..=7089 => format!("AUDIO_FORMAT_CONVERT_{}", led_id),
            
            // Phase 2 LED Range Allocation - Task 2.2: Main.rs Integration 
            // 7090-7099: Main process integration and command handling
            7090..=7099 => format!("MAIN_INTEGRATION_{}", led_id),
            
            // Phase 3 LED Range Allocation - Task 3.1: Audio Processing CPAL Integration
            // 7100-7109: Audio stream flow and CPAL operations 
            7100..=7109 => format!("CPAL_INTEGRATION_{}", led_id),
            
            // Phase 3 LED Range Allocation - Task 3.2: TranscriptionPanel Frontend Component
            // 7110-7119: Frontend transcription panel operations and UI events
            7110..=7119 => format!("TRANSCRIPTION_UI_{}", led_id),
            
            // Legacy numbering for backward compatibility
            100..=199 => format!("LEGACY_WASAPI_{}", led_id),
            200..=299 => format!("LEGACY_DEVICE_{}", led_id),
            300..=399 => format!("LEGACY_PROCESSING_{}", led_id),
            400..=499 => format!("LEGACY_PYTHON_{}", led_id),
            500..=599 => format!("LEGACY_PERFORMANCE_{}", led_id),
            600..=699 => format!("LEGACY_ERROR_{}", led_id),
            
            _ => format!("OPERATION_{}", led_id),
        }
    }
    
    /// Get all breadcrumbs in this trail
    pub fn get_sequence(&self) -> Vec<Breadcrumb> {
        self.sequence.lock().unwrap().clone()
    }
    
    /// Clear the trail
    pub fn clear(&self) {
        self.sequence.lock().unwrap().clear();
        *self.current_led.write().unwrap() = None;
    }
}

impl Clone for BreadcrumbTrail {
    fn clone(&self) -> Self {
        Self {
            component_name: self.component_name.clone(),
            sequence: self.sequence.clone(),
            start_time: self.start_time,
            current_led: self.current_led.clone(),
            app_handle: self.app_handle.clone(),
        }
    }
}

/// Global trail manager for cross-component debugging
pub struct GlobalTrailManager {
    trails: HashMap<String, BreadcrumbTrail>,
    global_sequence: Vec<Breadcrumb>,
    failures: Vec<Breadcrumb>,
}

impl GlobalTrailManager {
    fn new() -> Self {
        Self {
            trails: HashMap::new(),
            global_sequence: Vec::new(),
            failures: Vec::new(),
        }
    }
    
    fn register_trail(&mut self, component_name: &str, trail: BreadcrumbTrail) {
        self.trails.insert(component_name.to_string(), trail);
    }
    
    fn add_breadcrumb(&mut self, breadcrumb: Breadcrumb) {
        self.global_sequence.push(breadcrumb);
        
        // Limit global sequence size
        if self.global_sequence.len() > 2000 {
            self.global_sequence.drain(0..1000);
        }
    }
    
    fn add_failure(&mut self, breadcrumb: Breadcrumb) {
        self.failures.push(breadcrumb);
        
        // Limit failures list
        if self.failures.len() > 500 {
            self.failures.drain(0..250);
        }
    }
    
    /// Get all trails
    pub fn get_all_trails(&self) -> &HashMap<String, BreadcrumbTrail> {
        &self.trails
    }
    
    /// Get global breadcrumb sequence
    pub fn get_global_sequence(&self) -> &[Breadcrumb] {
        &self.global_sequence
    }
    
    /// Get all failures
    pub fn get_failures(&self) -> &[Breadcrumb] {
        &self.failures
    }
    
    /// Get specific component trail
    pub fn get_component_trail(&self, component: &str) -> Option<Vec<Breadcrumb>> {
        self.trails.get(component).map(|trail| trail.get_sequence())
    }
    
    /// Clear all trails
    pub fn clear_all(&mut self) {
        for trail in self.trails.values() {
            trail.clear();
        }
        self.global_sequence.clear();
        self.failures.clear();
    }
    
    /// Get statistics
    pub fn get_statistics(&self) -> serde_json::Value {
        let total_breadcrumbs = self.global_sequence.len();
        let total_failures = self.failures.len();
        let success_rate = if total_breadcrumbs > 0 {
            ((total_breadcrumbs - total_failures) as f64 / total_breadcrumbs as f64) * 100.0
        } else {
            0.0
        };
        
        let component_stats: HashMap<String, serde_json::Value> = self.trails
            .iter()
            .map(|(name, trail)| {
                let sequence = trail.get_sequence();
                let failures = sequence.iter().filter(|b| !b.success).count();
                let success_rate = if !sequence.is_empty() {
                    ((sequence.len() - failures) as f64 / sequence.len() as f64) * 100.0
                } else {
                    0.0
                };
                
                (name.clone(), serde_json::json!({
                    "total_operations": sequence.len(),
                    "failures": failures,
                    "success_rate": success_rate,
                    "last_operation": sequence.last().map(|b| &b.name)
                }))
            })
            .collect();
        
        serde_json::json!({
            "global_statistics": {
                "total_breadcrumbs": total_breadcrumbs,
                "total_failures": total_failures,
                "success_rate": success_rate,
                "active_components": self.trails.len()
            },
            "component_statistics": component_stats,
            "recent_failures": self.failures.iter().rev().take(10).collect::<Vec<_>>()
        })
    }
}

/// Global trail manager instance  
use std::sync::OnceLock;
static GLOBAL_TRAIL_MANAGER: OnceLock<Mutex<GlobalTrailManager>> = OnceLock::new();

fn get_global_manager() -> &'static Mutex<GlobalTrailManager> {
    GLOBAL_TRAIL_MANAGER.get_or_init(|| {
        Mutex::new(GlobalTrailManager::new())
    })
}

/// Public API functions for external access
pub fn get_global_statistics() -> serde_json::Value {
    get_global_manager().lock().unwrap().get_statistics()
}

pub fn get_all_trails() -> HashMap<String, Vec<Breadcrumb>> {
    let manager = get_global_manager().lock().unwrap();
    manager.trails
        .iter()
        .map(|(name, trail)| (name.clone(), trail.get_sequence()))
        .collect()
}

pub fn get_global_sequence() -> Vec<Breadcrumb> {
    get_global_manager().lock().unwrap().global_sequence.clone()
}

pub fn get_failures() -> Vec<Breadcrumb> {
    get_global_manager().lock().unwrap().failures.clone()
}

pub fn get_component_trail(component: &str) -> Option<Vec<Breadcrumb>> {
    get_global_manager().lock().unwrap().get_component_trail(component)
}

pub fn clear_all_trails() {
    get_global_manager().lock().unwrap().clear_all();
}

/// Macro for easy LED lighting with automatic error handling
#[macro_export]
macro_rules! led_light {
    ($trail:expr, $led_id:expr) => {
        $trail.light($led_id, None)
    };
    ($trail:expr, $led_id:expr, $data:expr) => {
        $trail.light($led_id, Some($data))
    };
}

/// Macro for easy LED failure tracking
#[macro_export]
macro_rules! led_fail {
    ($trail:expr, $led_id:expr, $error:expr) => {
        $trail.fail($led_id, anyhow::anyhow!($error))
    };
}

/// Macro for operations with automatic success/failure LED tracking
#[macro_export]
macro_rules! led_operation {
    ($trail:expr, $led_id:expr, $operation:expr) => {{
        led_light!($trail, $led_id);
        match $operation {
            Ok(result) => {
                led_light!($trail, $led_id + 1, {"status": "success"});
                Ok(result)
            }
            Err(error) => {
                $trail.fail($led_id + 1, error);
                Err(anyhow::anyhow!("Operation failed at LED {}", $led_id))
            }
        }
    }};
    ($trail:expr, $led_id:expr, $operation:expr, $data:expr) => {{
        led_light!($trail, $led_id, $data);
        match $operation {
            Ok(result) => {
                led_light!($trail, $led_id + 1, {"status": "success", "result": result});
                Ok(result)
            }
            Err(error) => {
                $trail.fail($led_id + 1, error);
                Err(anyhow::anyhow!("Operation failed at LED {}", $led_id))
            }
        }
    }};
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_breadcrumb_trail_creation() {
        let trail = BreadcrumbTrail::new("TestComponent");
        assert_eq!(trail.component_name, "TestComponent");
        assert_eq!(trail.get_sequence().len(), 0);
    }
    
    #[test]
    fn test_led_lighting() {
        let trail = BreadcrumbTrail::new("TestComponent");
        trail.light(100, Some(serde_json::json!({"test": "data"})));
        
        let sequence = trail.get_sequence();
        assert_eq!(sequence.len(), 1);
        assert_eq!(sequence[0].id, 100);
        assert_eq!(sequence[0].success, true);
    }
    
    #[test]
    fn test_led_failure() {
        let trail = BreadcrumbTrail::new("TestComponent");
        trail.fail(200, anyhow::anyhow!("Test error"));
        
        let sequence = trail.get_sequence();
        assert_eq!(sequence.len(), 1);
        assert_eq!(sequence[0].id, 200);
        assert_eq!(sequence[0].success, false);
        assert!(sequence[0].error.is_some());
    }
    
    #[test]
    fn test_led_naming() {
        let trail = BreadcrumbTrail::new("TestComponent");
        assert!(trail.get_led_name(150).contains("LEGACY_WASAPI"));
        assert!(trail.get_led_name(250).contains("LEGACY_DEVICE"));
        assert!(trail.get_led_name(350).contains("LEGACY_PROCESSING"));
        assert!(trail.get_led_name(450).contains("LEGACY_PYTHON"));
        assert!(trail.get_led_name(550).contains("LEGACY_PERFORMANCE"));
    }
}