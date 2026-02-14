# Sauvegarde Feature - Level 2 Assignment System

## Overview
This feature implements a secure ownership system for Level 2 users to take charge of signalements with automatic status transitions and 24-hour deadline tracking.

## Key Features

### 1. **Sauvegarde Workflow**
When a Level 2 user "sauvegarde" (saves/takes ownership) a signalement:
- Status automatically changes to `EN_COURS`
- User is assigned as `assignedTo`
- Timestamp `sauvegardedAt` is recorded
- 24-hour deadline (`deadlineAt`) is set
- Other Level 2 users can no longer see this signalement

### 2. **Visibility Rules for Level 2**
Level 2 users can **only** see:
- ✅ Unassigned signalements with status `EN_ATTENTE` 
- ✅ Their own assigned signalements
- ❌ Signalements assigned to other Level 2 users (hidden)

### 3. **24-Hour Deadline**
- Deadline starts when signalement is sauvegardé
- Level 2 user has 24 hours to close the signalement
- Deadline tracking shows hours and minutes remaining
- Warning when less than 6 hours remain
- Alert when deadline expires

---

## Database Schema Changes

### Signalement Model

#### Status Flow
```javascript
status: {
  type: String,
  enum: [
    'EN_ATTENTE',           // Waiting - visible to all Level 2
    'EN_COURS',             // In progress - visible only to assigned user after sauvegarde
    'CLOTURE',              // Closed
    'FAUX_SIGNALEMENT'      // False report
  ],
  default: 'EN_ATTENTE'
}
```

#### New Fields
```javascript
// Sauvegarde tracking
sauvegardedAt: Date,  // When Level 2 took ownership
deadlineAt: Date      // 24 hours after sauvegardedAt
```

---

## API Endpoints

### 1. Sauvegarder Signalement
**Endpoint:** `PUT /api/signalement/:id/sauvegarder`  
**Auth:** Level 2 required  
**Purpose:** Level 2 user takes ownership of a signalement

**Request:**
```javascript
PUT /api/signalement/64abc123.../sauvegarder
Authorization: Bearer <level2_token>
```

**Response - Success:**
```json
{
  "message": "Signalement sauvegardé avec succès. Vous avez 24 heures pour le clôturer.",
  "signalement": {
    "_id": "64abc123...",
    "title": "Incident title",
    "status": "EN_COURS",
    "assignedTo": {
      "_id": "user123",
      "name": "Psychologue Name",
      "email": "psy@sos.tn"
    },
    "sauvegardedAt": "2026-02-14T10:00:00.000Z",
    "deadlineAt": "2026-02-15T10:00:00.000Z",
    "village": { ... }
  },
  "deadlineAt": "2026-02-15T10:00:00.000Z",
  "hoursRemaining": 24
}
```

**Response - Already Assigned:**
```json
{
  "message": "Ce signalement est déjà pris en charge par un autre utilisateur.",
  "assignedTo": "otherUserId"
}
```

**Response - Already Sauvegardé:**
```json
{
  "message": "Vous avez déjà sauvegardé ce signalement.",
  "sauvegardedAt": "2026-02-14T10:00:00.000Z",
  "deadlineAt": "2026-02-15T10:00:00.000Z"
}
```

---

### 2. Get Signalements (Updated Filtering)
**Endpoint:** `GET /api/signalement`  
**Auth:** All authenticated users  
**Changes:** Level 2 now sees only unassigned OR their own signalements

**Level 2 Filter Logic:**
```javascript
// Can only see signalements from assigned villages AND:
{
  $or: [
    { status: 'EN_ATTENTE', assignedTo: null },  // Unassigned
    { assignedTo: req.user.id }                   // Their own
  ]
}
```

