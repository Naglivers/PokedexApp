// Supabase Realtime uses the platform WebSocket in React Native.
// This shim prevents Metro from bundling the Node-only `ws` implementation.
const NativeWebSocket = globalThis.WebSocket;

module.exports = NativeWebSocket;
