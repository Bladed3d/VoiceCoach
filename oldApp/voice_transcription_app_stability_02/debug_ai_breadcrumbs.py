#!/usr/bin/env python3
"""
AI Transcription Debugging Script
LED Light Trail Analysis for Faster-Whisper Integration

This script provides comprehensive debugging tools for the AI-powered voice transcription system.
It analyzes breadcrumb trails, identifies performance bottlenecks, and generates detailed reports.
"""

import sys
import time
import json
from typing import Dict, List, Any
from ai_breadcrumb_system import (
    get_all_ai_trails, 
    print_ai_performance_summary,
    print_ai_recent_failures,
    print_ai_latency_violations,
    export_all_traces,
    AILEDRanges
)

def analyze_transcription_performance():
    """
    Analyze transcription performance across all components.
    """
    print("\n" + "="*70)
    print("🎯 AI TRANSCRIPTION PERFORMANCE ANALYSIS")
    print("="*70)
    
    trails = get_all_ai_trails()
    
    if not trails:
        print("❌ No AI breadcrumb trails found. Run the transcription app first.")
        return
    
    total_operations = 0
    total_failures = 0
    all_latencies = []
    ai_inference_times = []
    
    for component_name, trail in trails.items():
        summary = trail.get_performance_summary()
        total_operations += summary['total_operations']
        total_failures += summary['failed_operations']
        
        print(f"\n📊 {component_name}:")
        print(f"   🔧 Total Operations: {summary['total_operations']}")
        print(f"   ✅ Success Rate: {summary['success_rate']:.1f}%")
        print(f"   ⏱️  Uptime: {summary['uptime_seconds']:.1f} seconds")
        
        if 'latency' in summary:
            lat = summary['latency']
            print(f"   🚀 Average Latency: {lat['avg_ms']:.1f}ms")
            print(f"   ⚡ Real-time Performance: {lat['under_500ms']:.1f}% under 500ms")
            all_latencies.extend([m['latency_ms'] for m in trail.latency_measurements])
        
        if 'ai_performance' in summary:
            ai_perf = summary['ai_performance']
            print(f"   🤖 AI Inference: {ai_perf['avg_inference_ms']:.1f}ms average")
            ai_inference_times.extend(trail.model_inference_times)
        
        if 'ai_quality' in summary:
            ai_qual = summary['ai_quality']
            print(f"   🎯 AI Confidence: {ai_qual['avg_confidence']:.2f}")
            print(f"   📈 High Confidence Rate: {ai_qual['high_confidence_rate']:.1f}%")
    
    # Overall system analysis
    print(f"\n📈 SYSTEM-WIDE ANALYSIS:")
    print(f"   🔢 Total Operations: {total_operations}")
    print(f"   ❌ Total Failures: {total_failures}")
    system_success_rate = ((total_operations - total_failures) / total_operations * 100) if total_operations > 0 else 0
    print(f"   ✅ System Success Rate: {system_success_rate:.1f}%")
    
    if all_latencies:
        avg_latency = sum(all_latencies) / len(all_latencies)
        max_latency = max(all_latencies)
        realtime_performance = len([l for l in all_latencies if l < 500]) / len(all_latencies) * 100
        print(f"   ⏱️  System Average Latency: {avg_latency:.1f}ms")
        print(f"   🐌 Worst Latency: {max_latency:.1f}ms") 
        print(f"   ⚡ Real-time Performance: {realtime_performance:.1f}% under 500ms")
    
    if ai_inference_times:
        avg_ai_time = sum(ai_inference_times) / len(ai_inference_times)
        print(f"   🤖 System AI Inference: {avg_ai_time:.1f}ms average")

