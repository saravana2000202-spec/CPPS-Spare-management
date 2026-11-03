# TASK.md — Implementation Backlog

## Epic 1: Authentication & roles

### TASK-001 — Login
- Build secure mobile login.
- Support SSO/OIDC where available.
- Show plant/site after authentication.

**Acceptance:** valid users can authenticate and receive role-based permissions.

### TASK-002 — RBAC
Roles:
- Driver
- Storekeeper
- Security Guard
- Admin

**Acceptance:** each role sees only permitted functions.

---

## Epic 2: Home page

### TASK-003 — Role-aware homepage
Build a single home architecture that changes content based on role.

**Acceptance:**
- Driver sees active delivery and navigation.
- Storekeeper sees inbound/receiving tasks.
- Security sees expected arrivals and gate actions.

### TASK-004 — Live status tracker
States:
`Assigned → Approaching → At Gate → Verified → En Route → At Storage → Verified → Complete`

**Acceptance:** state changes are visible in real time.

### TASK-005 — Quick actions
Implement large:
- Scan
- Navigate
- Delivery
- Exceptions

**Acceptance:** primary action can be reached with one tap.

---

## Epic 3: Driver

### TASK-006 — Delivery assignment
Show delivery ID, vehicle, material, quantity, ETA and destination.

### TASK-007 — Plant navigation
Show live vehicle position and route to gate/dock/storage location.

### TASK-008 — Destination guidance
Display exact:
`Store → Zone → Rack → Bin`

### TASK-009 — Driver scan
Allow QR/barcode scanning for delivery/material/location.

---

## Epic 4: Security

### TASK-010 — Expected vehicle list
Show scheduled arrivals with time, driver and delivery ID.

### TASK-011 — Automatic arrival alert
Trigger notification when the vehicle enters plant geofence.

### TASK-012 — Gate verification
Verify:
- Delivery ID.
- Driver.
- Vehicle.
- QR/ID.

### TASK-013 — Entry decision
Actions:
- `ALLOW ENTRY`
- `HOLD`
- `ESCALATE`

Every decision creates an audit event.

---

## Epic 5: Storekeeper

### TASK-014 — Inbound queue
Show expected and arriving materials.

### TASK-015 — Material verification
Scan material/pallet and compare against manifest.

### TASK-016 — Storage recommendation
Display system-recommended storage location.

### TASK-017 — Put-away confirmation
Require location scan before closing put-away.

---

## Epic 6: Automation

### TASK-018 — Geofence engine
Create plant, gate and zone geofences.

### TASK-019 — Event automation
Automatically update workflow states from location and scan events.

### TASK-020 — Notification engine
Notify:
- Security when vehicle approaches.
- Storekeeper when vehicle reaches destination.
- Driver when route/destination changes.
- Supervisor on exceptions.

### TASK-021 — WMS sync
Push scan, receipt and put-away confirmation to WMS/ERP.

---

## Epic 7: Exceptions

### TASK-022 — Exception screen
Create standardized exception codes:
- Wrong delivery.
- Wrong material.
- Quantity mismatch.
- Damage.
- Wrong location.
- Unauthorized access.
- Network/GPS issue.

### TASK-023 — Escalation
Route unresolved exceptions to supervisor/admin.

---

## Epic 8: Offline

### TASK-024 — Offline cache
Cache current delivery, destination and essential master data.

### TASK-025 — Offline scan queue
Store scan transactions locally and sync automatically.

### TASK-026 — Sync status
Show:
- Online.
- Offline.
- Sync pending.
- Sync failed.

---

## Epic 9: Audit & security

### TASK-027 — Audit event model
Capture:
- User.
- Role.
- Event.
- Timestamp.
- Device.
- Location.
- Delivery ID.

### TASK-028 — Data protection
Implement encryption, secure tokens, session timeout and least-privilege access.

---

## Epic 10: Testing

### TASK-029 — Workflow testing
Test complete flow from delivery assignment to put-away.

### TASK-030 — Exception testing
Test wrong QR, wrong material, wrong location and unauthorized vehicle.

### TASK-031 — Offline testing
Test loss of network during gate entry, scanning and put-away.

### TASK-032 — Device testing
Test normal Android phone and rugged scanner/tablet.

### TASK-033 — UAT
Run pilot with actual Driver, Storekeeper and Security users.

---

## Definition of Done
A feature is complete when:
- UI is implemented.
- API/backend behavior is implemented.
- Role permissions are verified.
- Audit logging is implemented where applicable.
- Offline behavior is handled where applicable.
- Error/exception states exist.
- Unit/integration tests pass.
- UAT acceptance criteria pass.
