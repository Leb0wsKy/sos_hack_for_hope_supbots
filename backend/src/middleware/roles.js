export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        requiredRole: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Helper middleware
export const requireLevel1 = checkRole(['LEVEL1', 'LEVEL2', 'LEVEL3', 'LEVEL4']);
export const requireLevel2 = checkRole(['LEVEL2', 'LEVEL3', 'LEVEL4']);
export const requireLevel3 = checkRole(['LEVEL3', 'LEVEL4']);
export const requireLevel4 = checkRole(['LEVEL4']);
