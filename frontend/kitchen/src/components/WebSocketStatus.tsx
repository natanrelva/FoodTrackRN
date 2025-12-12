
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Wifi, WifiOff, RotateCcw } from 'lucide-react';

export function WebSocketStatus() {
  const { connected, connecting, error, connect } = useWebSocketContext();

  if (connected) {
    return (
      <Badge variant="default" className="bg-green-500 text-white">
        <Wifi className="w-3 h-3 mr-1" />
        Live
      </Badge>
    );
  }

  if (connecting) {
    return (
      <Badge variant="secondary" className="bg-yellow-500 text-white">
        <RotateCcw className="w-3 h-3 mr-1 animate-spin" />
        Connecting...
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="destructive">
        <WifiOff className="w-3 h-3 mr-1" />
        Offline
      </Badge>
      {error && (
        <Alert className="max-w-md">
          <AlertDescription className="text-sm">
            Connection error: {error}
            <Button
              variant="outline"
              size="sm"
              onClick={connect}
              className="ml-2"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default WebSocketStatus;