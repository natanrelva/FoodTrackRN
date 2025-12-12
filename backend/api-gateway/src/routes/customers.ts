import express, { Router } from 'express';
import { z } from 'zod';

const router: express.Router = Router();

// Create customer schema
const CreateCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string(),
  address: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }),
});

// GET /api/customers
router.get('/', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    
    // TODO: Implement customer repository
    res.json({
      customers: [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: 0,
        pages: 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res, next) => {
  try {
    // TODO: Implement customer repository
    res.status(404).json({ error: 'Cliente não encontrado' });
  } catch (error) {
    next(error);
  }
});

// POST /api/customers
router.post('/', async (req, res, next) => {
  try {
    const data = CreateCustomerSchema.parse(req.body);
    
    // TODO: Implement customer creation
    res.status(201).json({
      id: 'temp-id',
      ...data,
      tenantId: req.tenantId,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res, next) => {
  try {
    const data = CreateCustomerSchema.partial().parse(req.body);
    
    // TODO: Implement customer update
    res.json({ message: 'Cliente atualizado com sucesso' });
  } catch (error) {
    next(error);
  }
});

export default router;