def analyze_led_coverage():
    """
    Analyze LED coverage across the transcription pipeline.
    """
    print("\n" + "="*70)
    print("💡 LED BREADCRUMB COVERAGE ANALYSIS")
    print("="*70)
    
    trails = get_all_ai_trails()
    
    if not trails:
        print("❌ No breadcrumb trails to analyze.")
        return
    
    # LED usage statistics
    led_usage = {}
    led_ranges = {
        'Audio Capture (100-199)': range(100, 200),
        'AI Model Operations (200-299)': range(200, 300),
        'Transcription Pipeline (300-399)': range(300, 400),
        'Performance Monitoring (400-499)': range(400, 500),
        'Speaker Identification (500-599)': range(500, 600),
        'IPC Communication (600-699)': range(600, 700)
    }
    
    for component_name, trail in trails.items():
        print(f"\n🔧 {component_name} LED Usage:")
        
        component_leds = {}
        for breadcrumb in trail.breadcrumbs:
            led_id = breadcrumb.led_id
            if led_id not in component_leds:
                component_leds[led_id] = 0
            component_leds[led_id] += 1
        
        # Sort by LED ID and display usage
        for led_id in sorted(component_leds.keys()):
            count = component_leds[led_id]
            print(f"   💡 LED {led_id:03d}: {count} times")
        
        # Check coverage by range
        for range_name, led_range in led_ranges.items():
            range_coverage = len([led for led in component_leds.keys() if led in led_range])
            if range_coverage > 0:
                print(f"   📊 {range_name}: {range_coverage} LEDs active")

def find_critical_failures():
    """
    Find and analyze critical failures in the AI transcription system.
    """
    print("\n" + "="*70)
    print("🚨 CRITICAL FAILURE ANALYSIS")
    print("="*70)
    
    trails = get_all_ai_trails()
    
    critical_failures = []
    ai_model_failures = []
    performance_failures = []
    
    for component_name, trail in trails.items():
        failures = trail.get_recent_failures(20)  # Get more failures for analysis
        
        for failure in failures:
            # Categorize failures
            if 200 <= failure.led_id <= 299:  # AI Model range
                ai_model_failures.append((component_name, failure))
            elif failure.performance_metrics and failure.performance_metrics.get('latency_ms', 0) > 1000:
                performance_failures.append((component_name, failure))
            else:
                critical_failures.append((component_name, failure))
    
    # Report AI model failures
    if ai_model_failures:
        print(f"\n🤖 AI MODEL FAILURES ({len(ai_model_failures)}):")
        for component, failure in ai_model_failures[-5:]:  # Show last 5
            print(f"   ❌ {component} LED {failure.led_id}: {failure.operation}")
            print(f"      Error: {failure.error}")
            print(f"      Time: {time.ctime(failure.timestamp)}")
    
    # Report performance failures
    if performance_failures:
        print(f"\n🐌 PERFORMANCE FAILURES ({len(performance_failures)}):")
        for component, failure in performance_failures[-5:]:
            latency = failure.performance_metrics.get('latency_ms', 0)
            print(f"   ⏱️  {component} LED {failure.led_id}: {failure.operation}")
            print(f"      Latency: {latency:.1f}ms (over 1000ms threshold)")
            print(f"      Time: {time.ctime(failure.timestamp)}")
    
    # Report other critical failures
    if critical_failures:
        print(f"\n🚨 OTHER CRITICAL FAILURES ({len(critical_failures)}):")
        for component, failure in critical_failures[-5:]:
            print(f"   ❌ {component} LED {failure.led_id}: {failure.operation}")
            print(f"      Error: {failure.error}")
            print(f"      Time: {time.ctime(failure.timestamp)}")
    
    if not (critical_failures or ai_model_failures or performance_failures):
        print("✅ No critical failures detected. System is operating normally.")

