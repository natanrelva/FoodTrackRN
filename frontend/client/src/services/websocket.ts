import { clientApi } from './api/client';

export interface WebSocketConfig {
  url: string;
  token: string;
}

export class ClientWebSocketService {
  private static instance: ClientWebSocketService;
  private config: WebSocketConfig | null = null;

  private constructor() {}

  static getInstance(): ClientWebSocketService {
    if (!ClientWebSocketService.instance) {
      ClientWebSocketService.instance = new ClientWebSocketService();
    }
    return ClientWebSocketService.instance;
  }

  async getWebSocketConfig(): Promise<WebSocketConfig | null> {
    try {
      const response = await clientApi.getWebSocketToken();
      
      if (response.success && response.data) {
        this.config = {
          url: response.data.url,
          token: response.data.token,
        };
        return this.config;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get WebSocket config:', error);
      return null;
    }
  }

  getConfig(): WebSocketConfig | null {
    return this.config;
  }

  clearConfig(): void {
    this.config = null;
  }
}

export const clientWebSocketService = ClientWebSocketService.getInstance();