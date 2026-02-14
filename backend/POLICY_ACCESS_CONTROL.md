# Policy-Based Access Control (PBAC)

## Overview
This document describes the comprehensive policy-based access control system implemented for the Hack For Hope platform. The system enforces fine-grained permissions based on user roles, village assignments, and case ownership.

## Core Policies

### 1. Village/Program Scope (Level 2 Users)

**Policy**: Level 2 users can only access signalements from their assigned villages.

**Implementation**:
- Level 2 users have a primary `village` field and optional `accessibleVillages[]` array
- The `checkVillageScope` middleware validates village access for all queries
- GET requests are automatically filtered to show only accessible villages
- Attempts to access signalements from non-assigned villages return 403 Forbidden

**Example**:
```javascript
// User assigned to Village A can only see signalements from Village A
// Even if they try to query Village B's signalements, they'll be blocked
GET /api/signalement?village=VillageB  // Returns 403 if not assigned to Village B
```

**Database Schema**:
```javascript
User {
  village: ObjectId,              // Primary village
  accessibleVillages: [ObjectId]  // Additional accessible villages (for multi-village Level 2 users)
}
```

---

### 2. Case Assignment (Level 2 Workflow Access)

**Policy**: Only the assigned Level 2 user can edit workflows. Others have read-only access.

**Implementation**:
- Each signalement has an `assignedTo` field referencing the Level 2 user
- Each workflow has an `assignedTo` field matching the signalement assignment
- The `checkWorkflowAssignment` middleware validates assignment before allowing edits
- Non-assigned users receive a 403 error with assignment details
- Workflow responses include `readOnly`, `canEdit`, and `allowedActions` flags

**Protected Operations**:
- ✅ Assigned Level 2: Full edit access to workflow stages, DPE generation, classification
- ❌ Non-assigned Level 2: Read-only access
- ❌ Level 3 (Governance): Read-only access to workflows

**Example**:
```javascript
// Workflow assigned to User A
Workflow {
  assignedTo: UserA_ID,
  signalement: SignalementX
}

// User A can edit:
PUT /api/workflow/workflowId/stage      // ✅ Allowed
POST /api/workflow/workflowId/notes     // ✅ Allowed

// User B (different Level 2) attempts edit:
PUT /api/workflow/workflowId/stage      // ❌ 403 Forbidden
```

---

### 3. Governance Restrictions (Level 3)

**Policy**: Level 3 (Governance) users can view all data but can only perform closure/archive operations, not general edits.

**Implementation**:
- Level 3 can view all signalements and workflows across all villages
- General update endpoints (`PUT /api/signalement/:id`) reject Level 3 requests
- Only closure and archive endpoints accept Level 3 requests
- Workflow edit operations (`PUT /api/workflow/:id/stage`) blocked for Level 3
- Response data includes permission flags indicating read-only status

**Allowed Operations for Level 3**:
- ✅ **View**: All signalements, workflows, analytics
- ✅ **Close**: `PUT /api/signalement/:id/close`
- ✅ **Archive**: `PUT /api/signalement/:id/archive`
- ✅ **Delete**: `DELETE /api/signalement/:id`
- ❌ **General Edit**: `PUT /api/signalement/:id` (blocked)
- ❌ **Workflow Edit**: Any workflow modification endpoints (blocked)

**Rational**:
Governance has oversight responsibility but should not interfere with operational case management. They make high-level decisions (close/archive) but don't manage day-to-day case progress.

---

## Middleware Architecture

### 1. `checkVillageScope`
**Purpose**: Enforce village-level access control for Level 2 users

**Location**: [backend/src/middleware/roles.js](backend/src/middleware/roles.js)

**Flow**:
1. Skip check for Level 3 (can access all villages)
2. For Level 2: Fetch user's village and accessibleVillages
3. Build array of accessible village IDs
4. Attach to `req.accessibleVillages` for controller use
5. Controllers filter queries using this array

