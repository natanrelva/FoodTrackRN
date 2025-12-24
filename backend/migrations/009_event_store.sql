-- Domain Events table (Event Store)
CREATE TABLE domain_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    stream_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    event_version INTEGER NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    correlation_id UUID,
    causation_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event Snapshots table (for performance optimization)
CREATE TABLE event_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    aggregate_version INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, aggregate_type, aggregate_id)
);

-- Event Subscriptions table (for tracking event handlers)
CREATE TABLE event_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_name VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    handler_name VARCHAR(255) NOT NULL,
    last_processed_event_id UUID,
    last_processed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outbox Pattern table (for reliable event publishing)
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    correlation_id UUID,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'published', 'failed')) DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_domain_events_tenant_id ON domain_events(tenant_id);
CREATE INDEX idx_domain_events_stream_id ON domain_events(stream_id);
CREATE INDEX idx_domain_events_event_type ON domain_events(event_type);
CREATE INDEX idx_domain_events_aggregate ON domain_events(aggregate_type, aggregate_id);
CREATE INDEX idx_domain_events_created_at ON domain_events(created_at);
CREATE INDEX idx_domain_events_correlation_id ON domain_events(correlation_id);

CREATE INDEX idx_event_snapshots_tenant_id ON event_snapshots(tenant_id);
CREATE INDEX idx_event_snapshots_aggregate ON event_snapshots(aggregate_type, aggregate_id);

CREATE INDEX idx_event_subscriptions_event_type ON event_subscriptions(event_type);
CREATE INDEX idx_event_subscriptions_active ON event_subscriptions(is_active);
CREATE INDEX idx_event_subscriptions_last_processed ON event_subscriptions(last_processed_at);

CREATE INDEX idx_outbox_events_tenant_id ON outbox_events(tenant_id);
CREATE INDEX idx_outbox_events_status ON outbox_events(status);
CREATE INDEX idx_outbox_events_scheduled_at ON outbox_events(scheduled_at);
CREATE INDEX idx_outbox_events_event_type ON outbox_events(event_type);
CREATE INDEX idx_outbox_events_aggregate ON outbox_events(aggregate_type, aggregate_id);

-- Updated at trigger for subscriptions
CREATE TRIGGER update_event_subscriptions_updated_at BEFORE UPDATE ON event_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();