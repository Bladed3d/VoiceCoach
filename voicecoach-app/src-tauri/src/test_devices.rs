use crate::breadcrumb_system::BreadcrumbTrail;
use crate::led_light;
use log::info;

pub fn test_device_enumeration() {
    let trail = BreadcrumbTrail::new("TestDeviceEnumeration");
    led_light!(trail, 9000, serde_json::json!({"test": "device_enumeration_started"}));
    
    info!("Testing audio device enumeration...");
    
    use cpal::traits::{DeviceTrait, HostTrait};
    
    led_light!(trail, 9001, serde_json::json!({"step": "cpal_host_init"}));
    let host = cpal::default_host();
    
    led_light!(trail, 9002, serde_json::json!({"step": "input_device_scan"}));
    match host.input_devices() {
        Ok(devices) => {
            let mut count = 0;
            for device in devices {
                if let Ok(name) = device.name() {
                    count += 1;
                    led_light!(trail, 9003, serde_json::json!({"device_found": name, "count": count}));
                    info!("Found input device: {}", name);
                }
            }
            led_light!(trail, 9004, serde_json::json!({"total_input_devices": count}));
            info!("Total input devices found: {}", count);
        }
        Err(e) => {
            crate::led_fail!(trail, 9002, format!("Failed to enumerate input devices: {}", e));
        }
    }
    
    led_light!(trail, 9005, serde_json::json!({"step": "output_device_scan"}));
    match host.output_devices() {
        Ok(devices) => {
            let mut count = 0;
            for device in devices {
                if let Ok(name) = device.name() {
                    count += 1;
                    led_light!(trail, 9006, serde_json::json!({"output_device_found": name, "count": count}));
                    info!("Found output device: {}", name);
                }
            }
            led_light!(trail, 9007, serde_json::json!({"total_output_devices": count}));
            info!("Total output devices found: {}", count);
        }
        Err(e) => {
            crate::led_fail!(trail, 9005, format!("Failed to enumerate output devices: {}", e));
        }
    }
    
    led_light!(trail, 9008, serde_json::json!({"test": "device_enumeration_completed"}));
    info!("Device enumeration test completed successfully");
}

pub fn test_breadcrumb_system() {
    let trail = BreadcrumbTrail::new("TestBreadcrumbSystem");
    led_light!(trail, 9100, serde_json::json!({"test": "breadcrumb_system_started"}));
    
    info!("Testing LED breadcrumb system...");
    
    led_light!(trail, 9101, serde_json::json!({"operation": "test_light_1"}));
    led_light!(trail, 9102, serde_json::json!({"operation": "test_light_2", "data": "sample_data"}));
    led_light!(trail, 9103, serde_json::json!({"operation": "test_light_3", "number": 42}));
    
    // Test failure case
    crate::led_fail!(trail, 9104, "This is a test failure - not a real error");
    
    led_light!(trail, 9105, serde_json::json!({"test": "breadcrumb_system_completed"}));
    info!("Breadcrumb system test completed successfully");
}