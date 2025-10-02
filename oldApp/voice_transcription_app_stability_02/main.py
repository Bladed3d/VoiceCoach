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
from ai_breadcrumb_system import AIBreadcrumbTrail, AILEDRanges, get_ai_trail

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("VoiceTranscriptionApp")

class VoiceTranscriptionApp:
    """
    Voice Transcription App with a simple UI.
    """
    SETTINGS_FILE = "settings.json"

    def __init__(self, root, width=800, height=1200, font_size=16):
        """
        Initialize the app.
        
        Args:
            root: Tkinter root window
            width (int): Window width
            height (int): Window height
            font_size (int): Font size for text
        """
        # Initialize AI breadcrumb trail for UI component
        self.trail = get_ai_trail("VoiceTranscriptionApp")
        self.trail.light(AILEDRanges.AI_MODEL_INIT, "app_initialization_start")
        
        self.root = root
        self.width = width
        self.height = height
        self.font_size = font_size
        
        self.root.title("Real-time Voice Transcription")
        self.root.geometry(f"{width}x{height}")
        
        ctk.set_appearance_mode("System")
        ctk.set_default_color_theme("blue")
        
        self.pipeline = None
        self.is_transcribing = False
        self.update_queue = queue.Queue()
        
        self.latency_values = []
        self.max_latency_values = 20
        
        self.root.report_callback_exception = self.handle_exception
        
        # Attributes for background model loading
        self.loaded_model = None
        self.loaded_model_key = None
        
        self.trail.light(AILEDRanges.AI_MODEL_GPU_CHECK, "gpu_availability_check")
        
        self.create_widgets()
        self.load_settings()
        
        # Load the initial model in the background
        self.load_model_in_background(self.model_var.get(), self.use_gpu_var.get())
        
        self.trail.light(AILEDRanges.AI_MODEL_LOADED, "app_initialization_complete")
        self.update_transcription()

    def create_widgets(self):
        """
        Create UI widgets.
        """
        try:
            self.main_frame = ctk.CTkFrame(self.root)
            self.main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
            
            self.title_label = ctk.CTkLabel(
                self.main_frame, 
                text="Real-time Voice Transcription",
                font=ctk.CTkFont(size=self.font_size + 8, weight="bold")
            )
            self.title_label.pack(pady=10)
            
            gpu_info = "GPU: Not detected"
            if torch.cuda.is_available():
                gpu_name = torch.cuda.get_device_name(0)
                gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                gpu_info = f"GPU: {gpu_name} ({gpu_memory:.1f} GB)"
            
            self.gpu_label = ctk.CTkLabel(
                self.main_frame, 
                text=gpu_info,
                font=ctk.CTkFont(size=self.font_size)
            )
            self.gpu_label.pack(pady=2)
            
            self.status_label = ctk.CTkLabel(
                self.main_frame, 
                text="Status: Ready",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.status_label.pack(pady=5)
            
            self.font_frame = ctk.CTkFrame(self.main_frame)
            self.font_frame.pack(fill=tk.X, pady=5)
            
            self.font_label = ctk.CTkLabel(
                self.font_frame, 
                text="Font Size:",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.font_label.pack(side=tk.LEFT, padx=10)
            
            self.font_slider = ctk.CTkSlider(
                self.font_frame,
                from_=8,
                to=32,
                number_of_steps=24,
                command=self.update_font_size
            )
            self.font_slider.set(self.font_size)
            self.font_slider.pack(side=tk.LEFT, padx=10, expand=True, fill=tk.X)
            
            self.font_value_label = ctk.CTkLabel(
                self.font_frame, 
                text=f"{self.font_size}pt",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.font_value_label.pack(side=tk.LEFT, padx=10)
            
            self.settings_frame = ctk.CTkFrame(self.main_frame)
            self.settings_frame.pack(fill=tk.X, pady=10)
            
            self.model_label = ctk.CTkLabel(
                self.settings_frame, 
                text="Model:",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.model_label.pack(side=tk.LEFT, padx=10)
            
            self.model_var = tk.StringVar(value="distil-large-v3")
            self.model_dropdown = ctk.CTkOptionMenu(
                self.settings_frame,
                values=["tiny", "base", "small", "medium", "large-v3", "distil-large-v3"],
                variable=self.model_var,
                font=ctk.CTkFont(size=self.font_size),
                dropdown_font=ctk.CTkFont(size=self.font_size),
                command=lambda _: [self.save_settings(), self.load_model_in_background(self.model_var.get(), self.use_gpu_var.get())]
            )
            self.model_dropdown.pack(side=tk.LEFT, padx=10)
            
            self.lang_label = ctk.CTkLabel(
                self.settings_frame, 
                text="Language:",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.lang_label.pack(side=tk.LEFT, padx=10)
            
            self.lang_var = tk.StringVar(value="en")
            self.lang_dropdown = ctk.CTkOptionMenu(
                self.settings_frame,
                values=["en", "fr", "de", "es", "it", "ja", "zh", "ru"],
                variable=self.lang_var,
                font=ctk.CTkFont(size=self.font_size),
                dropdown_font=ctk.CTkFont(size=self.font_size),
                command=lambda _: self.save_settings()
            )
            self.lang_dropdown.pack(side=tk.LEFT, padx=10)
            
            self.advanced_frame = ctk.CTkFrame(self.main_frame)
            self.advanced_frame.pack(fill=tk.X, pady=5)
            
            self.beam_label = ctk.CTkLabel(
                self.advanced_frame, 
                text="Beam Size:",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.beam_label.pack(side=tk.LEFT, padx=10)
            
            self.beam_var = tk.IntVar(value=5)
            self.beam_slider = ctk.CTkSlider(
                self.advanced_frame,
                from_=1,
                to=10,
                number_of_steps=9,
                command=self.update_beam_size
            )
            self.beam_slider.set(5)
            self.beam_slider.pack(side=tk.LEFT, padx=10, expand=True, fill=tk.X)
            
            self.beam_value_label = ctk.CTkLabel(
                self.advanced_frame, 
                text="5",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.beam_value_label.pack(side=tk.LEFT, padx=10)
            
            self.remove_repetitions_var = tk.BooleanVar(value=True)
            self.remove_repetitions_checkbox = ctk.CTkCheckBox(
                self.advanced_frame,
                text="Remove Repetitions",
                variable=self.remove_repetitions_var,
                font=ctk.CTkFont(size=self.font_size),
                command=self.save_settings
            )
            self.remove_repetitions_checkbox.pack(side=tk.LEFT, padx=20)
            
            self.use_gpu_var = tk.BooleanVar(value=torch.cuda.is_available())
            self.use_gpu_checkbox = ctk.CTkCheckBox(
                self.advanced_frame,
                text="Use GPU",
                variable=self.use_gpu_var,
                font=ctk.CTkFont(size=self.font_size),
                state="normal" if torch.cuda.is_available() else "disabled",
                command=lambda: [self.save_settings(), self.load_model_in_background(self.model_var.get(), self.use_gpu_var.get())]
            )
            self.use_gpu_checkbox.pack(side=tk.LEFT, padx=20)
            
            self.vad_frame = ctk.CTkFrame(self.main_frame)
            self.vad_frame.pack(fill=tk.X, pady=5)
            
            self.vad_label = ctk.CTkLabel(
                self.vad_frame, 
                text="VAD Threshold:",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.vad_label.pack(side=tk.LEFT, padx=10)
            
            self.vad_var = tk.DoubleVar(value=0.6)
            self.vad_slider = ctk.CTkSlider(
                self.vad_frame,
                from_=0.3,
                to=0.9,
                number_of_steps=12,
                command=self.update_vad_threshold
            )
            self.vad_slider.set(0.6)
            self.vad_slider.pack(side=tk.LEFT, padx=10, expand=True, fill=tk.X)
            
            self.vad_value_label = ctk.CTkLabel(
                self.vad_frame, 
                text="0.6",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.vad_value_label.pack(side=tk.LEFT, padx=10)
            
            self.conf_label = ctk.CTkLabel(
                self.vad_frame, 
                text="Min Confidence:",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.conf_label.pack(side=tk.LEFT, padx=10)
            
            self.conf_var = tk.DoubleVar(value=0.6)
            self.conf_slider = ctk.CTkSlider(
                self.vad_frame,
                from_=0.3,
                to=0.9,
                number_of_steps=12,
                command=self.update_conf_threshold
            )
            self.conf_slider.set(0.6)
            self.conf_slider.pack(side=tk.LEFT, padx=10, expand=True, fill=tk.X)
            
            self.conf_value_label = ctk.CTkLabel(
                self.vad_frame, 
                text="0.6",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.conf_value_label.pack(side=tk.LEFT, padx=10)
            
            self.metrics_frame = ctk.CTkFrame(self.main_frame)
            self.metrics_frame.pack(fill=tk.X, pady=5)
            
            self.latency_label = ctk.CTkLabel(
                self.metrics_frame, 
                text="Transcription Latency:",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.latency_label.pack(side=tk.LEFT, padx=10)
            
            self.current_latency_label = ctk.CTkLabel(
                self.metrics_frame, 
                text="-- sec",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.current_latency_label.pack(side=tk.LEFT, padx=10)
            
            self.avg_latency_label = ctk.CTkLabel(
                self.metrics_frame, 
                text="Avg: -- sec",
                font=ctk.CTkFont(size=self.font_size)
            )
            self.avg_latency_label.pack(side=tk.LEFT, padx=10)
            
            self.button_frame = ctk.CTkFrame(self.main_frame)
            self.button_frame.pack(fill=tk.X, pady=10)
            
            self.start_button = ctk.CTkButton(
                self.button_frame, 
                text="Start Transcription",
                font=ctk.CTkFont(size=self.font_size),
                command=self.start_transcription
            )
            self.start_button.pack(side=tk.LEFT, padx=10, pady=10, expand=True, fill=tk.X)
            
            self.stop_button = ctk.CTkButton(
                self.button_frame, 
                text="Stop Transcription",
                font=ctk.CTkFont(size=self.font_size),
                command=self.stop_transcription,
                state="disabled"
            )
            self.stop_button.pack(side=tk.LEFT, padx=10, pady=10, expand=True, fill=tk.X)
            
            self.clear_button = ctk.CTkButton(
                self.button_frame, 
                text="Clear Text",
                font=ctk.CTkFont(size=self.font_size),
                command=self.clear_text
            )
            self.clear_button.pack(side=tk.LEFT, padx=10, pady=10, expand=True, fill=tk.X)
            
            self.text_frame = ctk.CTkFrame(self.main_frame)
            self.text_frame.pack(fill=tk.BOTH, expand=True, pady=10)
            
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
            
            self.footer_label = ctk.CTkLabel(
                self.main_frame, 
                text="Using Faster-Whisper with Distil-Whisper models for transcription",
                font=ctk.CTkFont(size=self.font_size - 2)
            )
            self.footer_label.pack(pady=5)
        except Exception as e:
            logger.error(f"Error creating widgets: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def update_font_size(self, value=None):
        """
        Update the font size for all UI elements.
        """
        try:
            if value is not None:
                self.font_size = int(value)
            
            self.font_value_label.configure(
                text=f"{self.font_size}pt",
                font=ctk.CTkFont(size=self.font_size)
            )
            
            self.title_label.configure(font=ctk.CTkFont(size=self.font_size + 8, weight="bold"))
            self.gpu_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.status_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.font_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.latency_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.current_latency_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.avg_latency_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.model_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.model_dropdown.configure(
                font=ctk.CTkFont(size=self.font_size),
                dropdown_font=ctk.CTkFont(size=self.font_size)
            )
            self.lang_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.lang_dropdown.configure(
                font=ctk.CTkFont(size=self.font_size),
                dropdown_font=ctk.CTkFont(size=self.font_size)
            )
            self.beam_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.beam_value_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.vad_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.vad_value_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.conf_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.conf_value_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.remove_repetitions_checkbox.configure(font=ctk.CTkFont(size=self.font_size))
            self.use_gpu_checkbox.configure(font=ctk.CTkFont(size=self.font_size))
            self.start_button.configure(font=ctk.CTkFont(size=self.font_size))
            self.stop_button.configure(font=ctk.CTkFont(size=self.font_size))
            self.clear_button.configure(font=ctk.CTkFont(size=self.font_size))
            self.text_label.configure(font=ctk.CTkFont(size=self.font_size))
            self.text_area.configure(font=ctk.CTkFont(size=self.font_size))
            self.footer_label.configure(font=ctk.CTkFont(size=self.font_size - 2))
            
            self.save_settings()
        except Exception as e:
            logger.error(f"Error updating font size: {str(e)}")

    def update_beam_size(self, value=None):
        """
        Update the beam size value.
        """
        try:
            if value is not None:
                beam_size = int(value)
                self.beam_var.set(beam_size)
                self.beam_value_label.configure(text=str(beam_size))
            
            self.save_settings()
        except Exception as e:
            logger.error(f"Error updating beam size: {str(e)}")

    def update_vad_threshold(self, value=None):
        """
        Update the VAD threshold value.
        """
        try:
            if value is not None:
                vad_threshold = round(float(value), 1)
                self.vad_var.set(vad_threshold)
                self.vad_value_label.configure(text=str(vad_threshold))
            
            self.save_settings()
        except Exception as e:
            logger.error(f"Error updating VAD threshold: {str(e)}")

    def update_conf_threshold(self, value=None):
        """
        Update the confidence threshold value.
        """
        try:
            if value is not None:
                conf_threshold = round(float(value), 1)
                self.conf_var.set(conf_threshold)
                self.conf_value_label.configure(text=str(conf_threshold))
            
            self.save_settings()
        except Exception as e:
            logger.error(f"Error updating confidence threshold: {str(e)}")

    def save_settings(self):
        """
        Save the current settings to a JSON file.
        """
        settings = {
            "model": self.model_var.get(),
            "language": self.lang_var.get(),
            "beam_size": self.beam_var.get(),
            "vad_threshold": self.vad_var.get(),
            "confidence_threshold": self.conf_var.get(),
            "remove_repetitions": self.remove_repetitions_var.get(),
            "use_gpu": self.use_gpu_var.get(),
            "font_size": self.font_size
        }
        try:
            with open(self.SETTINGS_FILE, "w") as f:
                json.dump(settings, f, indent=4)
        except Exception as e:
            logger.error(f"Error saving settings: {str(e)}")

    def load_settings(self):
        """
        Load settings from a JSON file and apply them to the UI.
        """
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
                font_size = settings.get("font_size", 16)
                self.font_slider.set(font_size)
                self.update_font_size(font_size)
                self.beam_slider.set(settings.get("beam_size", 5))
                self.update_beam_size(settings.get("beam_size", 5))
                self.vad_slider.set(settings.get("vad_threshold", 0.6))
                self.update_vad_threshold(settings.get("vad_threshold", 0.6))
                self.conf_slider.set(settings.get("confidence_threshold", 0.6))
                self.update_conf_threshold(settings.get("confidence_threshold", 0.6))
        except FileNotFoundError:
            logger.info("Settings file not found, using defaults")
        except json.JSONDecodeError:
            logger.error("Error decoding settings JSON, using defaults")
        except Exception as e:
            logger.error(f"Error loading settings: {str(e)}")

    def load_model_in_background(self, model_name, use_gpu):
        """
        Load the WhisperModel in a background thread.
        
        Args:
            model_name (str): Name of the model to load
            use_gpu (bool): Whether to use GPU
        """
        def load():
            try:
                self.trail.light(AILEDRanges.AI_MODEL_LOADING, "background_model_loading", 
                               {'model_name': model_name, 'use_gpu': use_gpu})
                
                device = "cuda" if torch.cuda.is_available() and use_gpu else "cpu"
                compute_type = "float16" if device == "cuda" else "float32"
                
                # Track GPU memory if available
                gpu_memory_data = {}
                if device == "cuda":
                    gpu_memory_data = {
                        'gpu_memory_total': torch.cuda.get_device_properties(0).total_memory / (1024**3),
                        'gpu_memory_allocated': torch.cuda.memory_allocated() / (1024**3)
                    }
                
                model_load_start = time.time()
                model = WhisperModel(model_name, device=device, compute_type=compute_type)
                model_load_time = (time.time() - model_load_start) * 1000
                
                self.loaded_model = (model, device)
                self.loaded_model_key = (model_name, use_gpu)
                
                performance_metrics = {
                    'latency_ms': model_load_time,
                    'device': device,
                    'compute_type': compute_type
                }
                performance_metrics.update(gpu_memory_data)
                
                self.trail.light(AILEDRanges.AI_MODEL_LOADED, "background_model_loaded", 
                               performance_metrics=performance_metrics)
                
                logger.info(f"Model {model_name} loaded on {device} in {model_load_time:.1f}ms")
            except Exception as e:
                self.trail.fail(AILEDRanges.AI_MODEL_ERROR, e, "background_model_loading")
                logger.error(f"Error loading model in background: {str(e)}")
                self.loaded_model = None
                self.loaded_model_key = None
        
        threading.Thread(target=load, daemon=True).start()

    def start_transcription(self):
        """
        Start the transcription process using a preloaded model if available.
        """
        try:
            self.trail.light(AILEDRanges.TRANSCRIPTION_START, "transcription_start_requested")
            
            if self.is_transcribing:
                self.trail.light(AILEDRanges.TRANSCRIPTION_START + 1, "already_transcribing")
                return
                
            # Track start latency
            end_start_latency = self.trail.measure_latency(
                AILEDRanges.PERFORMANCE_LATENCY_START,
                AILEDRanges.PERFORMANCE_LATENCY_END,
                "transcription_startup"
            )
            
            self.status_label.configure(text="Status: Preparing...")
            self.start_button.configure(state="disabled")
            self.model_dropdown.configure(state="disabled")
            self.lang_dropdown.configure(state="disabled")
            self.beam_slider.configure(state="disabled")
            self.vad_slider.configure(state="disabled")
            self.conf_slider.configure(state="disabled")
            self.remove_repetitions_checkbox.configure(state="disabled")
            self.use_gpu_checkbox.configure(state="disabled")
            self.root.update()
            
            self.trail.light(AILEDRanges.TRANSCRIPTION_START + 2, "ui_disabled_for_startup")
            
            model_name = self.model_var.get()
            use_gpu = self.use_gpu_var.get()
            key = (model_name, use_gpu)
            
            if self.loaded_model_key == key and self.loaded_model is not None:
                model, device = self.loaded_model
            else:
                self.status_label.configure(text="Status: Loading model...")
                self.root.update()
                try:
                    device = "cuda" if torch.cuda.is_available() and use_gpu else "cpu"
                    compute_type = "float16" if device == "cuda" else "float32"
                    model = WhisperModel(model_name, device=device, compute_type=compute_type)
                    self.loaded_model = (model, device)
                    self.loaded_model_key = key
                    logger.info(f"Synchronously loaded model {model_name} on {device}")
                except Exception as e:
                    logger.error(f"Error loading model: {str(e)}")
                    self.status_label.configure(text=f"Status: Error - {str(e)}")
                    self.start_button.configure(state="normal")
                    self.model_dropdown.configure(state="normal")
                    self.lang_dropdown.configure(state="normal")
                    self.beam_slider.configure(state="normal")
                    self.vad_slider.configure(state="normal")
                    self.conf_slider.configure(state="normal")
                    self.remove_repetitions_checkbox.configure(state="normal")
                    self.use_gpu_checkbox.configure(state="normal" if torch.cuda.is_available() else "disabled")
                    return
            
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
            self.latency_values = []
            self.update_latency_display(None)
            
            threading.Thread(target=self._start_pipeline, daemon=True).start()
        except Exception as e:
            logger.error(f"Error starting transcription: {str(e)}")
            logger.error(traceback.format_exc())
            self.status_label.configure(text=f"Status: Error - {str(e)}")
            self.start_button.configure(state="normal")
            self.model_dropdown.configure(state="normal")
            self.lang_dropdown.configure(state="normal")
            self.beam_slider.configure(state="normal")
            self.vad_slider.configure(state="normal")
            self.conf_slider.configure(state="normal")
            self.remove_repetitions_checkbox.configure(state="normal")
            self.use_gpu_checkbox.configure(state="normal" if torch.cuda.is_available() else "disabled")

    def _start_pipeline(self):
        """
        Start the transcription pipeline.
        """
        try:
            self.pipeline.start()
            self.update_queue.put(("status", "Status: Transcribing..."))
            self.update_queue.put(("start_complete", None))
            self.is_transcribing = True
            threading.Thread(target=self._poll_transcription, daemon=True).start()
        except Exception as e:
            error_msg = f"Status: Error - {str(e)}"
            logger.error(f"Error in _start_pipeline: {str(e)}")
            logger.error(traceback.format_exc())
            self.update_queue.put(("status", error_msg))
            self.update_queue.put(("start_failed", None))

    def _poll_transcription(self):
        """
        Poll transcription results.
        """
        try:
            while self.is_transcribing and self.pipeline:
                try:
                    result, latency = self.pipeline.get_transcription(block=True, timeout=0.5)
                    if result:
                        latency_sec = latency / 1000.0
                        self.update_queue.put(("transcription", result))
                        self.update_queue.put(("latency", latency_sec))
                except queue.Empty:
                    pass
                except Exception as e:
                    logger.error(f"Error polling transcription: {str(e)}")
                    logger.error(traceback.format_exc())
                    time.sleep(0.5)
        except Exception as e:
            logger.error(f"Critical error in _poll_transcription: {str(e)}")
            logger.error(traceback.format_exc())
            self.update_queue.put(("status", f"Status: Error - {str(e)}"))

    def stop_transcription(self):
        """
        Stop the transcription process.
        """
        try:
            if not self.is_transcribing:
                return
            self.status_label.configure(text="Status: Stopping...")
            self.stop_button.configure(state="disabled")
            self.root.update()
            threading.Thread(target=self._stop_pipeline, daemon=True).start()
        except Exception as e:
            logger.error(f"Error stopping transcription: {str(e)}")
            logger.error(traceback.format_exc())
            self.status_label.configure(text=f"Status: Error - {str(e)}")

    def _stop_pipeline(self):
        """
        Stop the transcription pipeline.
        """
        try:
            if self.pipeline:
                self.pipeline.stop()
                self.pipeline = None
            self.update_queue.put(("status", "Status: Ready"))
            self.update_queue.put(("stop_complete", None))
            self.is_transcribing = False
        except Exception as e:
            error_msg = f"Status: Error - {str(e)}"
            logger.error(f"Error in _stop_pipeline: {str(e)}")
            logger.error(traceback.format_exc())
            self.update_queue.put(("status", error_msg))
            self.update_queue.put(("stop_failed", None))

    def clear_text(self):
        """
        Clear the transcription text area.
        """
        try:
            self.text_area.delete("0.0", tk.END)
        except Exception as e:
            logger.error(f"Error clearing text: {str(e)}")

    def update_latency_display(self, latency):
        """
        Update the latency display.
        """
        try:
            if latency is not None:
                self.latency_values.append(latency)
                if len(self.latency_values) > self.max_latency_values:
                    self.latency_values = self.latency_values[-self.max_latency_values:]
                avg_latency = sum(self.latency_values) / len(self.latency_values)
                self.current_latency_label.configure(text=f"{latency:.3f} sec")
                self.avg_latency_label.configure(text=f"Avg: {avg_latency:.3f} sec")
            else:
                self.current_latency_label.configure(text="-- sec")
                self.avg_latency_label.configure(text="Avg: -- sec")
        except Exception as e:
            logger.error(f"Error updating latency display: {str(e)}")

    def update_transcription(self):
        """
        Update the transcription UI with new results.
        """
        try:
            while not self.update_queue.empty():
                try:
                    update_type, update_value = self.update_queue.get_nowait()
                    if update_type == "transcription":
                        self.text_area.insert(tk.END, update_value + "\n")
                        self.text_area.see(tk.END)
                    elif update_type == "latency":
                        self.update_latency_display(update_value)
                    elif update_type == "status":
                        self.status_label.configure(text=update_value)
                    elif update_type == "start_complete":
                        self.stop_button.configure(state="normal")
                    elif update_type == "start_failed":
                        self.start_button.configure(state="normal")
                        self.model_dropdown.configure(state="normal")
                        self.lang_dropdown.configure(state="normal")
                        self.beam_slider.configure(state="normal")
                        self.vad_slider.configure(state="normal")
                        self.conf_slider.configure(state="normal")
                        self.remove_repetitions_checkbox.configure(state="normal")
                        self.use_gpu_checkbox.configure(state="normal" if torch.cuda.is_available() else "disabled")
                    elif update_type == "stop_complete":
                        self.start_button.configure(state="normal")
                        self.stop_button.configure(state="disabled")
                        self.model_dropdown.configure(state="normal")
                        self.lang_dropdown.configure(state="normal")
                        self.beam_slider.configure(state="normal")
                        self.vad_slider.configure(state="normal")
                        self.conf_slider.configure(state="normal")
                        self.remove_repetitions_checkbox.configure(state="normal")
                        self.use_gpu_checkbox.configure(state="normal" if torch.cuda.is_available() else "disabled")
                    elif update_type == "stop_failed":
                        self.start_button.configure(state="normal")
                        self.stop_button.configure(state="normal")
                except queue.Empty:
                    break
                except Exception as e:
                    logger.error(f"Error processing update: {str(e)}")
                    logger.error(traceback.format_exc())
            self.root.after(100, self.update_transcription)
        except Exception as e:
            logger.error(f"Error in update_transcription: {str(e)}")
            logger.error(traceback.format_exc())
            self.root.after(100, self.update_transcription)

    def handle_exception(self, exc_type, exc_value, exc_traceback):
        """
        Handle uncaught exceptions in Tkinter.
        """
        error_msg = ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback))
        logger.error(f"Uncaught exception: {error_msg}")
        self.status_label.configure(text=f"Status: Error - {str(exc_value)}")
        if self.is_transcribing:
            self.stop_transcription()

def main():
    """
    Main entry point for the application.
    """
    try:
        root = tk.Tk()
        app = VoiceTranscriptionApp(root)
        root.mainloop()
    except Exception as e:
        logger.critical(f"Critical error in main: {str(e)}")
        logger.critical(traceback.format_exc())
        print(f"Critical error: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    main()