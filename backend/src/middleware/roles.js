import Signalement from '../models/Signalement.js';
import Workflow from '../models/Workflow.js';
import User from '../models/User.js';

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

// Village scope check - Level 2 can only access assigned villages
export const checkVillageScope = async (req, res, next) => {
  try {
    if (req.user.role === 'LEVEL3' || req.user.role === 'LEVEL4') {
      // Level 3 & 4 (governance/admin) can view all villages
      return next();
    }

    if (req.user.role === 'LEVEL1') {
      // Level 1 can only see their own village (handled in controllers)
      return next();
    }

    if (req.user.role === 'LEVEL2') {
      // Fetch full user data to get accessibleVillages
      const user = await User.findById(req.user.id).select('village accessibleVillages');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Build list of accessible villages
      const accessibleVillages = [
        ...(user.village ? [user.village.toString()] : []),
        ...(user.accessibleVillages || []).map(v => v.toString())
      ];

      // Attach to request for use in controllers
      req.accessibleVillages = accessibleVillages;
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error checking village scope', error: error.message });
  }
};

// Check if user is assigned to a specific signalement
export const checkAssignment = async (req, res, next) => {
  try {
    const signalementId = req.params.id || req.params.signalementId;
    
    if (!signalementId) {
      return res.status(400).json({ message: 'Signalement ID required' });
    }

    const signalement = await Signalement.findById(signalementId);
    
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    // Level 3 & 4 can view but edits are restricted (handled in controller)
    if (req.user.role === 'LEVEL3' || req.user.role === 'LEVEL4') {
      req.isAssigned = false;
      req.signalement = signalement;
      return next();
    }

    // Level 2 must be assigned to edit
    if (req.user.role === 'LEVEL2') {
      const isAssigned = signalement.assignedTo && 
                         signalement.assignedTo.toString() === req.user.id;
      
      if (!isAssigned && req.method !== 'GET') {
        return res.status(403).json({ 
          message: 'Access denied. You are not assigned to this signalement.',
          assignedTo: signalement.assignedTo
        });
      }

      req.isAssigned = isAssigned;
      req.signalement = signalement;
    }

    // Level 1 created it, can view
    if (req.user.role === 'LEVEL1') {
      req.isAssigned = false;
      req.signalement = signalement;
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error checking assignment', error: error.message });
  }
};

// Check workflow assignment - only assigned Level 2 can edit
export const checkWorkflowAssignment = async (req, res, next) => {
  try {
    const workflowId = req.params.workflowId;
    
    if (!workflowId) {
      return res.status(400).json({ message: 'Workflow ID required' });
    }

    const workflow = await Workflow.findById(workflowId).populate('signalement');
    
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Level 3 & 4 can only view, not edit workflows
    if ((req.user.role === 'LEVEL3' || req.user.role === 'LEVEL4') && req.method !== 'GET') {
      return res.status(403).json({ 
        message: 'Governance can view workflows but cannot edit them. Edits are limited to closure/archive decisions.'
      });
    }

    // Level 2 must be assigned to edit workflow
    if (req.user.role === 'LEVEL2') {
      const isAssigned = workflow.assignedTo && 
                         workflow.assignedTo.toString() === req.user.id;
      
      if (!isAssigned && req.method !== 'GET') {
        return res.status(403).json({ 
          message: 'Access denied. Only the assigned Level 2 user can edit this workflow.',
          assignedTo: workflow.assignedTo
        });
      }

      req.isAssigned = isAssigned;
    }

    req.workflow = workflow;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error checking workflow assignment', error: error.message });
  }
};

// Governance-only operations (closure/archive)
export const allowGovernanceOperation = (req, res, next) => {
  if (req.user.role === 'LEVEL3' || req.user.role === 'LEVEL4') {
    return next();
  }
  // Allow Village Directors (LEVEL2) governance operations
  if (req.user.roleDetails === 'VILLAGE_DIRECTOR') {
    return next();
  }
  
  return res.status(403).json({ 
    message: 'Access denied. Only governance (Level 3/4) or Village Directors can perform this operation.'
  });
};
