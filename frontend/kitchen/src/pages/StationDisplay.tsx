import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Progress } from '../components/ui/progress'
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  PlayCircle, 
  PauseCircle,
  HelpCircle,
  Settings,
  Thermometer,
  Timer
} from 'lucide-react'
import { kitchenOperations } from '../lib/api'
import { KitchenOrder, KitchenOrderItem, ItemStatus, KITCHEN_STATUS_LABELS } from '../types/kitchen'

interface StationInstructions {
  stationId: string
  stationType: string
  activeOrders: KitchenOrderItem[]
  priorityQueue: KitchenOrderItem[]
  specialInstructions: string[]
  equipmentStatus: Array<{
    id: string
    type: string
    name: string
    status: 'operational' | 'maintenance' | 'offline'
    temperature?: number
  }>
  currentCapacity: number
  maxCapacity: number
  utilizationRate: number
  estimatedWaitTime: number
}

export function StationDisplay() {
  const { stationId } = useParams<{ stationId: string }>()
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [instructions, setInstructions] = useState<StationInstructions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const [showIssueDialog, setShowIssueDialog] = useState(false)

  useEffect(() => {
    if (!stationId) return

    const loadStationData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load station orders and instructions in parallel
        const [ordersResult, instructionsResult] = await Promise.all([
          kitchenOperations.getStationOrders(stationId, {
            status: ['received', 'in_preparation', 'ready_for_plating']
          }),
          kitchenOperations.getStationInstructions(stationId)
        ])

        setOrders(ordersResult.orders)
        setInstructions(instructionsResult)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load station data')
      } finally {
        setLoading(false)
      }
    }

    loadStationData()

    // Refresh data every 30 seconds
    const interval = setInterval(loadStationData, 30000)
    return () => clearInterval(interval)
  }, [stationId])

  const handleItemStatusUpdate = async (orderId: string, itemId: string, newStatus: ItemStatus) => {
    try {
      await kitchenOperations.updateItemStatus(orderId, itemId, newStatus)
      
      // Refresh orders after status update
      const ordersResult = await kitchenOperations.getStationOrders(stationId!, {
        status: ['received', 'in_preparation', 'ready_for_plating']
      })
      setOrders(ordersResult.orders)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item status')
    }
  }

  const handleHelpRequest = async (requestType: string, description: string, priority: string) => {
    try {
      await kitchenOperations.createHelpRequest(
        stationId!,
        requestType as any,
        description,
        priority as any
      )
      setShowHelpDialog(false)
      // Show success message or notification
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create help request')
    }
  }

  const handleIssueReport = async (issue: any) => {
    try {
      await kitchenOperations.reportStationIssue(stationId!, issue)
      setShowIssueDialog(false)
      // Show success message or notification
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to report issue')
    }
  }

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'pending': return 'bg-gray-500'
      case 'assigned': return 'bg-blue-500'
      case 'in_progress': return 'bg-yellow-500'
      case 'ready': return 'bg-green-500'
      case 'completed': return 'bg-emerald-500'
      case 'on_hold': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading station data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 tablet-optimized">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link 
            to="/dashboard" 
            className="p-3 rounded-lg bg-secondary hover:bg-secondary/90 touch-target"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {instructions ? instructions.stationType.charAt(0).toUpperCase() + instructions.stationType.slice(1) : 'Unknown'} Station
            </h1>
            <p className="text-muted-foreground">Station ID: {stationId}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowHelpDialog(true)}
            className="touch-target"
          >
            <HelpCircle className="h-5 w-5 mr-2" />
            Help
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowIssueDialog(true)}
            className="touch-target"
          >
            <AlertTriangle className="h-5 w-5 mr-2" />
            Report Issue
          </Button>
        </div>
      </div>

      {/* Station Status */}
      {instructions && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Capacity</p>
                  <p className="text-lg font-semibold">
                    {instructions.currentCapacity}/{instructions.maxCapacity}
                  </p>
                </div>
              </div>
              <Progress 
                value={instructions.utilizationRate} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Wait Time</p>
                  <p className="text-lg font-semibold">{instructions.estimatedWaitTime}m</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Timer className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Orders</p>
                  <p className="text-lg font-semibold">{orders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Equipment</p>
                  <p className="text-lg font-semibold">
                    {instructions.equipmentStatus.filter(eq => eq.status === 'operational').length}/
                    {instructions.equipmentStatus.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Equipment Status */}
      {instructions && instructions.equipmentStatus.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Equipment Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instructions.equipmentStatus.map((equipment) => (
                <div 
                  key={equipment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      equipment.status === 'operational' ? 'bg-green-500' :
                      equipment.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">{equipment.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{equipment.status}</p>
                    </div>
                  </div>
                  {equipment.temperature && (
                    <div className="flex items-center space-x-1 text-sm">
                      <Thermometer className="h-4 w-4" />
                      <span>{equipment.temperature}°F</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {orders.map((order) => (
          <Card key={order.id} className="touch-optimized">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Order #{order.orderId.slice(-6)}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge className={getPriorityColor(order.priority)}>
                    {order.priority.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {KITCHEN_STATUS_LABELS[order.status]}
                  </Badge>
                </div>
              </div>
              <CardDescription>
                Est. completion: {new Date(order.estimatedCompletionTime).toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Special Instructions */}
              {order.specialInstructions && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{order.specialInstructions}</AlertDescription>
                </Alert>
              )}

              {/* Allergen Alerts */}
              {order.allergenAlerts.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-medium text-red-800 mb-2">⚠️ Allergen Alerts</p>
                  <div className="space-y-1">
                    {order.allergenAlerts.map((alert, index) => (
                      <p key={index} className="text-sm text-red-700">
                        {alert.description} ({alert.severity})
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`} />
                        <div>
                          <p className="font-medium">{item.name || 'Unknown Item'}</p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity} • Est: {item.estimatedTime}m
                          </p>
                          {item.modifications.length > 0 && (
                            <p className="text-sm text-blue-600">
                              Mods: {item.modifications.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {item.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleItemStatusUpdate(order.id, item.id, 'in_progress')}
                          className="touch-target"
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {item.status === 'in_progress' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleItemStatusUpdate(order.id, item.id, 'on_hold')}
                            className="touch-target"
                          >
                            <PauseCircle className="h-4 w-4 mr-1" />
                            Hold
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleItemStatusUpdate(order.id, item.id, 'ready')}
                            className="touch-target"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Ready
                          </Button>
                        </>
                      )}
                      {item.status === 'ready' && (
                        <Button
                          size="sm"
                          onClick={() => handleItemStatusUpdate(order.id, item.id, 'completed')}
                          className="touch-target"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {orders.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No active orders for this station.</p>
          </CardContent>
        </Card>
      )}

      {/* Help Request Dialog */}
      {showHelpDialog && (
        <HelpRequestDialog
          onClose={() => setShowHelpDialog(false)}
          onSubmit={handleHelpRequest}
        />
      )}

      {/* Issue Report Dialog */}
      {showIssueDialog && (
        <IssueReportDialog
          onClose={() => setShowIssueDialog(false)}
          onSubmit={handleIssueReport}
        />
      )}
    </div>
  )
}

// Help Request Dialog Component
function HelpRequestDialog({ 
  onClose, 
  onSubmit 
}: { 
  onClose: () => void
  onSubmit: (type: string, description: string, priority: string) => void 
}) {
  const [requestType, setRequestType] = useState('equipment')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (description.trim()) {
      onSubmit(requestType, description, priority)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Request Help</CardTitle>
          <CardDescription>
            Describe what assistance you need
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Request Type</label>
              <select 
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="equipment">Equipment Issue</option>
                <option value="ingredient">Need Ingredients</option>
                <option value="technique">Technique Help</option>
                <option value="emergency">Emergency</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what help you need..."
                className="w-full p-2 border rounded-md h-24 resize-none"
                required
              />
            </div>
            
            <div className="flex space-x-2">
              <Button type="submit" className="flex-1">
                Send Request
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Issue Report Dialog Component
function IssueReportDialog({ 
  onClose, 
  onSubmit 
}: { 
  onClose: () => void
  onSubmit: (issue: any) => void 
}) {
  const [issueType, setIssueType] = useState('equipment_failure')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('minor')
  const [estimatedDowntime, setEstimatedDowntime] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (description.trim()) {
      onSubmit({
        type: issueType,
        description,
        severity,
        estimatedDowntime: estimatedDowntime ? parseInt(estimatedDowntime) : 0,
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Report Issue</CardTitle>
          <CardDescription>
            Report a problem with the station
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Issue Type</label>
              <select 
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="equipment_failure">Equipment Failure</option>
                <option value="supply_shortage">Supply Shortage</option>
                <option value="staff_shortage">Staff Shortage</option>
                <option value="cleanliness">Cleanliness Issue</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Severity</label>
              <select 
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Estimated Downtime (minutes)
              </label>
              <input
                type="number"
                value={estimatedDowntime}
                onChange={(e) => setEstimatedDowntime(e.target.value)}
                placeholder="0"
                className="w-full p-2 border rounded-md"
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue..."
                className="w-full p-2 border rounded-md h-24 resize-none"
                required
              />
            </div>
            
            <div className="flex space-x-2">
              <Button type="submit" className="flex-1">
                Report Issue
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}