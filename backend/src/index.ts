import express, { Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import trustFundRoutes from './routes/trustFund';
import productRoutes from './routes/products';
import upgradeRoutes from './routes/upgrades';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'] }));

app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/trust-fund', trustFundRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upgrades', upgradeRoutes);

app.listen(PORT, () => {
  console.log(`Infinity Warranty backend listening on port ${PORT}`);
});
