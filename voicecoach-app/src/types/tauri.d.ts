// Tauri window type definitions
interface Window {
  __TAURI_IPC__?: (event: string, handler: (event: any) => void) => () => void;
}