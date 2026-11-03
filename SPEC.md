# SPEC.md — Plant Material Delivery & Storage Guidance App

## 1. Product goal
Create a role-based industrial mobile app that coordinates **Drivers, Storekeepers, and Security Guards** so material entering a plant is verified, routed to the correct storage location, received digitally, and closed with minimal manual intervention.

Core principle:

> **Verify → Gate → Navigate → Deliver → Scan → Store → Confirm**

The app should automate status changes using GPS/geofencing, QR/barcode/RFID scans, predefined plant routes, WMS/ERP data, notifications, and audit logs.

## 2. Primary users

### Driver
- See assigned delivery.
- Get plant entry instructions.
- Receive automatic gate/dock/zone assignment.
- Navigate to the correct unloading/storage point.
- Scan delivery/material/location codes.
- See exceptions and instructions.
- Complete digital proof of delivery.

### Storekeeper
- See expected inbound deliveries.
- Verify material against PO/delivery manifest.
- Scan material/pallet.
- See recommended storage location.
- Confirm put-away by location scan.
- Raise mismatch/damage/shortage exceptions.
- See pending receipts.

### Security Guard
- See expected vehicles.
- Receive arrival notification from geofence.
- Verify vehicle/driver/delivery QR.
- Approve or hold entry.
- See assigned route/dock.
- Record security exceptions.
- Maintain digital gate audit trail.

## 3. Home-page concept

### Header
- Plant/site name.
- Current gate/zone.
- User name + role.
- Connection status.
- Notification bell.

### Main status card
Show the current operational state:
- `Truck approaching`
- `At Gate`
- `Verified`
- `Proceed to Dock`
- `At Unloading Point`
- `Put-away in progress`
- `Delivered`

Show a visual progress tracker.

### Live plant map
Display:
- Plant boundary/geofence.
- Gates.
- Docks.
- Stores/warehouses.
- Storage zones.
- Driver/vehicle position.
- Destination marker.
- Recommended route.
- Restricted areas.

### Quick actions
Large, glove-friendly buttons:
- `SCAN`
- `NAVIGATE`
- `MY DELIVERY`
- `EXCEPTIONS`

Role-specific actions should be shown according to permissions.

### Delivery card
Example:
- Delivery: `DEL-2026-00482`
- Vehicle: `TN XX XXXX`
- Material: `Sheet Metal Coil`
- Quantity: `12 pallets`
- Destination: `RM Store — Rack A-14`
- ETA: `08 min`
- Status: `Gate Verified`

### Automation indicators
Show:
- `GPS: Active`
- `Geofence: Inside Plant`
- `Gate: Verified`
- `Storage Location: Confirmed`
- `WMS Sync: Live`

## 4. Automation requirements

1. Delivery order is created in ERP/WMS.
2. Driver receives assignment.
3. Plant geofence detects arrival.
4. Security receives expected-arrival notification.
5. QR/RFID/vehicle identity is verified.
6. Valid vehicle receives digital entry clearance.
7. System assigns or confirms gate/dock.
8. Driver is guided to destination.
9. Arrival at destination triggers storekeeper notification.
10. Material is scanned.
11. System validates material against delivery.
12. Correct storage location is displayed.
13. Driver/storekeeper scans location marker.
14. WMS receives put-away confirmation.
15. Delivery status becomes complete.
16. Audit trail stores user, time, location and scan events.

Manual intervention should be required only for exceptions.

## 5. Exception handling

Examples:
- Wrong vehicle.
- Unscheduled delivery.
- Invalid QR.
- Wrong material.
- Quantity mismatch.
- Damaged material.
- Wrong storage location.
- Restricted route.
- GPS unavailable.
- Network unavailable.

Each exception must provide:
- Clear reason.
- Immediate next action.
- Escalation contact.
- Audit record.

## 6. Offline behavior
- Cache active delivery and route.
- Allow scans while temporarily offline.
- Queue transactions locally.
- Sync automatically after connection returns.
- Show `Offline / Sync Pending` status.

## 7. Security
- Role-based access control.
- SSO/mobile authentication.
- Least-privilege permissions.
- TLS in transit and encryption at rest.
- Audit logs.
- Optional PIN/biometric unlock.
- Location tracking only as required by the operational workflow.

## 8. UX requirements
- High contrast.
- Large touch targets suitable for gloves.
- Minimal typing.
- Scan-first interaction.
- Clear green/red validation feedback.
- Large status labels.
- Simple icons.
- English-first with localization support.
- Accessibility labels and scalable text.

## 9. Suggested integrations
- WMS/ERP.
- GPS/geofencing.
- Indoor RTLS/UWB/BLE where required.
- QR/barcode scanner.
- RFID.
- Access-control/gate controller.
- Push notification service.
- Maps/navigation SDK.
- Identity/SSO.
- Analytics/audit platform.

## 10. Suggested technical baseline
- Mobile: Flutter or React Native.
- Backend: Node.js/TypeScript, Java/Spring Boot, or Python.
- API: REST/GraphQL.
- Real-time: WebSocket/MQTT.
- Database: PostgreSQL.
- Cache: Redis.
- Cloud: AWS/Azure.
- Authentication: OAuth2/OIDC.
- Deployment: Docker + CI/CD.

## 11. Success criteria
The product should measurably reduce:
- Gate waiting time.
- Manual phone calls/instructions.
- Wrong-location deliveries.
- Material receiving errors.
- Unauthorized plant movement.
- Paper-based records.

And improve:
- Delivery visibility.
- First-time-right put-away.
- Traceability.
- Security compliance.
- Store inventory accuracy.
