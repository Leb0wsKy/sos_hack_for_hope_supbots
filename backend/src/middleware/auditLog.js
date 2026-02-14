import AuditLog from '../models/AuditLog.js';

const REDACT_KEYS = new Set([
  'password',
  'newPassword',
  'description',
  'childName',
  'abuserName',
  'attachments'
]);

const redactSensitive = (value) => {
  if (Array.isArray(value)) {
    return value.map(item => redactSensitive(item));
  }

  if (value && typeof value === 'object') {
    const redacted = {};
    Object.entries(value).forEach(([key, val]) => {
      if (REDACT_KEYS.has(key)) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitive(val);
      }
    });
    return redacted;
  }

  return value;
};

export const logAudit = (action, targetModel = null) => {
  return async (req, res, next) => {
    try {
      const originalJson = res.json.bind(res);
      
      res.json = function(data) {
        // Log the action
        if (req.user) {
          AuditLog.create({
            user: req.user.id,
            action: action,
            targetModel: targetModel,
            targetId: req.params.id || data?._id || data?.id,
            details: {
              method: req.method,
              path: req.path,
              body: redactSensitive(req.body),
              query: redactSensitive(req.query)
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent')
          }).catch(err => console.error('Audit log error:', err));
        }
        
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error('Audit middleware error:', error);
      next();
    }
  };
};