**Example Response:**
```json
[
  {
    "_id": "sig1",
    "title": "Available signalement",
    "status": "EN_ATTENTE",
    "assignedTo": null,
    "village": { ... }
  },
  {
    "_id": "sig2",
    "title": "My signalement",
    "status": "EN_COURS",
    "assignedTo": "currentUserId",
    "sauvegardedAt": "2026-02-14T10:00:00.000Z",
    "deadlineAt": "2026-02-15T10:00:00.000Z",
    "village": { ... }
  }
  // sig3 assigned to another Level 2 user - NOT VISIBLE
]
```

---

### 3. Get My Signalements with Deadlines
**Endpoint:** `GET /api/signalement/my-deadlines`  
**Auth:** Level 2 required  
**Purpose:** View assigned signalements with deadline warnings

**Response:**
```json
{
  "count": 2,
  "signalements": [
    {
      "_id": "sig1",
      "title": "Urgent case",
      "status": "EN_COURS",
      "sauvegardedAt": "2026-02-14T04:00:00.000Z",
      "deadlineAt": "2026-02-15T04:00:00.000Z",
      "hoursRemaining": 4,
      "minutesRemaining": 30,
      "isDeadlineExpired": false,
      "isDeadlineApproaching": true,
      "deadlineWarning": "Attention: 4h 30min restantes",
      "village": { ... }
    },
    {
      "_id": "sig2",
      "title": "Expired case",
      "status": "EN_COURS",
      "sauvegardedAt": "2026-02-13T08:00:00.000Z",
      "deadlineAt": "2026-02-14T08:00:00.000Z",
      "hoursRemaining": 0,
      "minutesRemaining": 0,
      "isDeadlineExpired": true,
      "isDeadlineApproaching": false,
      "deadlineWarning": "Délai expiré!",
      "village": { ... }
    }
  ]
}
```

**Deadline Status Flags:**
- `isDeadlineExpired`: `true` when deadline passed
- `isDeadlineApproaching`: `true` when ≤6 hours remaining
- `hoursRemaining`: Hours until deadline (0 if expired)
- `minutesRemaining`: Additional minutes
- `deadlineWarning`: Human-readable warning message

---

## User Flow Example

### Scenario: Psychologist Takes Ownership

**Step 1: View Available Signalements**
```bash
GET /api/signalement
# Returns unassigned signalements + psychologist's own
```

**Step 2: Sauvegarder a Signalement**
```bash
PUT /api/signalement/64abc123.../sauvegarder
# Response:
{
  "message": "Signalement sauvegardé avec succès. Vous avez 24 heures pour le clôturer.",
  "deadlineAt": "2026-02-15T10:00:00.000Z",
  "hoursRemaining": 24
}
```

**Step 3: Work on Signalement**
- Signalement is now hidden from other Level 2 users
- Psychologist has exclusive access
- Status: `EN_COURS`

**Step 4: Monitor Deadline**
```bash
GET /api/signalement/my-deadlines
# Shows time remaining: "16h 45min restantes"
```

**Step 5: Close Before Deadline**
```bash
PUT /api/signalement/64abc123.../close
Body: { "closureReason": "Case resolved" }
```

---

## Security & Validation

### Protection Against Race Conditions
```javascript
// Can't steal signalement from another user
if (signalement.assignedTo && signalement.assignedTo !== req.user.id) {
  return 403 // Forbidden
}
```

### Idempotency Check
```javascript
// Can't sauvegarder twice
if (signalement.status === 'EN_COURS' && 
    signalement.assignedTo === req.user.id) {
  return 400 // Already sauvegardé
}
```

### Village Scope Enforcement
```javascript
// Level 2 can only see signalements from assigned villages
filter.village = { $in: req.accessibleVillages };
```

---

## Frontend Integration

