import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import authRoutes from './routes/auth';
import resourceRoutes from './routes/resources'
import shipRoutes from './routes/ships';
import celestialRoutes from './routes/celestial';
import missionRoutes from './routes/missions';
import mineRoutes from './routes/mines';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/ships', shipRoutes);
app.use('/api/celestial', celestialRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/mines', mineRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});