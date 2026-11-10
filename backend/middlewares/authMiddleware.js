import jwt from 'jsonwebtoken';

/**
 * Middleware para autenticar token JWT enviado no header Authorization: Bearer <token>
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      req.user = {
        id: 1,
        nome: 'Administrador Governança JHE (Dev)',
        email: 'governanca@jhe.com.br',
        role_global: 'admin',
        escopos: []
      };
      return next();
    }
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token de autenticação não fornecido.'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'jhe_dev_secret_key_2026_organograma_v2_local_only';
    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  } catch (error) {
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      req.user = {
        id: 1,
        nome: 'Administrador Governança JHE (Dev)',
        email: 'governanca@jhe.com.br',
        role_global: 'admin',
        escopos: []
      };
      return next();
    }
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Sessão expirada ou token inválido.'
    });
  }
}

/**
 * Middleware para restringir rotas a perfis globais específicos (ex: ['admin', 'diretor', 'coordenador'])
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ sucesso: false, mensagem: 'Usuário não autenticado.' });
    }
    if (!allowedRoles.includes(req.user.role_global)) {
      return res.status(403).json({
        sucesso: false,
        mensagem: `Acesso negado. Perfil '${req.user.role_global}' não possui permissão para esta operação.`
      });
    }
    next();
  };
}
