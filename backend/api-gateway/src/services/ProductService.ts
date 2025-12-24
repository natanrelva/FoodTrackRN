import { ProductRepository } from '../repositories/ProductRepository';
import { eventBus } from '@foodtrack/backend-shared';
import { 
  Product, 
  CreateProductRequest, 
  UpdateProductRequest, 
  ProductFilters,
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductAvailabilityChangedEvent,
  ProductDeletedEvent
} from '../models/Product';

export class ProductService {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }

  async findById(id: string, tenantId: string): Promise<Product | null> {
    try {
      return await this.productRepository.findById(id, tenantId);
    } catch (error) {
      throw new Error(`Failed to find product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(tenantId: string, filters: ProductFilters = {}): Promise<{ products: Product[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { products, total } = await this.productRepository.findAll(tenantId, filters);
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const totalPages = Math.ceil(total / limit);

      return {
        products,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw new Error(`Failed to find products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(data: CreateProductRequest, tenantId: string): Promise<Product> {
    try {
      // Create product
      const product = await this.productRepository.create({
        ...data,
        tenantId,
      });

      // Emit ProductCreated event
      const event: ProductCreatedEvent = {
        eventType: 'ProductCreated',
        payload: {
          productId: product.id,
          tenantId: product.tenantId,
          name: product.name,
          category: product.category,
          price: product.price,
          active: product.active,
          createdAt: product.createdAt,
        },
      };

      await eventBus.publish([event]);

      return product;
    } catch (error) {
      throw new Error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(id: string, data: UpdateProductRequest, tenantId: string): Promise<Product | null> {
    try {
      // Get current product for comparison
      const currentProduct = await this.productRepository.findById(id, tenantId);
      if (!currentProduct) {
        return null;
      }

      // Update product
      const updatedProduct = await this.productRepository.update(id, data, tenantId);
      if (!updatedProduct) {
        return null;
      }

      // Determine what changed
      const changes: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        const currentValue = (currentProduct as any)[key];
        const newValue = (updatedProduct as any)[key];
        if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
          changes[key] = {
            from: currentValue,
            to: newValue,
          };
        }
      });

      // Emit ProductUpdated event
      const event: ProductUpdatedEvent = {
        eventType: 'ProductUpdated',
        payload: {
          productId: updatedProduct.id,
          tenantId: updatedProduct.tenantId,
          changes,
          updatedAt: updatedProduct.updatedAt,
        },
      };

      await eventBus.publish([event]);

      // If availability changed, emit specific event
      if (changes.active) {
        const availabilityEvent: ProductAvailabilityChangedEvent = {
          eventType: 'ProductAvailabilityChanged',
          payload: {
            productId: updatedProduct.id,
            tenantId: updatedProduct.tenantId,
            active: updatedProduct.active,
            previousActive: currentProduct.active,
            updatedAt: updatedProduct.updatedAt,
          },
        };

        await eventBus.publish([availabilityEvent]);
      }

      return updatedProduct;
    } catch (error) {
      throw new Error(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    try {
      // Get product before deletion for event
      const product = await this.productRepository.findById(id, tenantId);
      if (!product) {
        return false;
      }

      // Soft delete product
      const deleted = await this.productRepository.delete(id, tenantId);
      
      if (deleted) {
        // Emit ProductDeleted event
        const event: ProductDeletedEvent = {
          eventType: 'ProductDeleted',
          payload: {
            productId: product.id,
            tenantId: product.tenantId,
            deletedAt: new Date(),
          },
        };

        await eventBus.publish([event]);
      }

      return deleted;
    } catch (error) {
      throw new Error(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateAvailability(id: string, active: boolean, tenantId: string): Promise<Product | null> {
    try {
      // Get current product for comparison
      const currentProduct = await this.productRepository.findById(id, tenantId);
      if (!currentProduct) {
        return null;
      }

      // Update availability
      const updatedProduct = await this.productRepository.updateAvailability(id, active, tenantId);
      if (!updatedProduct) {
        return null;
      }

      // Emit ProductAvailabilityChanged event
      const event: ProductAvailabilityChangedEvent = {
        eventType: 'ProductAvailabilityChanged',
        payload: {
          productId: updatedProduct.id,
          tenantId: updatedProduct.tenantId,
          active: updatedProduct.active,
          previousActive: currentProduct.active,
          updatedAt: updatedProduct.updatedAt,
        },
      };

      await eventBus.publish([event]);

      return updatedProduct;
    } catch (error) {
      throw new Error(`Failed to update product availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByCategory(category: string, tenantId: string): Promise<Product[]> {
    try {
      return await this.productRepository.findByCategory(category, tenantId);
    } catch (error) {
      throw new Error(`Failed to find products by category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCategories(tenantId: string): Promise<string[]> {
    try {
      return await this.productRepository.getCategories(tenantId);
    } catch (error) {
      throw new Error(`Failed to get categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateProductExists(id: string, tenantId: string): Promise<boolean> {
    try {
      const product = await this.productRepository.findById(id, tenantId);
      return product !== null && product.active;
    } catch (error) {
      return false;
    }
  }

  async validateProductsExist(productIds: string[], tenantId: string): Promise<{ valid: boolean; invalidIds: string[] }> {
    try {
      const invalidIds: string[] = [];
      
      for (const id of productIds) {
        const exists = await this.validateProductExists(id, tenantId);
        if (!exists) {
          invalidIds.push(id);
        }
      }

      return {
        valid: invalidIds.length === 0,
        invalidIds,
      };
    } catch (error) {
      return {
        valid: false,
        invalidIds: productIds,
      };
    }
  }

  async updateStock(id: string, quantity: number, tenantId: string): Promise<Product | null> {
    try {
      const product = await this.productRepository.findById(id, tenantId);
      if (!product) {
        return null;
      }

      const newStock = Math.max(0, product.stock + quantity);
      
      return await this.productRepository.update(id, { stock: newStock }, tenantId);
    } catch (error) {
      throw new Error(`Failed to update product stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getLowStockProducts(tenantId: string, threshold: number = 10): Promise<Product[]> {
    try {
      const { products } = await this.productRepository.findAll(tenantId, { active: true });
      return products.filter(product => product.stock <= threshold);
    } catch (error) {
      throw new Error(`Failed to get low stock products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}