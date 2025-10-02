#!/usr/bin/env python3
"""
Tauri Bridge for VoiceCoach Audio Processing
Provides IPC interface between Rust/Tauri backend and Python transcription pipeline
"""

import argparse
import json
import sys
import threading
import time
import queue
import signal
import logging
from enhanced_transcription_pipeline import EnhancedTranscriptionPipeline
from enhanced_audio_capture import EnhancedAudioCapture

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TauriBridge")

class TauriBridge:
    """
    Bridge between Tauri/Rust backend and Python transcription pipeline
    Uses stdin/stdout for IPC communication
    """
    
    def __init__(self, sample_rate=16000, model="distil-large-v3"):
        self.sample_rate = sample_rate
        self.model = model
        self.pipeline = None
        self.running = False
        self.transcription_queue = queue.Queue()
        
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        logger.info(f"TauriBridge initialized - Sample Rate: {sample_rate}Hz, Model: {model}")
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully"""
        logger.info(f"Received signal {signum}, shutting down...")
        self.stop()
        sys.exit(0)
    
    def send_message(self, message_type: str, data: any):
        """Send JSON message to Tauri backend via stdout"""
        message = {
            "type": message_type,
            "timestamp": int(time.time() * 1000),
            "data": data
        }
        try:
            json_str = json.dumps(message)
            print(json_str, flush=True)
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
    
    def process_commands(self):
        """Process commands from Tauri backend via stdin"""
        logger.info("Starting command processing loop...")
        
        while self.running:
            try:
                # Read command from stdin (non-blocking with timeout)
                line = sys.stdin.readline().strip()
                if not line:
                    time.sleep(0.1)
                    continue
                
                try:
                    command = json.loads(line)
                    self.handle_command(command)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON command: {e}")
                    self.send_message("error", {"message": f"Invalid JSON: {e}"})
                    
            except EOFError:
                logger.info("Stdin closed, shutting down...")
                break
            except Exception as e:
                logger.error(f"Error processing commands: {e}")
                time.sleep(0.5)
    
    def handle_command(self, command: dict):
        """Handle individual commands from Tauri"""
        cmd_type = command.get("type")
        cmd_data = command.get("data", {})
        
        logger.debug(f"Handling command: {cmd_type}")
        
        if cmd_type == "start_transcription":
            self.start_transcription(cmd_data)
        elif cmd_type == "stop_transcription":
            self.stop_transcription()
        elif cmd_type == "get_status":
            self.send_status()
        elif cmd_type == "ping":
            self.send_message("pong", {"message": "Bridge is alive"})
        else:
            logger.warning(f"Unknown command type: {cmd_type}")
            self.send_message("error", {"message": f"Unknown command: {cmd_type}"})
    
    def start_transcription(self, config: dict):
        """Start the enhanced transcription pipeline"""
        try:
            if self.pipeline:
                logger.warning("Transcription already running")
                self.send_message("error", {"message": "Transcription already active"})
                return
            
            # Extract enhanced configuration
            model_name = config.get("model", self.model)
            language = config.get("language", "en")
            beam_size = config.get("beam_size", 5)
            use_gpu = config.get("use_gpu", True)
            batch_size = config.get("batch_size", 8)
            vad_threshold = config.get("vad_threshold", 0.6)
            latency_target_ms = config.get("latency_target_ms", 500.0)
            enable_batching = config.get("enable_batching", True)
            dual_channel = config.get("dual_channel", True)
            
            logger.info(f"Starting enhanced transcription with model: {model_name}")
            logger.info(f"Target latency: {latency_target_ms}ms, Dual-channel: {dual_channel}")
            
            # Initialize enhanced pipeline
            self.pipeline = EnhancedTranscriptionPipeline(
                model_name=model_name,
                language=language,
                sample_rate=self.sample_rate,
                beam_size=beam_size,
                use_gpu=use_gpu,
                batch_size=batch_size,
                vad_threshold=vad_threshold,
                latency_target_ms=latency_target_ms,
                enable_batching=enable_batching,
                dual_channel=dual_channel
            )
            
            # Start pipeline
            self.pipeline.start()
            
            # Start enhanced transcription monitoring thread
            threading.Thread(target=self.monitor_enhanced_transcriptions, daemon=True).start()
            
            self.send_message("transcription_started", {
                "model": model_name,
                "language": language,
                "sample_rate": self.sample_rate,
                "latency_target_ms": latency_target_ms,
                "dual_channel": dual_channel,
                "batching_enabled": enable_batching
            })
            
            logger.info("Enhanced transcription pipeline started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start transcription: {e}")
            self.send_message("error", {"message": f"Transcription start failed: {str(e)}"})
    
    def stop_transcription(self):
        """Stop the transcription pipeline"""
        try:
            if not self.pipeline:
                logger.warning("No transcription to stop")
                self.send_message("error", {"message": "No active transcription"})
                return
            
            logger.info("Stopping transcription pipeline...")
            self.pipeline.stop()
            self.pipeline = None
            
            self.send_message("transcription_stopped", {"message": "Transcription stopped successfully"})
            logger.info("Transcription pipeline stopped")
            
        except Exception as e:
            logger.error(f"Failed to stop transcription: {e}")
            self.send_message("error", {"message": f"Transcription stop failed: {str(e)}"})
    
    def monitor_enhanced_transcriptions(self):
        """Monitor enhanced transcription results and send to Tauri"""
        logger.info("Starting enhanced transcription monitoring...")
        
        transcription_count = 0
        last_performance_report = time.time()
        
        while self.pipeline and self.running:
            try:
                # Get enhanced transcription result (blocking with timeout)
                result, latency = self.pipeline.get_transcription(block=True, timeout=0.5)
                
                if result:
                    transcription_count += 1
                    
                    # Send enhanced transcription to Tauri
                    self.send_message("transcription_result", {
                        "text": result.text,
                        "latency_ms": result.latency_ms,
                        "timestamp": result.timestamp,
                        "confidence": result.confidence,
                        "is_user": result.is_user,
                        "speaker_id": result.speaker_id,
                        "audio_channel": result.audio_channel,
                        "vad_confidence": result.vad_confidence,
                        "word_count": result.word_count,
                        "audio_quality": result.audio_quality
                    })
                    
                    # Log with performance status
                    speaker = "User" if result.is_user else "Prospect"
                    status = "✅" if result.latency_ms <= 500 else "⚠️"
                    logger.debug(f"{status} {speaker}: '{result.text}' | Latency: {result.latency_ms:.1f}ms | Confidence: {result.confidence:.2f}")
                
                # Send performance metrics every 30 seconds
                if time.time() - last_performance_report >= 30.0:
                    try:
                        metrics = self.pipeline.get_performance_metrics()
                        self.send_message("performance_metrics", {
                            "average_latency_ms": metrics.get("average_latency_ms", 0),
                            "target_latency_ms": metrics.get("target_latency_ms", 500),
                            "target_met_percentage": metrics.get("target_met_percentage", 0),
                            "transcriptions_completed": metrics.get("transcriptions_completed", 0),
                            "uptime_seconds": metrics.get("uptime_seconds", 0),
                            "throughput_per_second": metrics.get("throughput_per_second", 0)
                        })
                        last_performance_report = time.time()
                        logger.info(f"Performance: {metrics.get('average_latency_ms', 0):.1f}ms avg latency, {metrics.get('target_met_percentage', 0):.1f}% target met")
                    except Exception as e:
                        logger.warning(f"Error getting performance metrics: {e}")
                
            except Exception as e:
                logger.error(f"Error monitoring transcriptions: {e}")
                time.sleep(0.5)
        
        logger.info("Enhanced transcription monitoring stopped")
    
    def monitor_transcriptions(self):
        """Legacy transcription monitoring (fallback)"""
        return self.monitor_enhanced_transcriptions()
    
    def send_status(self):
        """Send current status to Tauri"""
        status = {
            "transcription_active": self.pipeline is not None,
            "model": self.model,
            "sample_rate": self.sample_rate,
            "uptime": int(time.time() * 1000) if self.running else 0
        }
        self.send_message("status", status)
    
    def run(self):
        """Main run loop"""
        logger.info("Starting Tauri bridge...")
        self.running = True
        
        # Send initialization message
        self.send_message("bridge_ready", {
            "message": "Python transcription bridge ready",
            "version": "1.0.0",
            "capabilities": ["transcription", "audio_processing", "real_time"]
        })
        
        # Start command processing
        try:
            self.process_commands()
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the bridge"""
        logger.info("Stopping Tauri bridge...")
        self.running = False
        
        if self.pipeline:
            try:
                self.pipeline.stop()
            except Exception as e:
                logger.error(f"Error stopping pipeline: {e}")
        
        self.send_message("bridge_stopped", {"message": "Python bridge shutting down"})
        logger.info("Tauri bridge stopped")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="VoiceCoach Tauri Bridge")
    parser.add_argument("--mode", default="ipc", help="Operating mode (ipc, standalone)")
    parser.add_argument("--sample-rate", type=int, default=16000, help="Audio sample rate")
    parser.add_argument("--model", default="distil-large-v3", help="Whisper model to use")
    parser.add_argument("--log-level", default="INFO", help="Logging level")
    
    args = parser.parse_args()
    
    # Set logging level
    logging.getLogger().setLevel(getattr(logging, args.log_level.upper()))
    
    if args.mode == "ipc":
        # IPC mode for Tauri integration
        bridge = TauriBridge(sample_rate=args.sample_rate, model=args.model)
        bridge.run()
    else:
        # Standalone mode for testing
        logger.info("Running in standalone mode (testing)")
        bridge = TauriBridge(sample_rate=args.sample_rate, model=args.model)
        bridge.running = True
        
        # Test transcription
        bridge.start_transcription({
            "model": args.model,
            "language": "en",
            "beam_size": 5,
            "use_gpu": True
        })
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            bridge.stop()

if __name__ == "__main__":
    main()