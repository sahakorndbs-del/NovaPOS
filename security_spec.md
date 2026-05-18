# Security Specification - NovaPOS

## Data Invariants
1. A transaction (Order) must have at least one product and a valid cashier/staff identification.
2. Product stock cannot be negative (enforced by logic, rules should check for valid numbers).
3. Config settings can only be modified by specific Admin IDs.

## The "Dirty Dozen" Payloads (Deny List)
1. Set `isAdmin` to true on a user profile by a non-admin.
2. Delete all products as a non-staff user.
3. Update an Order status to 'completed' without being a cashier.
4. Inject a 2MB string into a product description.
5. Create an order with a negative total.
6. Modify `createdAt` timestamp of an existing order.
7. Read the `config` collection without being authenticated.
8. Update `stock` of a product by a customer (unauthenticated).
9. Change the `ownerId` of another user's profile.
10. Use a 100% discount coupon that doesn't exist in the database.
11. Access PII (email/phone) of members by unauthenticated users.
12. Wipe the `roles` collection.

## Test Runner (Logic Check)
- Tests will verify `PERMISSION_DENIED` for all above scenarios.
- Tests will verify `OK` for staff creating orders and admins updating config.
