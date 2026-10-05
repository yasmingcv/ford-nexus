import type { NextFunction, Request, Response } from 'express';

import { adminAuth } from '../services/firebaseAdmin';

/** Valida o Firebase ID Token enviado em "Authorization: Bearer <token>". */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) {
    res.status(401).json({ error: 'Token ausente.' });
    return;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(match[1], true);
    if (decoded.firebase.sign_in_provider !== 'password') {
      res.status(403).json({ error: 'Somente autenticação por e-mail e senha é aceita.' });
      return;
    }
    res.locals.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}
