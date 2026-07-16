/**
 * IPCService
 *
 * Inter-process communication layer between the React frontend and
 * the Rust Tauri backend.
 *
 * Responsibilities (Phase 2+):
 * - Wrapping Tauri `invoke` calls with typed request/response contracts
 * - Subscribing to and forwarding backend events to the frontend
 * - Providing a unified error boundary for all IPC failures
 */
class IPCService {}

export default IPCService;
