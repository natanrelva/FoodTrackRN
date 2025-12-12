// Admin-specific Types

import { ChannelStatus, NotificationStatus } from './status';

// User Management
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

// Channel Integration
export interface Channel {
  id: string;
  name: string;
  type: string;
  status: ChannelStatus;
  lastSync: string;
}

// Message Logging
export interface MessageLog {
  id: string;
  channel: string;
  message: string;
  timestamp: string;
  status: NotificationStatus;
}