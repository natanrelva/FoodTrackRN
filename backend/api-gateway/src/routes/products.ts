import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ProductService } from '../services/ProductService';
import { 
  CreateProductSchema, 
  UpdateProductSchema, 
  ProductFiltersSchema,
  UpdateAvailabilitySchema,
  ProductResponseSchema,
  ProductListResponseSchema
} from '../models/Product';

const router = Router();
const productService = new ProductService();

// GET /api/products - List products with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    // Parse and validate query parameters
    const filters = ProductFiltersSchema.parse({
      category: req.query.category,
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
      search: req.query.search,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });

    const result = await productService.findAll(tenantId, filters);

    const response: ProductListResponseSchema = {
      success: true,
      data: result,
    };

    res.json(response);
  } catch (error) {
    console.error('Error listing products:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list products',
      },
    });
  }
});

// GET /api/products/categories - Get all categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const categories = await productService.getCategories(tenantId);

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get categories',
      },
    });
  }
});

// GET /api/products/:id - Get product by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const { id } = req.params;
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid product ID format',
        },
      });
    }

    const product = await productService.findById(id, tenantId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    const response: ProductResponseSchema = {
      success: true,
      data: product,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get product',
      },
    });
  }
});

// POST /api/products - Create new product
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const productData = CreateProductSchema.parse(req.body);
    const product = await productService.create(productData, tenantId);

    const response: ProductResponseSchema = {
      success: true,
      data: product,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating product:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid product data',
          details: error.errors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create product',
      },
    });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const { id } = req.params;
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid product ID format',
        },
      });
    }

    const updateData = UpdateProductSchema.parse(req.body);
    const product = await productService.update(id, updateData, tenantId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    const response: ProductResponseSchema = {
      success: true,
      data: product,
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating product:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data',
          details: error.errors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update product',
      },
    });
  }
});

// DELETE /api/products/:id - Delete product (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const { id } = req.params;
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid product ID format',
        },
      });
    }

    const deleted = await productService.delete(id, tenantId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Product deleted successfully',
      },
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete product',
      },
    });
  }
});

// PUT /api/products/:id/availability - Update product availability
router.put('/:id/availability', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const { id } = req.params;
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid product ID format',
        },
      });
    }

    const { active } = UpdateAvailabilitySchema.parse(req.body);
    const product = await productService.updateAvailability(id, active, tenantId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    const response: ProductResponseSchema = {
      success: true,
      data: product,
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating product availability:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid availability data',
          details: error.errors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update product availability',
      },
    });
  }
});

// GET /api/products/category/:category - Get products by category
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const { category } = req.params;
    const products = await productService.findByCategory(category, tenantId);

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Error getting products by category:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get products by category',
      },
    });
  }
});

export default router;