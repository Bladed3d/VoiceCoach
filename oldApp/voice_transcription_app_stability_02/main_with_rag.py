"""
Enhanced Voice Transcription App with ChromaDB RAG System and LED Debugging

This is the main application file that integrates the existing voice transcription system
with the new ChromaDB RAG system for real-time sales coaching.

Features:
- Real-time voice transcription with Faster-Whisper
- ChromaDB vector database for knowledge storage
- Semantic search and coaching prompt generation
- LED debugging infrastructure for performance monitoring
- Enhanced UI with coaching panel
- Tauri backend integration ready

LED Trail Access:
- Console output shows all LED debugging information
- Access debug commands: debug.get_global_trail(), debug.get_failures(), etc.
"""

import os
import sys
import tkinter as tk
import customtkinter as ctk
from transcription_pipeline import TranscriptionPipeline
import threading
import queue
import time
import torch
import traceback
import logging
import json
from faster_whisper import WhisperModel

# Import RAG system components
from chroma_rag_system import ChromaDBRAGSystem
from knowledge_manager import KnowledgeManager, setup_knowledge_base
from voice_coaching_integration import VoiceCoachingIntegrator, TauriIntegrationLayer, initialize_voice_coaching_system
from breadcrumb_system import BreadcrumbTrail, debug

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("VoiceCoachingApp")