**Usage**:
```javascript
router.get('/', checkVillageScope, getSignalements);
```

---

### 2. `checkAssignment`
**Purpose**: Verify user is assigned to a signalement before allowing edits

**Location**: [backend/src/middleware/roles.js](backend/src/middleware/roles.js)

**Flow**:
1. Extract signalement ID from request params
2. Fetch signalement from database
3. Check if `signalement.assignedTo` matches `req.user.id`
4. Attach `req.isAssigned` boolean and `req.signalement` object
5. Block non-GET requests if not assigned (Level 2)
6. Allow Level 3 to view but flag as non-assigned

**Usage**:
```javascript
router.put('/:id', requireLevel2, checkAssignment, updateSignalement);
```

---

### 3. `checkWorkflowAssignment`
**Purpose**: Ensure only assigned Level 2 can edit workflows

**Location**: [backend/src/middleware/roles.js](backend/src/middleware/roles.js)

**Flow**:
1. Extract workflow ID from request params
2. Fetch workflow with populated signalement
3. Block all Level 3 edit attempts (non-GET methods)
4. For Level 2: Verify `workflow.assignedTo` matches `req.user.id`
5. Block non-assigned Level 2 users from editing
6. Attach `req.workflow` for controller use

**Usage**:
```javascript
router.put('/:workflowId/stage', checkWorkflowAssignment, updateWorkflowStage);
```

---

### 4. `allowGovernanceOperation`
**Purpose**: Restrict certain operations to Level 3 only

**Location**: [backend/src/middleware/roles.js](backend/src/middleware/roles.js)

**Flow**:
1. Check if `req.user.role === 'LEVEL3'`
2. Allow if Level 3, otherwise return 403

**Usage**:
```javascript
router.put('/:id/close', allowGovernanceOperation, closeSignalement);
router.put('/:id/archive', allowGovernanceOperation, archiveSignalement);
```

---

## API Response Enhancements

### Workflow Responses
Workflows now include permission metadata:

```json
{
  "_id": "workflow123",
  "signalement": {...},
  "assignedTo": "user456",
  "stages": {...},
  
  // Permission flags
  "readOnly": true,           // Cannot edit
  "canEdit": false,           // Explicit edit permission
  "allowedActions": [         // What the current user can do
    "view",
    "closure-decision"
  ]
}
```

This allows frontends to dynamically show/hide edit buttons and provide better UX.

---

## Role Capability Matrix

| Action | Level 1 | Level 2 (Assigned) | Level 2 (Not Assigned) | Level 3 |
|--------|---------|-------------------|----------------------|---------|
| Create Signalement | ✅ Own village | ✅ Own villages | ✅ Own villages | ✅ All villages |
| View Signalements | ✅ Own village | ✅ Assigned villages | ✅ Assigned villages | ✅ All villages |
| Edit Signalement | ❌ | ✅ If assigned | ❌ | ❌ (blocked) |
| Assign Signalement | ❌ | ✅ | ✅ | ❌ |
| Close Signalement | ❌ | ❌ | ❌ | ✅ **Only** |
| Archive Signalement | ❌ | ❌ | ❌ | ✅ **Only** |
| Delete Signalement | ❌ | ❌ | ❌ | ✅ |
| Create Workflow | ❌ | ✅ | ✅ | ❌ |
| View Workflow | ❌ | ✅ All | ✅ All | ✅ All (read-only) |
| Edit Workflow | ❌ | ✅ If assigned | ❌ | ❌ (blocked) |
| Update Workflow Stage | ❌ | ✅ If assigned | ❌ | ❌ |
| Generate DPE Report | ❌ | ✅ If assigned | ❌ | ❌ |
| Classify Signalement | ❌ | ✅ If assigned | ❌ | ❌ |
| Add Workflow Note | ❌ | ✅ If assigned | ❌ | ❌ |

---

## Security Considerations

