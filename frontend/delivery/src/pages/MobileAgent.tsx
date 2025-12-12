import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Smartphone, Navigation, CheckCircle, Camera, MapPin } from 'lucide-react'

export function MobileAgent() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mobile Agent Interface</h1>
        <p className="text-gray-600">Delivery agent mobile-optimized interface</p>
      </div>

      {/* Agent Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Agent Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Agent ID: A001</p>
              <p className="text-sm text-gray-600">Current Status: Available</p>
            </div>
            <Badge variant="default">Online</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Orders</CardTitle>
          <CardDescription>
            Orders assigned to you for delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((order) => (
              <div key={order} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Order #{1000 + order}</h3>
                    <p className="text-sm text-gray-600">
                      Pickup: Restaurant ABC • Deliver: 123 Main St
                    </p>
                  </div>
                  <Badge variant={order === 1 ? 'default' : 'secondary'}>
                    {order === 1 ? 'Accepted' : 'Pending'}
                  </Badge>
                </div>
                
                <div className="flex space-x-2">
                  {order === 1 ? (
                    <>
                      <Button size="sm" className="flex-1">
                        <Navigation className="h-4 w-4 mr-2" />
                        Navigate
                      </Button>
                      <Button variant="outline" size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Pickup
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" className="flex-1">Accept</Button>
                      <Button variant="outline" size="sm">Decline</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start">
              <Camera className="h-4 w-4 mr-2" />
              Confirm Pickup
            </Button>
            <Button className="w-full justify-start">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Delivery
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <MapPin className="h-4 w-4 mr-2" />
              Update Location
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Route</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Restaurant ABC (Pickup)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span className="text-sm text-gray-600">123 Main St (Delivery)</span>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">ETA: 25 minutes</p>
                <p className="text-xs text-gray-600">Distance: 3.2 km</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Optimization Note */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Smartphone className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">This interface is optimized for mobile devices</p>
            <p className="text-xs">GPS integration and camera features will be available on mobile</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}