### Dashboard Display
```javascript
// Display deadline warnings prominently
const SignalementCard = ({ signalement }) => {
  const { deadlineWarning, isDeadlineExpired, isDeadlineApproaching } = signalement;
  
  return (
    <div className={`card ${isDeadlineExpired ? 'border-danger' : ''}`}>
      <h3>{signalement.title}</h3>
      
      {deadlineWarning && (
        <div className={`alert ${
          isDeadlineExpired ? 'alert-danger' : 
          isDeadlineApproaching ? 'alert-warning' : 
          'alert-info'
        }`}>
          <i className="bi bi-clock"></i> {deadlineWarning}
        </div>
      )}
      
      {signalement.status === 'EN_ATTENTE' && (
        <button onClick={() => sauvegarderSignalement(signalement._id)}>
          Prendre en charge
        </button>
      )}
    </div>
  );
};
```

### API Call
```javascript
// Sauvegarder a signalement
const sauvegarderSignalement = async (id) => {
  try {
    const response = await fetch(`/api/signalement/${id}/sauvegarder`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`Signalement sauvegardé! Deadline: ${data.deadlineAt}`);
      // Refresh list - signalement will disappear for others
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## Testing Scenarios

### Test 1: Sauvegarder Availability
```bash
# User A (Level 2) sauvegarde signalement
curl -X PUT \
  -H "Authorization: Bearer <userA_token>" \
  http://localhost:5000/api/signalement/abc123/sauvegarder

# Expected: 200 OK, status changed to EN_COURS_TRAITEMENT
```

### Test 2: Visibility After Sauvegarde
```bash
# User B (Level 2) tries to see signalement
curl -H "Authorization: Bearer <userB_token>" \
  http://localhost:5000/api/signalement

# Expected: Signalement abc123 NOT in list (hidden)
```

### Test 3: Cannot Steal Signalement
```bash
# User B tries to sauvegarder already assigned signalement
curl -X PUT \
  -H "Authorization: Bearer <userB_token>" \
  http://localhost:5000/api/signalement/abc123/sauvegarder

# Expected: 403 Forbidden
```

### Test 4: Deadline Tracking
```bash
# User A checks deadlines
curl -H "Authorization: Bearer <userA_token>" \
  http://localhost:5000/api/signalement/my-deadlines

# Expected: List with hoursRemaining, deadlineWarning
```

---

## Business Rules Summary

| Rule | Description |
|------|-------------|
| **Ownership** | Only one Level 2 user can sauvegarder a signalement |
| **Deadline** | 24 hours from sauvegarde timestamp |
| **Visibility** | Other Level 2 users cannot see assigned signalements |
| **Status** | Auto-changes to `EN_COURS` |
| **Idempotency** | Cannot sauvegarder same signalement twice |
| **Village Scope** | Level 2 only sees signalements from assigned villages |
| **Warnings** | Alert when <6 hours remain or deadline expired |

---

## Audit Trail

All sauvegarde actions are logged:
```javascript
AuditLog {
  userId: "level2UserId",
  action: "SAUVEGARDER_SIGNALEMENT",
  entityType: "Signalement",
  entityId: "signalementId",
  timestamp: "2026-02-14T10:00:00.000Z",
  metadata: {
    deadlineAt: "2026-02-15T10:00:00.000Z"
  }
}
```

---

## Future Enhancements

1. **Email Notifications**
   - Alert when deadline approaching (6 hours)
   - Alert when deadline expired
   
2. **Automatic Escalation**
   - Auto-reassign if deadline expires and not closed
   - Escalate to Level 3 supervision

3. **Flexible Deadlines**
   - Allow Level 3 to extend deadlines
   - Different deadlines based on urgency level

4. **Analytics**
   - Track average closure time
   - Monitor deadline compliance rate
   - Performance metrics per Level 2 user

---

## Migration Notes

### Existing Signalements
Signalements created before this feature:
- Keep current `status` values
- `sauvegardedAt` and `deadlineAt` are `null`
- Level 2 users can still sauvegarder them

### Database Update
No migration script needed - new fields are optional:
```bash
# Just restart the server
npm run dev
```

When a Level 2 user sauvegarde a signalement, the status changes to `EN_COURS` with deadline tracking.