def generate_performance_report():
    """
    Generate a comprehensive performance report for the AI transcription system.
    """
    print("\n" + "="*70)
    print("📋 COMPREHENSIVE PERFORMANCE REPORT")
    print("="*70)
    
    trails = get_all_ai_trails()
    
    if not trails:
        print("❌ No data available for report generation.")
        return
    
    report = {
        'timestamp': time.time(),
        'system_status': 'operational',
        'components': {},
        'system_metrics': {},
        'recommendations': []
    }
    
    total_operations = 0
    total_failures = 0
    all_latencies = []
    
    for component_name, trail in trails.items():
        summary = trail.get_performance_summary()
        report['components'][component_name] = summary
        
        total_operations += summary['total_operations']
        total_failures += summary['failed_operations']
        
        if 'latency' in summary:
            all_latencies.extend([m['latency_ms'] for m in trail.latency_measurements])
    
    # System-wide metrics
    report['system_metrics'] = {
        'total_operations': total_operations,
        'total_failures': total_failures,
        'system_success_rate': ((total_operations - total_failures) / total_operations * 100) if total_operations > 0 else 0
    }
    
    if all_latencies:
        report['system_metrics']['average_latency_ms'] = sum(all_latencies) / len(all_latencies)
        report['system_metrics']['max_latency_ms'] = max(all_latencies)
        report['system_metrics']['realtime_performance_percent'] = len([l for l in all_latencies if l < 500]) / len(all_latencies) * 100
    
    # Generate recommendations
    if report['system_metrics'].get('realtime_performance_percent', 100) < 95:
        report['recommendations'].append("⚠️  Consider optimizing for better real-time performance (target: >95% under 500ms)")
    
    if report['system_metrics'].get('system_success_rate', 100) < 98:
        report['recommendations'].append("🔧 Investigate failure patterns to improve system reliability (target: >98% success rate)")
    
    avg_latency = report['system_metrics'].get('average_latency_ms', 0)
    if avg_latency > 300:
        report['recommendations'].append(f"🚀 Average latency ({avg_latency:.1f}ms) is high. Consider model optimization or hardware upgrades.")
    
    # Display report
    print(f"\n⏰ Report Generated: {time.ctime(report['timestamp'])}")
    print(f"🔧 System Status: {report['system_status'].upper()}")
    print(f"\n📊 SYSTEM METRICS:")
    for metric, value in report['system_metrics'].items():
        if isinstance(value, float):
            print(f"   {metric}: {value:.2f}")
        else:
            print(f"   {metric}: {value}")
    
    if report['recommendations']:
        print(f"\n💡 RECOMMENDATIONS:")
        for rec in report['recommendations']:
            print(f"   {rec}")
    else:
        print(f"\n✅ System is performing optimally. No recommendations.")
    
    # Save report to file
    timestamp = int(time.time())
    report_file = f"ai_transcription_report_{timestamp}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\n💾 Report saved to: {report_file}")

def interactive_debug_session():
    """
    Interactive debugging session for the AI transcription system.
    """
    print("\n" + "="*70)
    print("🔧 INTERACTIVE AI TRANSCRIPTION DEBUG SESSION")
    print("="*70)
    
    while True:
        print("\n📋 Available Commands:")
        print("   1. Performance Analysis")
        print("   2. LED Coverage Analysis") 
        print("   3. Critical Failures")
        print("   4. Recent Failures")
        print("   5. Latency Violations")
        print("   6. Generate Report")
        print("   7. Export All Traces")
        print("   8. Live Performance Summary")
        print("   9. Exit")
        
        try:
            choice = input("\n🎯 Enter command (1-9): ").strip()
            
            if choice == "1":
                analyze_transcription_performance()
            elif choice == "2":
                analyze_led_coverage()
            elif choice == "3":
                find_critical_failures()
            elif choice == "4":
                print_ai_recent_failures()
            elif choice == "5":
                print_ai_latency_violations()
            elif choice == "6":
                generate_performance_report()
            elif choice == "7":
                files = export_all_traces()
                print(f"\n💾 Exported {len(files)} trace files:")
                for file in files:
                    print(f"   📄 {file}")
            elif choice == "8":
                print_ai_performance_summary()
            elif choice == "9":
                print("\n👋 Exiting debug session. Happy debugging!")
                break
            else:
                print("❌ Invalid choice. Please enter 1-9.")
                
        except KeyboardInterrupt:
            print("\n\n👋 Debug session interrupted. Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {str(e)}")

def main():
    """
    Main debugging interface.
    """
    print("🤖 AI TRANSCRIPTION DEBUGGING TOOL")
    print("="*50)
    print("This tool analyzes LED breadcrumb trails from the Faster-Whisper integration.")
    print("Run the transcription app first to generate debugging data.")
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "performance":
            analyze_transcription_performance()
        elif command == "coverage":
            analyze_led_coverage()
        elif command == "failures":
            find_critical_failures()
        elif command == "report":
            generate_performance_report()
        elif command == "export":
            files = export_all_traces()
            print(f"Exported {len(files)} trace files.")
        else:
            print(f"❌ Unknown command: {command}")
            print("Available commands: performance, coverage, failures, report, export")
    else:
        interactive_debug_session()

if __name__ == "__main__":
    main()