import express, { Router } from 'express';
import { z } from 'zod';
import { AuthUtils } from '@foodtrack/backend-shared';
import { UserRepository } from '../repositories/UserRepository';

const router: express.Router = Router();
const userRepository = new UserRepository();

// Login schema
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Register schema
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  tenantId: z.string().uuid(),
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await userRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isValidPassword = await AuthUtils.comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    const token = AuthUtils.generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });

    const refreshToken = AuthUtils.generateRefreshToken(user.id);

    // Update last login
    await userRepository.updateLastLogin(user.id);

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const data = RegisterSchema.parse(req.body);

    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email já está em uso' });
    }

    const hashedPassword = await AuthUtils.hashPassword(data.password);

    const user = await userRepository.create({
      ...data,
      password: hashedPassword,
      role: 'admin', // First user is admin
      permissions: ['*'], // Full permissions for admin
      isActive: true,
    });

    const token = AuthUtils.generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;