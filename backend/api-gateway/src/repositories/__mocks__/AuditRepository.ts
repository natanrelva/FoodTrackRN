export class AuditRepository {
  logOrderStatusChange = jest.fn();
  getOrderAuditLogs = jest.fn();
  logUserAction = jest.fn();
  getAuditLogs = jest.fn();
}