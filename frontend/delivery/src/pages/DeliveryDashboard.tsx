import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Clock, Users, Package } from 'lucide-react'
import { useWebSocketContext } from '../contexts/WebSocketContext'

export function DeliveryDashboard() {
  const { 
    connected, 
    availableDeliveries, 
    assignedDeliveries, 
    acceptDelivery 
  } = useWebSocketContext();

  const handleAcceptDelivery = (orderId: string) => {
    acceptDelivery(orderId);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Delivery Dashboard</h1>
        <p className="text-gray-600">Monitor and manage all delivery operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedDeliveries.length}</div>
            <p className="text-xs text-muted-foreground">
              {connected ? '● Live data' : 'Offline data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              3 on break
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Delivery Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28m</div>
            <p className="text-xs text-muted-foreground">
              -3m from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableDeliveries.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting assignment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Queue */}
        <Card>
          <CardHeader>
            <CardTitle>Order Queue</CardTitle>
            <CardDescription>
              Pending orders awaiting delivery assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableDeliveries.length > 0 ? (
                availableDeliveries.map((orderEvent) => {
                  const order = orderEvent.payload.order;
                  return (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Order #{order.number || order.id.slice(0, 8)}</span>
                          <Badge variant="outline">{order.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {(order as any).deliveryAddress || 'Address not available'} • {(order as any).totalAmount ? `R$ ${(order as any).totalAmount.toFixed(2)}` : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleAcceptDelivery(order.id)}>
                        Accept
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {connected ? 'No pending deliveries' : 'Connecting to real-time updates...'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle>Active Deliveries</CardTitle>
            <CardDescription>
              Real-time tracking of ongoing deliveries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignedDeliveries.length > 0 ? (
                assignedDeliveries.map((deliveryEvent) => {
                  const delivery = deliveryEvent.payload;
                  return (
                    <div key={delivery.orderId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Agent {delivery.deliveryAgentId?.slice(0, 8) || 'Unknown'}</span>
                          <Badge variant="default">{delivery.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Order #{delivery.orderId.slice(0, 8)} • ETA: {delivery.estimatedArrival ? new Date(delivery.estimatedArrival).toLocaleTimeString() : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {delivery.location ? `Lat: ${delivery.location.lat.toFixed(4)}, Lng: ${delivery.location.lng.toFixed(4)}` : 'Location not available'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">Track</Button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {connected ? 'No active deliveries' : 'Connecting to real-time updates...'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Map</CardTitle>
          <CardDescription>
            Live tracking of all delivery agents and routes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Interactive map will be integrated here</p>
              <p className="text-sm text-gray-400">Maps API integration pending</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}