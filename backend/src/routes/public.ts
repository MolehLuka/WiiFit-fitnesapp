import { Router } from 'express';
import { query } from '../db';

const publicRoutes = Router();

type Plan = {
  name: string;
  price: number;
  currency: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

type GroupClass = {
  title: string;
  blurb: string;
};

// Plans now stored in the database (table: plans). See schema.sql

// Group classes now stored in the database (table: group_classes)

// GET /api/public/plans
publicRoutes.get('/plans', async (_req, res) => {
  try {
    const result = await query<Plan>(
      'SELECT name, price::float AS price, currency, description, features, highlighted FROM plans ORDER BY price ASC'
    );
    res.json({ plans: result.rows });
  } catch (err) {
    console.error('[public/plans] error', err);
    res.status(500).json({ message: 'Failed to load plans' });
  }
});

// GET /api/public/classes
publicRoutes.get('/classes', async (_req, res) => {
  try {
    const result = await query<GroupClass>(
      'SELECT title, blurb FROM group_classes ORDER BY title ASC'
    );
    res.json({ classes: result.rows });
  } catch (err) {
    console.error('[public/classes] error', err);
    res.status(500).json({ message: 'Failed to load classes' });
  }
});

export default publicRoutes;
