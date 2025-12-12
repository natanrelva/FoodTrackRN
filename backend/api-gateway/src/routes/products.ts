import express, { Router } from 'express';
import { z } from 'zod';
import { ProductRepository } from '../repositories/ProductRepository';

const router: express.Router = Router();
const productRepository = new ProductRepository();

// Create product schema
const CreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  image: z.string().url(),
  category: z.string(),
  stock: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  extras: z.array(z.object({
    name: z.string(),
    price: z.number().positive(),
  })).optional(),
  tags: z.array(z.string()).default([]),
  preparationTime: z.number().int().positive().optional(),
});

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const { category, active, search } = req.query;
    
    const filters: any = {};
    if (category) filters.category = category;
    if (active !== undefined) filters.active = active === 'true';
    if (search) filters.search = search;

    const products = await productRepository.findAll(req.tenantId!, filters);
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const product = await productRepository.findById(req.params.id, req.tenantId!);
    
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

// POST /api/products
router.post('/', async (req, res, next) => {
  try {
    const data = CreateProductSchema.parse(req.body);
    
    const product = await productRepository.create({
      ...data,
      tenantId: req.tenantId!,
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res, next) => {
  try {
    const data = CreateProductSchema.partial().parse(req.body);
    
    const product = await productRepository.update(req.params.id, data, req.tenantId!);
    
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await productRepository.delete(req.params.id, req.tenantId!);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;