import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, exposedHeaders: ['Content-Disposition'] }));
app.use(express.json());
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Routes will be mounted here in later steps

app.use(notFoundHandler);
app.use(errorHandler);

export default app;