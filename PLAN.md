# PLAN.md — Plant Material Delivery App

## Objective
Build a production-ready role-based application that moves an inbound vehicle from plant arrival to the exact storage location with automated verification and minimal manual coordination.

## Phase 1 — Product definition
- Define plant workflow and terminology.
- Identify gates, docks, stores and storage zones.
- Define Driver, Storekeeper and Security permissions.
- Map current manual process.
- Identify ERP/WMS source of truth.
- Define KPIs.

**Deliverable:** approved product requirements and process map.

## Phase 2 — UX/UI design
Design the following screens:
1. Login / authentication.
2. Role-aware Home.
3. Driver delivery detail.
4. Live plant navigation.
5. QR/barcode scanner.
6. Material verification.
7. Storage-location guidance.
8. Storekeeper receiving.
9. Security gate verification.
10. Exception handling.
11. Delivery completion/POD.
12. Notification center.
13. Audit/history.

### Homepage design direction
- Industrial but modern.
- White/light neutral base.
- Dark text.
- One strong primary action.
- Green for verified/complete.
- Amber for attention.
- Red for blocked/error.
- Blue/neutral for navigation/information.
- Map and workflow status are visually dominant.
- Avoid dense dashboards.

## Phase 3 — Backend architecture
Create services for:
- Authentication/RBAC.
- Delivery management.
- Vehicle/driver management.
- Geofence events.
- Routing.
- Scan validation.
- Storage-location master.
- Receiving/put-away.
- Notifications.
- Exceptions.
- Audit events.
- Integration gateway.

## Phase 4 — Data model

Core entities:
- User
- Role
- Driver
- Vehicle
- Plant
- Gate
- Dock
- Zone
- StorageLocation
- DeliveryOrder
- DeliveryItem
- Material
- ScanEvent
- GeofenceEvent
- PutAwayTask
- Exception
- ProofOfDelivery
- Notification
- AuditEvent

## Phase 5 — Automation engine

Event chain:

`Delivery Created`
→ `Driver Assigned`
→ `Approaching Plant`
→ `Gate Arrival`
→ `Security Verification`
→ `Entry Approved`
→ `Dock Assigned`
→ `Storage Destination Assigned`
→ `Driver Navigating`
→ `Destination Arrival`
→ `Material Scan`
→ `Location Scan`
→ `Put-away Confirmed`
→ `Delivery Closed`

Use event-driven processing so each successful event can automatically trigger the next workflow.

## Phase 6 — MVP implementation

### Sprint 1
- Authentication.
- Roles/RBAC.
- Plant/site master.
- Delivery data model.
- Basic Home screen.

### Sprint 2
- Driver workflow.
- Delivery details.
- Plant map.
- Navigation.
- Geofence arrival.

### Sprint 3
- QR/barcode scanning.
- Material validation.
- Storekeeper receiving.
- Storage-location confirmation.

### Sprint 4
- Security gate workflow.
- Notifications.
- Exceptions.
- Audit trail.
- Offline queue/sync.

### Sprint 5
- WMS/ERP integration.
- Performance.
- Device testing.
- Security testing.
- User acceptance testing.

## Phase 7 — Pilot
Pilot in one plant with:
- One gate.
- One store.
- Limited delivery types.
- Representative drivers/storekeepers/security staff.

Measure baseline vs pilot:
- Gate processing time.
- Delivery cycle time.
- Wrong-location incidents.
- Manual calls.
- Scan errors.
- Put-away completion time.

## Phase 8 — Scale
After pilot:
- Add additional gates/stores.
- Add RFID/RTLS.
- Add automatic gate integration.
- Add advanced analytics.
- Add multi-plant support.
- Add route optimization.
