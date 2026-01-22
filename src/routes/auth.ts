import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User, { Faction } from '../models/User';

const router = Router();

//POST /api/auth/register

interface RegisterBody {
  username: string;
  email: string;
  password: string;
  faction: Faction;
}

router.post('/register', async (req: Request<{}, {}, RegisterBody>, res: Response) => {
  try {
    const { username, email, password, faction } = req.body;

    if (!username || !email || !password || !faction) {
      return res.status(400).json({
        success: false,
        message: 'Wszystkie pola są wymagane'
      });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Nazwa użytkownika musi mieć 3-20 znaków'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy format email'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Hasło musi mieć minimum 6 znaków'
      });
    }

    if (!Object.values(Faction).includes(faction)) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowa frakcja',
        validFactions: Object.values(Faction)
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Nazwa użytkownika';
      return res.status(409).json({
        success: false,
        message: `${field} jest już zajęty/a`
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    //Tworzenie usera
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      faction
      // resources - domyślne wartości ze schematu
    });

    await newUser.save();

    // JWT
    const token = jwt.sign(
      { 
        userId: newUser._id,
        username: newUser.username,
        faction: newUser.faction
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Konto utworzone pomyślnie',
      data: {
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          faction: newUser.faction,
          resources: newUser.resources,
          createdAt: newUser.createdAt
        },
        token
      }
    });

  } catch (error) {
    console.error('Błąd rejestracji:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas rejestracji'
    });
  }
});

export default router;