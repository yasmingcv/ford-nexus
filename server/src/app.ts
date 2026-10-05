import express, { type NextFunction, type Request, type Response } from 'express';

import './types';
import { authenticate } from './middleware/authenticate';
import { conversationsRouter } from './routes/conversations';
import { notificationsRouter } from './routes/notifications';
import { profilesRouter } from './routes/profiles';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

// Health check público para verificar a disponibilidade da API.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(authenticate);
app.use('/notifications', notificationsRouter);
app.use(conversationsRouter);
app.use(profilesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// Erros inesperados: registra no log, mas não expõe detalhes ao cliente.
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Erro interno. Tente novamente.' });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API ouvindo na porta ${port}`));