class EnhancedVoiceTranscriptionApp:
    """
    Enhanced Voice Transcription App with ChromaDB RAG system integration.
    Provides real-time coaching based on conversation analysis.
    """
    SETTINGS_FILE = "coaching_settings.json"
    
    def __init__(self, root, width=1200, height=800, font_size=16):
        """
        Initialize the enhanced app with RAG system.
        
        Args:
            root: Tkinter root window
            width (int): Window width
            height (int): Window height  
            font_size (int): Font size for text
        """
        self.trail = BreadcrumbTrail("EnhancedVoiceApp")
        self.trail.light(100, {"action": "app_initialization_start"})
        
        self.root = root
        self.width = width
        self.height = height
        self.font_size = font_size
        
        self.root.title("Voice Transcription with AI Coaching")
        self.root.geometry(f"{width}x{height}")
        
        ctk.set_appearance_mode("System")
        ctk.set_default_color_theme("blue")
        
        # Original transcription components
        self.pipeline = None
        self.is_transcribing = False
        self.update_queue = queue.Queue()
        self.latency_values = []
        self.max_latency_values = 20
        self.root.report_callback_exception = self.handle_exception
        self.loaded_model = None
        self.loaded_model_key = None
        
        # New RAG system components
        self.rag_system = None
        self.voice_integrator = None
        self.tauri_integration = None
        self.current_session_id = None
        self.coaching_enabled = False
        
        try:
            self.create_widgets()
            self.load_settings()
            
            # Initialize RAG system in background
            self.trail.light(101, {"action": "rag_system_initialization"})
            threading.Thread(target=self._initialize_rag_system, daemon=True).start()
            
            # Load the initial model in the background
            self.load_model_in_background(self.model_var.get(), self.use_gpu_var.get())
            
            self.update_transcription()
            
            self.trail.light(102, {"status": "app_initialization_complete"})
            
        except Exception as e:
            self.trail.fail(100, e, traceback.format_exc())
            raise
    
    def _initialize_rag_system(self):
        """Initialize the RAG system in background thread."""
        try:
            self.trail.light(103, {"action": "rag_background_init_start"})
            
            # Initialize complete coaching system
            system_components = initialize_voice_coaching_system("./coaching_chroma_db")
            
            self.rag_system = system_components["rag_system"]
            self.voice_integrator = system_components["voice_integrator"]
            self.tauri_integration = system_components["tauri_integration"]
            
            # Update UI to show RAG system is ready
            self.update_queue.put(("rag_ready", None))
            
            self.trail.light(104, {"status": "rag_system_ready"})
            
        except Exception as e:
            self.trail.fail(103, e, traceback.format_exc())
            self.update_queue.put(("rag_error", str(e)))
    
    def create_widgets(self):
        """Create UI widgets including new coaching panel."""
        try:
            # Create main container with paned window for split layout
            self.main_paned = ctk.CTkFrame(self.root)
            self.main_paned.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
            
            # Left panel for transcription (existing functionality)
            self.left_frame = ctk.CTkFrame(self.main_paned)
            self.left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 5))
            
            # Right panel for coaching system
            self.right_frame = ctk.CTkFrame(self.main_paned)
            self.right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=(5, 0))
            
            self._create_transcription_panel()
            self._create_coaching_panel()
            
        except Exception as e:
            logger.error(f"Error creating widgets: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def _create_transcription_panel(self):
        """Create the transcription panel (left side)."""
        # Title
        self.title_label = ctk.CTkLabel(
            self.left_frame, 
            text="Real-time Voice Transcription",
            font=ctk.CTkFont(size=self.font_size + 6, weight="bold")
        )
        self.title_label.pack(pady=10)
        
        # GPU info
        gpu_info = "GPU: Not detected"
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            gpu_info = f"GPU: {gpu_name} ({gpu_memory:.1f} GB)"
        
        self.gpu_label = ctk.CTkLabel(
            self.left_frame, 
            text=gpu_info,
            font=ctk.CTkFont(size=self.font_size - 2)
        )
        self.gpu_label.pack(pady=2)
        
        # Status
        self.status_label = ctk.CTkLabel(
            self.left_frame, 
            text="Status: Ready",
            font=ctk.CTkFont(size=self.font_size)
        )
        self.status_label.pack(pady=5)
        
        # Settings frame
        self.settings_frame = ctk.CTkFrame(self.left_frame)
        self.settings_frame.pack(fill=tk.X, pady=5, padx=10)
        
        # Model selection
        model_frame = ctk.CTkFrame(self.settings_frame)
        model_frame.pack(fill=tk.X, pady=5)
        
        ctk.CTkLabel(model_frame, text="Model:", font=ctk.CTkFont(size=self.font_size)).pack(side=tk.LEFT, padx=5)
        
        self.model_var = tk.StringVar(value="distil-large-v3")
        self.model_dropdown = ctk.CTkOptionMenu(
            model_frame,
            values=["tiny", "base", "small", "medium", "large-v3", "distil-large-v3"],
            variable=self.model_var,
            font=ctk.CTkFont(size=self.font_size - 2),
            command=lambda _: [self.save_settings(), self.load_model_in_background(self.model_var.get(), self.use_gpu_var.get())]
        )
        self.model_dropdown.pack(side=tk.LEFT, padx=5)
        
        # Language selection
        ctk.CTkLabel(model_frame, text="Language:", font=ctk.CTkFont(size=self.font_size)).pack(side=tk.LEFT, padx=5)
        
        self.lang_var = tk.StringVar(value="en")
        self.lang_dropdown = ctk.CTkOptionMenu(
            model_frame,
            values=["en", "fr", "de", "es", "it", "ja", "zh", "ru"],
            variable=self.lang_var,
            font=ctk.CTkFont(size=self.font_size - 2),
            command=lambda _: self.save_settings()
        )
        self.lang_dropdown.pack(side=tk.LEFT, padx=5)
        
        # Advanced settings
        advanced_frame = ctk.CTkFrame(self.settings_frame)
        advanced_frame.pack(fill=tk.X, pady=5)
        
        self.beam_var = tk.IntVar(value=5)
        self.vad_var = tk.DoubleVar(value=0.6)
        self.conf_var = tk.DoubleVar(value=0.6)
        self.remove_repetitions_var = tk.BooleanVar(value=True)
        self.use_gpu_var = tk.BooleanVar(value=torch.cuda.is_available())
        
        # Checkboxes
        checkbox_frame = ctk.CTkFrame(advanced_frame)
        checkbox_frame.pack(fill=tk.X, pady=2)
        
        self.remove_repetitions_checkbox = ctk.CTkCheckBox(
            checkbox_frame,
            text="Remove Repetitions",
            variable=self.remove_repetitions_var,
            font=ctk.CTkFont(size=self.font_size - 2),
            command=self.save_settings
        )
        self.remove_repetitions_checkbox.pack(side=tk.LEFT, padx=5)
        
        self.use_gpu_checkbox = ctk.CTkCheckBox(
            checkbox_frame,
            text="Use GPU",
            variable=self.use_gpu_var,
            font=ctk.CTkFont(size=self.font_size - 2),
            state="normal" if torch.cuda.is_available() else "disabled",
            command=lambda: [self.save_settings(), self.load_model_in_background(self.model_var.get(), self.use_gpu_var.get())]
        )
        self.use_gpu_checkbox.pack(side=tk.LEFT, padx=5)
        
        # Control buttons
        self.button_frame = ctk.CTkFrame(self.left_frame)
        self.button_frame.pack(fill=tk.X, pady=10, padx=10)
        
        self.start_button = ctk.CTkButton(
            self.button_frame, 
            text="Start Transcription",
            font=ctk.CTkFont(size=self.font_size),
            command=self.start_transcription
        )
        self.start_button.pack(side=tk.LEFT, padx=5, expand=True, fill=tk.X)
        
        self.stop_button = ctk.CTkButton(
            self.button_frame, 
            text="Stop Transcription",
            font=ctk.CTkFont(size=self.font_size),
            command=self.stop_transcription,
            state="disabled"
        )
        self.stop_button.pack(side=tk.LEFT, padx=5, expand=True, fill=tk.X)
        
        self.clear_button = ctk.CTkButton(
            self.button_frame, 
            text="Clear Text",
            font=ctk.CTkFont(size=self.font_size),
            command=self.clear_text
        )
        self.clear_button.pack(side=tk.LEFT, padx=5, expand=True, fill=tk.X)
        
        # Transcription text area
        self.text_frame = ctk.CTkFrame(self.left_frame)
        self.text_frame.pack(fill=tk.BOTH, expand=True, pady=10, padx=10)
        
        self.text_label = ctk.CTkLabel(
            self.text_frame, 
            text="Transcription:",
            font=ctk.CTkFont(size=self.font_size)
        )
        self.text_label.pack(anchor=tk.W, padx=10, pady=5)
        
        self.text_area = ctk.CTkTextbox(
            self.text_frame,
            font=ctk.CTkFont(size=self.font_size),
            wrap="word"
        )
        self.text_area.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
    
    def _create_coaching_panel(self):
        """Create the coaching panel (right side)."""
        # Title
        self.coaching_title = ctk.CTkLabel(
            self.right_frame, 
            text="AI Sales Coaching",
            font=ctk.CTkFont(size=self.font_size + 6, weight="bold")
        )
        self.coaching_title.pack(pady=10)
        
        # RAG System Status
        self.rag_status_label = ctk.CTkLabel(
            self.right_frame, 
            text="RAG System: Initializing...",
            font=ctk.CTkFont(size=self.font_size),
            text_color="orange"
        )
        self.rag_status_label.pack(pady=5)
        
        # Coaching Controls
        coaching_controls = ctk.CTkFrame(self.right_frame)
        coaching_controls.pack(fill=tk.X, pady=10, padx=10)
        
        self.coaching_enabled_var = tk.BooleanVar(value=False)
        self.coaching_checkbox = ctk.CTkCheckBox(
            coaching_controls,
            text="Enable Real-time Coaching",
            variable=self.coaching_enabled_var,
            font=ctk.CTkFont(size=self.font_size),
            command=self.toggle_coaching,
            state="disabled"  # Enabled when RAG system is ready
        )
        self.coaching_checkbox.pack(side=tk.LEFT, padx=5)
        
        self.session_button = ctk.CTkButton(
            coaching_controls,
            text="Start Coaching Session",
            font=ctk.CTkFont(size=self.font_size),
            command=self.start_coaching_session,
            state="disabled"
        )
        self.session_button.pack(side=tk.RIGHT, padx=5)
        
        # Coaching Output Area
        coaching_frame = ctk.CTkFrame(self.right_frame)
        coaching_frame.pack(fill=tk.BOTH, expand=True, pady=10, padx=10)
        
        self.coaching_label = ctk.CTkLabel(
            coaching_frame, 
            text="Coaching Suggestions:",
            font=ctk.CTkFont(size=self.font_size)
        )
        self.coaching_label.pack(anchor=tk.W, padx=10, pady=5)
        
        self.coaching_area = ctk.CTkTextbox(
            coaching_frame,
            font=ctk.CTkFont(size=self.font_size),
            wrap="word"
        )
        self.coaching_area.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # Performance Metrics
        metrics_frame = ctk.CTkFrame(self.right_frame)
        metrics_frame.pack(fill=tk.X, pady=5, padx=10)
        
        self.coaching_metrics_label = ctk.CTkLabel(
            metrics_frame, 
            text="Performance: Response time: --ms | Confidence: --%",
            font=ctk.CTkFont(size=self.font_size - 2)
        )
        self.coaching_metrics_label.pack(pady=5)
        
        # Debug Information
        debug_frame = ctk.CTkFrame(self.right_frame)
        debug_frame.pack(fill=tk.X, pady=5, padx=10)
        
        self.debug_button = ctk.CTkButton(
            debug_frame,
            text="Show Debug Trail",
            font=ctk.CTkFont(size=self.font_size - 2),
            command=self.show_debug_info,
            height=30
        )
        self.debug_button.pack(pady=5)
    
    def toggle_coaching(self):
        """Toggle real-time coaching on/off."""
        self.coaching_enabled = self.coaching_enabled_var.get()
        self.trail.light(110, {"action": "coaching_toggled", "enabled": self.coaching_enabled})
        
        if self.coaching_enabled and not self.current_session_id:
            self.start_coaching_session()
    
    def start_coaching_session(self):
        """Start a new coaching session."""
        if not self.voice_integrator:
            self.coaching_area.insert(tk.END, "⚠️ RAG system not ready\n\n")
            return
        
        try:
            self.current_session_id = f"session_{int(time.time())}"
            
            context = self.voice_integrator.start_coaching_session(
                session_id=self.current_session_id,
                user_id="default_user",
                coaching_preferences={
                    "experience_level": "intermediate",
                    "coaching_style": "direct"
                }
            )
            
            self.coaching_area.insert(tk.END, f"🎯 Coaching session started: {self.current_session_id}\n\n")
            self.session_button.configure(text="End Session", command=self.end_coaching_session)
            
            self.trail.light(111, {"action": "coaching_session_started", "session_id": self.current_session_id})
            
        except Exception as e:
            self.coaching_area.insert(tk.END, f"❌ Failed to start session: {e}\n\n")
            self.trail.fail(111, e, traceback.format_exc())
    
    def end_coaching_session(self):
        """End the current coaching session."""
        if not self.current_session_id or not self.voice_integrator:
            return
        
        try:
            summary = self.voice_integrator.end_coaching_session(self.current_session_id)
            self.coaching_area.insert(tk.END, f"📋 Session ended. Duration: {summary.get('duration_seconds', 0):.1f}s\n\n")
            
            self.current_session_id = None
            self.session_button.configure(text="Start Coaching Session", command=self.start_coaching_session)
            
            self.trail.light(112, {"action": "coaching_session_ended"})
            
        except Exception as e:
            self.coaching_area.insert(tk.END, f"❌ Error ending session: {e}\n\n")
            self.trail.fail(112, e, traceback.format_exc())
    
    def show_debug_info(self):
        """Show debug information in a popup window."""
        debug_window = ctk.CTkToplevel(self.root)
        debug_window.title("LED Debug Trail")
        debug_window.geometry("800x600")
        
        debug_text = ctk.CTkTextbox(debug_window, font=ctk.CTkFont(size=12))
        debug_text.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Get debug information
        global_trail = debug.get_global_trail()
        failures = debug.get_failures()
        performance = debug.get_performance_summary()
        
        debug_info = "=== LED DEBUG TRAIL ===\n\n"
        
        debug_info += f"Recent LED Activity (last 20):\n"
        for bc in global_trail[-20:]:
            status = "✅" if bc["success"] else "❌"
            debug_info += f"LED {bc['id']:03d} {status} {bc['name']} [{bc['component']}]\n"
        
        debug_info += f"\n=== FAILURES ({len(failures)}) ===\n"
        for failure in failures[-10:]:  # Last 10 failures
            debug_info += f"❌ LED {failure['id']:03d} {failure['name']} [{failure['component']}]: {failure['error']}\n"
        
        debug_info += f"\n=== PERFORMANCE SUMMARY ===\n"
        for operation, stats in performance.items():
            debug_info += f"{operation}: {stats.get('avg_duration', 0):.1f}ms avg ({stats.get('count', 0)} samples)\n"
        
        debug_text.insert("0.0", debug_info)
    
    # Original transcription methods (preserved with LED debugging added)
    
    def start_transcription(self):
        """Start the transcription process."""
        self.trail.light(120, {"action": "transcription_start"})
        
        try:
            if self.is_transcribing:
                return
            
            # Original transcription logic
            self.status_label.configure(text="Status: Preparing...")
            self.start_button.configure(state="disabled")
            self.root.update()
            
            model_name = self.model_var.get()
            use_gpu = self.use_gpu_var.get()
            key = (model_name, use_gpu)
            
            if self.loaded_model_key == key and self.loaded_model is not None:
                model, device = self.loaded_model
            else:
                self.status_label.configure(text="Status: Loading model...")
                self.root.update()
                device = "cuda" if torch.cuda.is_available() and use_gpu else "cpu"
                compute_type = "float16" if device == "cuda" else "float32"
                model = WhisperModel(model_name, device=device, compute_type=compute_type)
                self.loaded_model = (model, device)
                self.loaded_model_key = key
            
            self.pipeline = TranscriptionPipeline(
                model=model,
                device=device,
                model_name=model_name,
                language=self.lang_var.get(),
                beam_size=self.beam_var.get(),
                vad_threshold=self.vad_var.get(),
                confidence_threshold=self.conf_var.get(),
                remove_repetitions=self.remove_repetitions_var.get(),
                use_gpu=use_gpu
            )
            
            threading.Thread(target=self._start_pipeline, daemon=True).start()
            
            self.trail.light(121, {"status": "transcription_started"})
            
        except Exception as e:
            self.trail.fail(120, e, traceback.format_exc())
            self.status_label.configure(text=f"Status: Error - {str(e)}")
            self.start_button.configure(state="normal")
    
    def _start_pipeline(self):
        """Start the transcription pipeline."""
        try:
            self.pipeline.start()
            self.update_queue.put(("status", "Status: Transcribing..."))
            self.update_queue.put(("start_complete", None))
            self.is_transcribing = True
            threading.Thread(target=self._poll_transcription, daemon=True).start()
        except Exception as e:
            error_msg = f"Status: Error - {str(e)}"
            self.update_queue.put(("status", error_msg))
            self.update_queue.put(("start_failed", None))
    
    def _poll_transcription(self):
        """Poll transcription results and process through RAG system."""
        try:
            while self.is_transcribing and self.pipeline:
                try:
                    result, latency = self.pipeline.get_transcription(block=True, timeout=0.5)
                    if result:
                        latency_sec = latency / 1000.0
                        self.update_queue.put(("transcription", result))
                        self.update_queue.put(("latency", latency_sec))
                        
                        # Process through coaching system if enabled
                        if (self.coaching_enabled and self.current_session_id and 
                            self.voice_integrator and len(result.strip()) > 10):
                            try:
                                coaching_response = self.voice_integrator.process_transcription(
                                    self.current_session_id, result
                                )
                                if coaching_response:
                                    self.update_queue.put(("coaching", coaching_response))
                            except Exception as e:
                                logger.error(f"Coaching processing error: {e}")
                        
                except queue.Empty:
                    pass
                except Exception as e:
                    logger.error(f"Error polling transcription: {str(e)}")
                    time.sleep(0.5)
        except Exception as e:
            logger.critical(f"Critical error in _poll_transcription: {str(e)}")
            self.update_queue.put(("status", f"Status: Error - {str(e)}"))
    
    def stop_transcription(self):
        """Stop the transcription process."""
        self.trail.light(122, {"action": "transcription_stop"})
        
        try:
            if not self.is_transcribing:
                return
            self.status_label.configure(text="Status: Stopping...")
            self.stop_button.configure(state="disabled")
            self.root.update()
            threading.Thread(target=self._stop_pipeline, daemon=True).start()
        except Exception as e:
            self.trail.fail(122, e, traceback.format_exc())
    
    def _stop_pipeline(self):
        """Stop the transcription pipeline."""
        try:
            if self.pipeline:
                self.pipeline.stop()
                self.pipeline = None
            self.update_queue.put(("status", "Status: Ready"))
            self.update_queue.put(("stop_complete", None))
            self.is_transcribing = False
        except Exception as e:
            error_msg = f"Status: Error - {str(e)}"
            self.update_queue.put(("status", error_msg))
            self.update_queue.put(("stop_failed", None))
    
    def clear_text(self):
        """Clear transcription and coaching text areas."""
        try:
            self.text_area.delete("0.0", tk.END)
            self.coaching_area.delete("0.0", tk.END)
        except Exception as e:
            logger.error(f"Error clearing text: {str(e)}")
    
    def update_transcription(self):
        """Update the UI with new results."""
        try:
            while not self.update_queue.empty():
                try:
                    update_type, update_value = self.update_queue.get_nowait()
                    
                    if update_type == "transcription":
                        self.text_area.insert(tk.END, update_value + "\n")
                        self.text_area.see(tk.END)
                    
                    elif update_type == "coaching":
                        # Display coaching response
                        response = update_value
                        coaching_text = f"🤖 {response.response_type.replace('_', ' ').title()}\n"
                        coaching_text += f"Confidence: {response.confidence_score:.1%}\n"
                        coaching_text += f"Response time: {response.processing_time_ms:.1f}ms\n\n"
                        coaching_text += f"{response.coaching_prompt}\n\n"
                        coaching_text += f"Relevant techniques: {', '.join(response.relevant_techniques)}\n\n"
                        coaching_text += "---\n\n"
                        
                        self.coaching_area.insert(tk.END, coaching_text)
                        self.coaching_area.see(tk.END)
                        
                        # Update metrics
                        self.coaching_metrics_label.configure(
                            text=f"Performance: Response time: {response.processing_time_ms:.1f}ms | "
                                 f"Confidence: {response.confidence_score:.1%}"
                        )
                    
                    elif update_type == "rag_ready":
                        self.rag_status_label.configure(text="RAG System: Ready ✅", text_color="green")
                        self.coaching_checkbox.configure(state="normal")
                        self.session_button.configure(state="normal")
                        self.coaching_area.insert(tk.END, "🚀 AI Coaching System ready!\n\n")
                    
                    elif update_type == "rag_error":
                        self.rag_status_label.configure(text=f"RAG System: Error ❌", text_color="red")
                        self.coaching_area.insert(tk.END, f"❌ RAG System Error: {update_value}\n\n")
                    
                    elif update_type == "status":
                        self.status_label.configure(text=update_value)
                    
                    elif update_type == "start_complete":
                        self.stop_button.configure(state="normal")
                    
                    elif update_type == "start_failed":
                        self.start_button.configure(state="normal")
                    
                    elif update_type == "stop_complete":
                        self.start_button.configure(state="normal")
                        self.stop_button.configure(state="disabled")
                    
                except queue.Empty:
                    break
                except Exception as e:
                    logger.error(f"Error processing update: {str(e)}")
            
            self.root.after(100, self.update_transcription)
        except Exception as e:
            logger.error(f"Error in update_transcription: {str(e)}")
            self.root.after(100, self.update_transcription)
    
    def load_model_in_background(self, model_name, use_gpu):
        """Load the WhisperModel in a background thread."""
        def load():
            try:
                device = "cuda" if torch.cuda.is_available() and use_gpu else "cpu"
                compute_type = "float16" if device == "cuda" else "float32"
                model = WhisperModel(model_name, device=device, compute_type=compute_type)
                self.loaded_model = (model, device)
                self.loaded_model_key = (model_name, use_gpu)
                logger.info(f"Model {model_name} loaded on {device}")
            except Exception as e:
                logger.error(f"Error loading model in background: {str(e)}")
                self.loaded_model = None
                self.loaded_model_key = None
        
        threading.Thread(target=load, daemon=True).start()
    
    def save_settings(self):
        """Save settings to JSON file."""
        settings = {
            "model": self.model_var.get(),
            "language": self.lang_var.get(),
            "beam_size": self.beam_var.get(),
            "vad_threshold": self.vad_var.get(),
            "confidence_threshold": self.conf_var.get(),
            "remove_repetitions": self.remove_repetitions_var.get(),
            "use_gpu": self.use_gpu_var.get(),
            "font_size": self.font_size,
            "coaching_enabled": getattr(self, 'coaching_enabled', False)
        }
        try:
            with open(self.SETTINGS_FILE, "w") as f:
                json.dump(settings, f, indent=4)
        except Exception as e:
            logger.error(f"Error saving settings: {str(e)}")
    
    def load_settings(self):
        """Load settings from JSON file."""
        try:
            with open(self.SETTINGS_FILE, "r") as f:
                settings = json.load(f)
                self.model_var.set(settings.get("model", "distil-large-v3"))
                self.lang_var.set(settings.get("language", "en"))
                self.beam_var.set(settings.get("beam_size", 5))
                self.vad_var.set(settings.get("vad_threshold", 0.6))
                self.conf_var.set(settings.get("confidence_threshold", 0.6))
                self.remove_repetitions_var.set(settings.get("remove_repetitions", True))
                self.use_gpu_var.set(settings.get("use_gpu", torch.cuda.is_available()))
                self.coaching_enabled = settings.get("coaching_enabled", False)
        except FileNotFoundError:
            logger.info("Settings file not found, using defaults")
        except Exception as e:
            logger.error(f"Error loading settings: {str(e)}")
    
    def handle_exception(self, exc_type, exc_value, exc_traceback):
        """Handle uncaught exceptions."""
        error_msg = ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback))
        logger.error(f"Uncaught exception: {error_msg}")
        self.status_label.configure(text=f"Status: Error - {str(exc_value)}")
        if self.is_transcribing:
            self.stop_transcription()


def main():
    """Main entry point for the enhanced application."""
    try:
        print("🎤 Starting Enhanced Voice Transcription App with AI Coaching...")
        print("🔵 LED debugging infrastructure active")
        print("📊 Debug commands available: debug.get_global_trail(), debug.get_failures(), etc.")
        
        root = tk.Tk()
        app = EnhancedVoiceTranscriptionApp(root, width=1200, height=800)
        
        print("✅ Application started successfully!")
        print("💡 Check console for LED debugging output")
        
        root.mainloop()
    except Exception as e:
        logger.critical(f"Critical error in main: {str(e)}")
        logger.critical(traceback.format_exc())
        print(f"❌ Critical error: {str(e)}")
        traceback.print_exc()


if __name__ == "__main__":
    main()