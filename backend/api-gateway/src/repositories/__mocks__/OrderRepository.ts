export class OrderRepository {
  createWithAutoNumber = jest.fn();
  generateOrderNumber = jest.fn();
  findById = jest.fn();
  findAll = jest.fn();
  update = jest.fn();
  delete = jest.fn();
  findByStatus = jest.fn();
  findByChannel = jest.fn();
  findByDateRange = jest.fn();
  findDelayedOrders = jest.fn();
  getOrderMetrics = jest.fn();
  getChannelPerformance = jest.fn();
}