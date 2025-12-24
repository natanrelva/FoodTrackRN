import { Pool, PoolClient } from 'pg';
import { DatabaseConnection, BaseRepository } from '@foodtrack/backend-shared';
import { 
  ProductionContract, 
  ProductionContractSchema,
  ProductionContractStatus
} from '../models/ProductionContract';

export class ProductionContractRepository extends BaseRepository<ProductionContract> {
  constructor() {
    super('production_contracts');
  }

  async findById(id: string, tenantId: string): Promise<ProductionContract | null> {
    const query = `
      SELECT 
        id,
        tenant_id as "tenantId",
        order_id as "orderId",
        contract_data as "contractData",
        status,
        version,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM production_contracts 
      WHERE id = $1 AND tenant_id = $2
    `;
    
    try {
      const result = await this.pool.query(query, [id, tenantId]);
      return result.rows[0] ? this.mapRowToContract(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find production contract by id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByOrderId(orderId: string, tenantId: string): Promise<ProductionContract | null> {
    const query = `
      SELECT 
        id,
        tenant_id as "tenantId",
        order_id as "orderId",
        contract_data as "contractData",
        status,
        version,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM production_contracts 
      WHERE order_id = $1 AND tenant_id = $2
    `;
    
    try {
      const result = await this.pool.query(query, [orderId, tenantId]);
      return result.rows[0] ? this.mapRowToContract(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find production contract by order id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(tenantId: string, filters: { status?: ProductionContractStatus } = {}): Promise<ProductionContract[]> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    const query = `
      SELECT 
        id,
        tenant_id as "tenantId",
        order_id as "orderId",
        contract_data as "contractData",
        status,
        version,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM production_contracts 
      ${whereClause}
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map(row => this.mapRowToContract(row));
    } catch (error) {
      throw new Error(`Failed to find production contracts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(contract: ProductionContract): Promise<ProductionContract> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO production_contracts (
          id, tenant_id, order_id, contract_data, status, version,
          estimated_completion_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING 
          id,
          tenant_id as "tenantId",
          order_id as "orderId",
          contract_data as "contractData",
          status,
          version,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;
      
      const values = [
        contract.id,
        contract.tenantId,
        contract.orderId,
        JSON.stringify(contract.contractData),
        contract.status,
        contract.version,
        contract.contractData.estimatedCompletionTime,
      ];
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return this.mapRowToContract(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create production contract: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async update(id: string, data: Partial<ProductionContract>, tenantId: string): Promise<ProductionContract | null> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (data.contractData !== undefined) {
        updateFields.push(`contract_data = $${paramIndex++}`);
        values.push(JSON.stringify(data.contractData));
      }

      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }

      if (data.version !== undefined) {
        updateFields.push(`version = $${paramIndex++}`);
        values.push(data.version);
      }

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      updateFields.push(`updated_at = NOW()`);
      
      const query = `
        UPDATE production_contracts 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
        RETURNING 
          id,
          tenant_id as "tenantId",
          order_id as "orderId",
          contract_data as "contractData",
          status,
          version,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;
      
      values.push(id, tenantId);
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return result.rows[0] ? this.mapRowToContract(result.rows[0]) : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update production contract: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, status: ProductionContractStatus, tenantId: string): Promise<ProductionContract | null> {
    return this.update(id, { status }, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    // Soft delete by setting status to cancelled
    const result = await this.updateStatus(id, 'cancelled', tenantId);
    return result !== null;
  }

  async findPendingContracts(tenantId: string): Promise<ProductionContract[]> {
    return this.findAll(tenantId, { status: 'pending' });
  }

  async findActiveContracts(tenantId: string): Promise<ProductionContract[]> {
    const query = `
      SELECT 
        id,
        tenant_id as "tenantId",
        order_id as "orderId",
        contract_data as "contractData",
        status,
        version,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM production_contracts 
      WHERE tenant_id = $1 AND status IN ('pending', 'assigned', 'in_preparation')
      ORDER BY 
        CASE 
          WHEN (contract_data->>'priority') = 'urgent' THEN 1
          WHEN (contract_data->>'priority') = 'high' THEN 2
          WHEN (contract_data->>'priority') = 'medium' THEN 3
          ELSE 4
        END,
        created_at ASC
    `;

    try {
      const result = await this.pool.query(query, [tenantId]);
      return result.rows.map(row => this.mapRowToContract(row));
    } catch (error) {
      throw new Error(`Failed to find active production contracts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods
  private mapRowToContract(row: any): ProductionContract {
    const contractData = typeof row.contractData === 'string' ? JSON.parse(row.contractData) : row.contractData;
    
    // Convert estimatedCompletionTime string back to Date object
    if (contractData.estimatedCompletionTime && typeof contractData.estimatedCompletionTime === 'string') {
      contractData.estimatedCompletionTime = new Date(contractData.estimatedCompletionTime);
    }
    
    return ProductionContractSchema.parse({
      id: row.id,
      tenantId: row.tenantId,
      orderId: row.orderId,
      contractData,
      status: row.status,
      version: row.version,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }
}