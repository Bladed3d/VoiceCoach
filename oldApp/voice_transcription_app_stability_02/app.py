import os
import sys
import tkinter as tk
import customtkinter as ctk
from transcription_pipeline import TranscriptionPipeline
import threading
import queue
import time

class VoiceTranscriptionApp:
    """
    Voice Transcription App with a simple UI.
    """
    def __init__(self, root, width=800, height=1200, font_size=16):
        """
        Initialize the app.
        
        Args:
            root: Tkinter root window
            width (int): Window width
            height (int): Window height
            font_size (int): Font size for text
        """
        self.root = root
        self.width = width
        self.height = height
        self.font_size = font_size
        
        # Set up the window
        self.root.title("Voice Transcription App")
        self.root.geometry(f"{width}x{height}")
        
        # Set up customtkinter appearance
        ctk.set_appearance_mode("System")  # Modes: "System" (standard), "Dark", "Light"
        ctk.set_default_color_theme("blue")  # Themes: "blue" (standard), "green", "dark-blue"
        
        # Create the transcription pipeline
        self.pipeline = None
        self.is_transcribing = False
        self.update_queue = queue.Queue()
        
        # Latency tracking
        self.latency_values = []
        self.max_latency_values = 20  # Keep track of last 20 values
        
        # Create UI elements
        self.create_widgets()
        
        # Start update loop
        self.update_transcription()
    
    def create_widgets(self):
        """
        Create UI widgets.
        """
        # Create main frame
        self.main_frame = ctk.CTkFrame(self.root)
        self.main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Create title label
        self.title_label = ctk.CTkLabel(
            self.main_frame, 
            text="Real-time Voice Transcription",
            font=ctk.CTkFont(size=self.font_size + 8, weight="bold")
        )
        self.title_label.pack(pady=10)
        
        # Create status label
        self.status_label = ctk.CTkLabel(
            self.main_frame, 
            text="Status: Ready",
            font=ctk.CTkFont(size=self.font_size)
        )
        self.status_label.pack(pady=5)
        
        # Create font size adjustment frame
        self.font_frame = ctk.CTkFrame(self.main_frame)
        self.font_frame.pack(fill=tk.X, pady=5)
        
        # Create font size label
        self.font_label = ctk.CTkLabel(
            self.font_frame, 
            text="Font Size:",
            font=ctk.CTkFont(size=self.font_size)
        )
        self.font_label.pack(side=tk.LEFT, padx=10)
        
        # Create font size slider
        self.font_slider = ctk.CTkSlider(
            self.font_frame,
            from_=8,
            to=32,
            number_of_steps=24,
            command=self.update_font_size
        )
        self.font_slider.set(self.font_size)
        self.font_slider.pack(side=tk.LEFT, padx=10, expand=True, fill=tk.X)
        
        # Create font size value label
        self.font_value_label = ctk.CTkLabel(
            self.font_frame, 
            text=f"{self.font_size}pt",
            font=ctk.CTkFont(size=self.font_size)
        )
        self.font_value_label.pack(side=tk.LEFT, padx=10)
        
        # Create latency display frame
        self.latency_frame = ctk.CTkFrame(self.main_frame)
        self.latency_frame.pack(fill=tk.X, pady=5)
        
        # Create latency label
        self.latency_label = ctk.CTkLabel(
            self.latency_frame, 
            text="Transcription Latency:",
            font=ctk.CTkFont(size=self.font_size)
        )
        self.latency_label.pack(side=tk.LEFT, padx=10)
        
        # Create current latency value label
        self.current_latency_label = ctk.CTkLabel(
            self.latency_frame, 
            text="-- ms",
            font=ctk.CTkFont(size=self.font_size)
        )
        self.current_latency_label.pack(side=tk.LEFT, padx=10)
        
        # Create average latency label
        self.avg_latency_label = ctk.CTkLabel(
            self.latency_frame, 
            text="Avg: -- ms",
            font=ctk.CTkFont(size=self.font_size)
        )
        self.avg_latency_label.pack(side=tk.LEFT, padx=10)
        
        # Create model selection frame
        self.model_frame = ctk.CTkFrame(self.main_frame)
        self.model_frame.pack(fill=tk.X, pady=10)
        
        # Create model selection label
        self.model_label = ctk.CTkLabel(
            self.model_frame, 
            text="Model:",
            font=ctk.CTkFont(size=self.font_size)
        )
        self.model_label.pack(side=tk.LEFT, padx=10)
        
        # Create model selection dropdown
        self.model_var = tk.StringVar(value="tiny")
        self.model_dropdown = ctk.CTkOptionMenu(
            self.model_frame,
            values=["tiny", "base", "small", "medium", "large"],
            variable=self.model_var,
            font=ctk.CTkFont(size=self.font_size),
            dropdown_font=ctk.CTkFont(size=self.font_size)
        )
        self.model_dropdown.pack(side=tk.LEFT, padx=10)
        
        # Create language selection label
        self.lang_label = ctk.CTkLabel(
            self.model_frame, 
            text="Language:",
            font=ctk.CTkFont(size=self.font_size)
        )
        self.lang_label.pack(side=tk.LEFT, padx=10)
        
        # Create language selection dropdown
        self.lang_var = tk.StringVar(value="en")
        self.lang_dropdown = ctk.CTkOptionMenu(
            self.model_frame,
            values=["en", "fr", "de", "es", "it", "ja", "zh", "ru"],
            variable=self.lang_var,
            font=ctk.CTkFont(size=self.font_size),
            dropdown_font=ctk.CTkFont(size=self.font_size)
        )
        self.lang_dropdown.pack(side=tk.LEFT, padx=10)
        
        # Create button frame
        self.button_frame = ctk.CTkFrame(self.main_frame)
        self.button_frame.pack(fill=tk.X, pady=10)
        
        # Create start button
        self.start_button = ctk.CTkButton(
            self.button_frame, 
            text="Start Transcription",
            font=ctk.CTkFont(size=self.font_size),
            command=self.start_transcription
        )
        self.start_button.pack(side=tk.LEFT, padx=10, pady=10, expand=True, fill=tk.X)
        
        # Create stop button
        self.stop_button = ctk.CTkButton(
            self.button_frame, 
            text="Stop Transcription",
            font=ctk.CTkFont(size=self.font_size),
            command=self.stop_transcription,
            state="disabled"
        )
        self.stop_button.pack(side=tk.LEFT, padx=10, pady=10, expand=True, fill=tk.X)
        
        # Create clear button
        self.clear_button = ctk.CTkButton(
            self.button_frame, 
            text="Clear Text",
            font=ctk.CTkFont(size=self.font_size),
            command=self.clear_text
        )
        self.clear_button.pack(side=tk.LEFT, padx=10, pady=10, expand=True, fill=tk.X)
        
        # Create transcription text area
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
        
        # Create footer with info
        self.footer_label = ctk.CTkLabel(
            self.main_frame, 
            text="Using locally installed Whisper model for transcription",
            font=ctk.CTkFont(size=self.font_size - 2)
        )
        self.footer_label.pack(pady=5)
    
    def update_font_size(self, value=None):
        """
        Update the font size for all UI elements.
        
        Args:
            value (float): New font size value from slider
        """
        if value is not None:
            self.font_size = int(value)
        
        # Update font size value label
        self.font_value_label.configure(
            text=f"{self.font_size}pt",
            font=ctk.CTkFont(size=self.font_size)
        )
        
        # Update all UI elements with new font size
        self.title_label.configure(font=ctk.CTkFont(size=self.font_size + 8, weight="bold"))
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
        self.start_button.configure(font=ctk.CTkFont(size=self.font_size))
        self.stop_button.configure(font=ctk.CTkFont(size=self.font_size))
        self.clear_button.configure(font=ctk.CTkFont(size=self.font_size))
        self.text_label.configure(font=ctk.CTkFont(size=self.font_size))
        self.text_area.configure(font=ctk.CTkFont(size=self.font_size))
        self.footer_label.configure(font=ctk.CTkFont(size=self.font_size - 2))
    
    def start_transcription(self):
        """
        Start the transcription process.
        """
        if self.is_transcribing:
            return
        
        # Update UI
        self.status_label.configure(text="Status: Loading model...")
        self.start_button.configure(state="disabled")
        self.model_dropdown.configure(state="disabled")
        self.lang_dropdown.configure(state="disabled")
        self.root.update()
        
        # Get selected model and language
        model_name = self.model_var.get()
        language = self.lang_var.get()
        
        # Reset latency tracking
        self.latency_values = []
        self.update_latency_display(None)
        
        # Create and start pipeline in a separate thread
        threading.Thread(target=self._start_pipeline, args=(model_name, language), daemon=True).start()
    
    def _start_pipeline(self, model_name, language):
        """
        Start the transcription pipeline in a background thread.
        
        Args:
            model_name (str): Name of the Whisper model
            language (str): Language code
        """
        try:
            # Create pipeline
            self.pipeline = TranscriptionPipeline(model_name=model_name, language=language)
            
            # Start pipeline
            self.pipeline.start()
            
            # Update UI
            self.update_queue.put(("status", "Status: Transcribing..."))
            self.update_queue.put(("start_complete", None))
            
            # Set flag
            self.is_transcribing = True
            
            # Start transcription polling thread
            threading.Thread(target=self._poll_transcription, daemon=True).start()
            
        except Exception as e:
            # Update UI with error
            self.update_queue.put(("status", f"Status: Error - {str(e)}"))
            self.update_queue.put(("start_failed", None))
    
    def _poll_transcription(self):
        """
        Poll for transcription results.
        """
        while self.is_transcribing and self.pipeline:
            try:
                # Get transcription result and latency
                result, latency = self.pipeline.get_transcription(block=True, timeout=0.5)
                
                if result:
                    # Update UI with result and latency
                    self.update_queue.put(("transcription", result))
                    self.update_queue.put(("latency", latency))
                
                time.sleep(0.1)
            except Exception as e:
                print(f"Polling error: {e}")
                time.sleep(0.5)
    
    def update_latency_display(self, latency):
        """
        Update the latency display with new value.
        
        Args:
            latency (float): Latency value in milliseconds or None
        """
        if latency is not None:
            # Add to latency values list
            self.latency_values.append(latency)
            
            # Keep only the last N values
            if len(self.latency_values) > self.max_latency_values:
                self.latency_values = self.latency_values[-self.max_latency_values:]
            
            # Calculate average
            avg_latency = sum(self.latency_values) / len(self.latency_values)
            
            # Update labels
            self.current_latency_label.configure(text=f"{latency:.1f} ms")
            self.avg_latency_label.configure(text=f"Avg: {avg_latency:.1f} ms")
        else:
            # Reset labels
            self.current_latency_label.configure(text="-- ms")
            self.avg_latency_label.configure(text="Avg: -- ms")
    
    def stop_transcription(self):
        """
        Stop the transcription process.
        """
        if not self.is_transcribing:
            return
        
        # Update UI
        self.status_label.configure(text="Status: Stopping...")
        self.stop_button.configure(state="disabled")
        self.root.update()
        
        # Stop pipeline in a separate thread
        threading.Thread(target=self._stop_pipeline, daemon=True).start()
    
    def _stop_pipeline(self):
        """
        Stop the transcription pipeline in a background thread.
        """
        try:
            # Stop pipeline
            if self.pipeline:
                self.pipeline.stop()
                self.pipeline = None
            
            # Update UI
            self.update_queue.put(("status", "Status: Ready"))
            self.update_queue.put(("stop_complete", None))
            
            # Set flag
            self.is_transcribing = False
            
        except Exception as e:
            # Update UI with error
            self.update_queue.put(("status", f"Status: Error - {str(e)}"))
            self.update_queue.put(("stop_failed", None))
    
    def clear_text(self):
        """
        Clear the transcription text area.
        """
        self.text_area.delete("1.0", tk.END)
    
    def update_transcription(self):
        """
        Update the UI with transcription results.
        """
        try:
            # Process all pending updates
            while not self.update_queue.empty():
                update_type, data = self.update_queue.get_nowait()
                
                if update_type == "status":
                    # Update status label
                    self.status_label.configure(text=data)
                
                elif update_type == "transcription":
                    # Append transcription to text area
                    current_text = self.text_area.get("1.0", tk.END).strip()
                    
                    if current_text:
                        # Add space between existing text and new text
                        self.text_area.insert(tk.END, f" {data}")
                    else:
                        # First text, no need for space
                        self.text_area.insert(tk.END, data)
                    
                    # Scroll to end
                    self.text_area.see(tk.END)
                
                elif update_type == "latency":
                    # Update latency display
                    self.update_latency_display(data)
                
                elif update_type == "start_complete":
                    # Enable stop button, keep start button disabled
                    self.stop_button.configure(state="normal")
                
                elif update_type == "start_failed":
                    # Re-enable start button and dropdowns
                    self.start_button.configure(state="normal")
                    self.model_dropdown.configure(state="normal")
                    self.lang_dropdown.configure(state="normal")
                
                elif update_type == "stop_complete":
                    # Re-enable start button and dropdowns
                    self.start_button.configure(state="normal")
                    self.model_dropdown.configure(state="normal")
                    self.lang_dropdown.configure(state="normal")
                
                elif update_type == "stop_failed":
                    # Re-enable stop button
                    self.stop_button.configure(state="normal")
        
        except Exception as e:
            print(f"Update error: {e}")
        
        # Schedule next update
        self.root.after(100, self.update_transcription)

# Main function to run the app
def main():
    root = tk.Tk()
    app = VoiceTranscriptionApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
