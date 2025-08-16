use std::collections::HashMap;
use std::sync::{Arc, Mutex, RwLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use log::{info, warn, error, debug};
use anyhow::Result;

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
}

impl BreadcrumbTrail {
    /// Create a new breadcrumb trail for a component
    pub fn new(component_name: &str) -> Self {
        let trail = Self {
            component_name: component_name.to_string(),
            sequence: Arc::new(Mutex::new(Vec::new())),
            start_time: Instant::now(),
            current_led: Arc::new(RwLock::new(None)),
        };
        
        // Register with global trail manager
        GLOBAL_TRAIL_MANAGER.lock().unwrap().register_trail(component_name, trail.clone());
        
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
        
        // Update global trail
        GLOBAL_TRAIL_MANAGER.lock().unwrap().add_breadcrumb(breadcrumb);
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
        
        // Update global trail and failure tracking
        let mut manager = GLOBAL_TRAIL_MANAGER.lock().unwrap();
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
            // 100-199: WASAPI Audio System Operations
            100..=199 => format!("WASAPI_AUDIO_{}", led_id),
            
            // 200-299: Device Management & Enumeration
            200..=299 => format!("DEVICE_MGMT_{}", led_id),
            
            // 300-399: Audio Processing & Pipeline
            300..=399 => format!("AUDIO_PROCESSING_{}", led_id),
            
            // 400-499: Python Bridge Communication
            400..=499 => format!("PYTHON_BRIDGE_{}", led_id),
            
            // 500-599: Performance & Latency Monitoring
            500..=599 => format!("PERFORMANCE_{}", led_id),
            
            // 600-699: Error Recovery & Validation
            600..=699 => format!("ERROR_RECOVERY_{}", led_id),
            
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
static GLOBAL_TRAIL_MANAGER: Mutex<GlobalTrailManager> = Mutex::new(GlobalTrailManager {
    trails: HashMap::new(),
    global_sequence: Vec::new(),
    failures: Vec::new(),
});

/// Public API functions for external access
pub fn get_global_statistics() -> serde_json::Value {
    GLOBAL_TRAIL_MANAGER.lock().unwrap().get_statistics()
}

pub fn get_all_trails() -> HashMap<String, Vec<Breadcrumb>> {
    let manager = GLOBAL_TRAIL_MANAGER.lock().unwrap();
    manager.trails
        .iter()
        .map(|(name, trail)| (name.clone(), trail.get_sequence()))
        .collect()
}

pub fn get_global_sequence() -> Vec<Breadcrumb> {
    GLOBAL_TRAIL_MANAGER.lock().unwrap().global_sequence.clone()
}

pub fn get_failures() -> Vec<Breadcrumb> {
    GLOBAL_TRAIL_MANAGER.lock().unwrap().failures.clone()
}

pub fn get_component_trail(component: &str) -> Option<Vec<Breadcrumb>> {
    GLOBAL_TRAIL_MANAGER.lock().unwrap().get_component_trail(component)
}

pub fn clear_all_trails() {
    GLOBAL_TRAIL_MANAGER.lock().unwrap().clear_all();
}

/// Macro for easy LED lighting with automatic error handling
#[macro_export]
macro_rules! led_light {
    ($trail:expr, $led_id:expr) => {
        $trail.light($led_id, None)
    };
    ($trail:expr, $led_id:expr, $data:expr) => {
        $trail.light($led_id, Some(serde_json::to_value($data).unwrap_or(serde_json::Value::Null)))
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
        assert!(trail.get_led_name(150).contains("WASAPI_AUDIO"));
        assert!(trail.get_led_name(250).contains("DEVICE_MGMT"));
        assert!(trail.get_led_name(350).contains("AUDIO_PROCESSING"));
        assert!(trail.get_led_name(450).contains("PYTHON_BRIDGE"));
        assert!(trail.get_led_name(550).contains("PERFORMANCE"));
    }
}