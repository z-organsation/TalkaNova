/**
 * SocketService - WebSocket connection manager for TalkaNova
 * Handles connection lifecycle, reconnection, and message dispatching
 */

type MessageHandler = (data: unknown) => void;
type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface SocketConfig {
    url: string;
    onMessage?: MessageHandler;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
    reconnectAttempts?: number;
    reconnectDelay?: number;
}

class SocketService {
    private ws: WebSocket | null = null;
    private config: SocketConfig | null = null;
    private state: ConnectionState = 'disconnected';
    private reconnectCount = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;

    /**
     * Connect to WebSocket server
     */
    connect(config: SocketConfig): void {
        this.config = config;
        this.state = 'connecting';
        this.reconnectCount = 0;

        try {
            this.ws = new WebSocket(config.url);
            this.setupHandlers();
        } catch (error) {
            console.error('[SocketService] Connection error:', error);
            this.attemptReconnect();
        }
    }

    private setupHandlers(): void {
        if (!this.ws || !this.config) return;

        this.ws.onopen = () => {
            this.state = 'connected';
            this.reconnectCount = 0;
            console.log('[SocketService] Connected');
            this.config?.onConnect?.();
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.config?.onMessage?.(data);
            } catch (error) {
                console.error('[SocketService] Parse error:', error);
            }
        };

        this.ws.onclose = () => {
            this.state = 'disconnected';
            console.log('[SocketService] Disconnected');
            this.config?.onDisconnect?.();
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('[SocketService] Error:', error);
            this.config?.onError?.(error);
        };
    }

    private attemptReconnect(): void {
        if (!this.config) return;
        const maxAttempts = this.config.reconnectAttempts ?? 5;
        const delay = this.config.reconnectDelay ?? 3000;

        if (this.reconnectCount >= maxAttempts) {
            console.log('[SocketService] Max reconnect attempts reached');
            return;
        }

        this.reconnectCount++;
        console.log(`[SocketService] Reconnecting (${this.reconnectCount}/${maxAttempts})...`);

        this.reconnectTimer = setTimeout(() => {
            if (this.config) {
                this.connect(this.config);
            }
        }, delay);
    }

    /**
     * Send JSON message
     */
    send(data: object): boolean {
        if (this.ws?.readyState !== WebSocket.OPEN) {
            console.warn('[SocketService] Not connected, cannot send');
            return false;
        }
        this.ws.send(JSON.stringify(data));
        return true;
    }

    /**
     * Send chat message (convenience method)
     */
    sendChat(content: string): boolean {
        return this.send({ type: 'chat', content });
    }

    /**
     * Disconnect and cleanup
     */
    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.state = 'disconnected';
        this.config = null;
    }

    /**
     * Get current connection state
     */
    getState(): ConnectionState {
        return this.state;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
export const socketService = new SocketService();
export default SocketService;
