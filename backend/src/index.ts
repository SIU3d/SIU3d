import express, { Request, Response, NextFunction } from 'express';
import authRoutes from './routes/auth';
import trustFundRoutes from './routes/trustFund';
import productRoutes from './routes/products';
import upgradeRoutes from './routes/upgrades';

const app = express();
const PORT = process.env.PORT || 4000;

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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
