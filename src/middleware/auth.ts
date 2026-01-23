import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Faction } from '../models/User';

// Rozszerzenie interfejsu Request o dane użytkownika
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    faction: Faction;
  };
}

export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Pobranie tokenu z nagłówka
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Brak tokenu autoryzacji'
      });
    }

    const token = authHeader.split(' ')[1];

    // Weryfikacja tokenu
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthRequest['user'];

    // Dodanie danych użytkownika do requestu
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token wygasł'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Nieprawidłowy token'
    });
  }
};