### Defense in Depth
1. **Route-level**: Middleware checks before reaching controllers
2. **Controller-level**: Additional validation in business logic
3. **Database-level**: MongoDB queries filtered by accessible villages

### Audit Trail
All operations are logged via `logAudit` middleware:
```javascript
AuditLog {
  userId: ObjectId,
  action: 'UPDATE_WORKFLOW',
  entityType: 'Workflow',
  entityId: ObjectId,
  timestamp: Date,
  ipAddress: String
}
```

### Error Messages
Error responses provide clear feedback without leaking sensitive information:
```json
{
  "message": "Access denied. Only the assigned Level 2 user can edit this workflow.",
  "assignedTo": "user456"  // Useful for debugging
}
```

---

## Testing Recommendations

### Test Cases

**1. Village Scope**
```bash
# Test Level 2 accessing own village
curl -H "Authorization: Bearer <level2_token>" \
  http://localhost:5000/api/signalement?village=<own_village_id>
# Expected: 200 OK with signalements

# Test Level 2 accessing other village
curl -H "Authorization: Bearer <level2_token>" \
  http://localhost:5000/api/signalement?village=<other_village_id>
# Expected: 403 Forbidden
```

**2. Assignment Check**
```bash
# Test assigned Level 2 editing workflow
curl -X PUT -H "Authorization: Bearer <assigned_level2_token>" \
  -d '{"stage":"dpeReport","content":"Report content"}' \
  http://localhost:5000/api/workflow/<workflow_id>/stage
# Expected: 200 OK

# Test non-assigned Level 2 editing same workflow
curl -X PUT -H "Authorization: Bearer <other_level2_token>" \
  -d '{"stage":"dpeReport","content":"Report content"}' \
  http://localhost:5000/api/workflow/<workflow_id>/stage
# Expected: 403 Forbidden
```

**3. Governance Restrictions**
```bash
# Test Level 3 general update (should fail)
curl -X PUT -H "Authorization: Bearer <level3_token>" \
  -d '{"status":"EN_COURS"}' \
  http://localhost:5000/api/signalement/<id>
# Expected: 403 Forbidden

# Test Level 3 closure (should succeed)
curl -X PUT -H "Authorization: Bearer <level3_token>" \
  -d '{"closureReason":"Case resolved"}' \
  http://localhost:5000/api/signalement/<id>/close
# Expected: 200 OK
```

---

## Migration Guide

### Updating Existing User Data

To support village scope, ensure all Level 2 users have proper village assignments:

```javascript
// Add accessible villages to a Level 2 user
db.users.updateOne(
  { email: 'psy@sos.tn' },
  { 
    $set: { 
      village: ObjectId('village_a_id'),
      accessibleVillages: [
        ObjectId('village_a_id'),
        ObjectId('village_b_id')
      ]
    }
  }
);
```

### Frontend Integration

Update frontend code to respect permission flags:

```javascript
// In React component
const WorkflowDetail = ({ workflow }) => {
  const canEdit = workflow.canEdit && !workflow.readOnly;
  
  return (
    <div>
      {canEdit ? (
        <button onClick={handleEdit}>Edit Workflow</button>
      ) : (
        <p className="text-muted">Read-only access</p>
      )}
    </div>
  );
};
```

---

## Future Enhancements

1. **Dynamic Permission Policies**: Store policies in database for runtime changes
2. **Temporary Access Grants**: Allow Level 3 to grant temporary edit access to Level 2
3. **Cross-Village Collaboration**: Support temporary multi-village workflows
4. **Permission Audit Reports**: Track who accessed what, when
5. **Field-Level Permissions**: Restrict specific fields based on role

---

## Support

For questions about policy implementation:
- Review middleware code: [backend/src/middleware/roles.js](backend/src/middleware/roles.js)
- Check controller enforcements: [backend/src/controllers/](backend/src/controllers/)
- See route configurations: [backend/src/routes/](backend/src/routes/)
