const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'balansai_super_secret_fintech_jwt_key_2026';

const authService = {
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  },

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return null;
    }
  },

  hashPassword(password) {
    return bcrypt.hashSync(password, 10);
  },

  comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  },

  // Express middleware
  authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Avtorizatsiyadan o\'tmagansiz. Iltimos tizimga kiring.' });
    }

    const payload = authService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Sessiya muddati tugagan yoki token noto\'g\'ri.' });
    }

    const user = db.findById('users', payload.id);
    if (!user) {
      return res.status(401).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId
    };

    next();
  },

  requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'superadmin') {
      return next();
    }
    return res.status(403).json({ error: 'Bu amalni bajarish uchun Superadmin huquqi talab qilinadi.' });
  }
};

module.exports = authService;
