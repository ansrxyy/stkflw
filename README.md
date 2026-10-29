# StockFlow — Inventory & Sales

Mini ERP module built with Go + PostgreSQL and React + TypeScript.

---

## 1. How to Run

### Docker Compose
```bash
docker compose up --build
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080/api

### Local Setup

1. **PostgreSQL**:
   ```bash
   docker run -d --name stkflw-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=stkflw -p 5432:5432 postgres:16-alpine
   ```

2. **Backend**:
   ```bash
   cd backend
   cp .env.example .env
   go run ./cmd/seed    # Migrates schema and seeds 16 products + sample orders
   go run ./cmd/server  # Starts API on :8080
   ```

3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev          # Starts UI on :5173
   ```

---

## 2. API cURL Examples

### Products

- **List Products**:
  ```bash
  curl "http://localhost:8080/api/products?search=mouse&filter=active&page=1&limit=10"
  ```
- **Create Product**:
  ```bash
  curl -X POST "http://localhost:8080/api/products" \
    -H "Content-Type: application/json" \
    -d '{"sku":"ELEC-LOGI-M3","name":"Logitech Mouse","price":1500000,"stock":20,"is_active":true}'
  ```
- **Update Product**:
  ```bash
  curl -X PUT "http://localhost:8080/api/products/1" \
    -H "Content-Type: application/json" \
    -d '{"name":"Updated Name","price":1600000,"is_active":true}'
  ```
- **Delete Product**:
  ```bash
  curl -X DELETE "http://localhost:8080/api/products/1"
  # Returns 409 PRODUCT_HAS_HISTORY if movement history exists
  ```

### Stock Adjustments

- **Adjust Stock**:
  ```bash
  curl -X POST "http://localhost:8080/api/products/1/stock" \
    -H "Content-Type: application/json" \
    -d '{"type":"out","qty":2,"note":"Fulfillment"}'
  # Returns 409 INSUFFICIENT_STOCK with available qty if overdrawn
  ```
- **Get Movements**:
  ```bash
  curl "http://localhost:8080/api/products/1/movements"
  ```

### Sales Orders

- **Create Order**:
  ```bash
  curl -X POST "http://localhost:8080/api/orders" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: ord-key-001" \
    -d '{
      "customer": "PT Maju Bersama",
      "items": [
        {"sku": "ELEC-LOGI-MXM3", "qty": 2},
        {"sku": "ELEC-KEYCH-K2V2", "qty": 1}
      ]
    }'
  ```
- **Get Order**:
  ```bash
  curl "http://localhost:8080/api/orders/1"
  ```
- **Cancel Order**:
  ```bash
  curl -X POST "http://localhost:8080/api/orders/1/cancel"
  # Restores stock and writes inward movements; 409 if already cancelled
  ```
- **List Orders**:
  ```bash
  curl "http://localhost:8080/api/orders?search=Maju&status=CREATED&page=1&limit=10"
  ```

### Summary & Reports

- **Summary Dashboard**:
  ```bash
  curl "http://localhost:8080/api/summary"
  ```
- **Daily Sales Report**:
  ```bash
  curl "http://localhost:8080/api/reports/daily-sales?date=2026-10-29"
  ```

---

## 3. Design Decisions

- **Concurrency & Deadlock Prevention**: Uses atomic transactions with `SELECT ... FOR UPDATE` row locks.
- **Atomic Order Placement**: Unit prices are derived strictly server-side. If any item has insufficient stock, the entire transaction rolls back and returns `409` with the failing SKU and available balance.
- **Idempotency**: Orders support the `Idempotency-Key` header to safely deduplicate retried network requests.
- **Integer Currency**: Prices and order totals use integers for Indonesian Rupiah (IDR), avoiding floating-point inaccuracies.
- **Derived `last_movement_at`**: Derived dynamically via correlated subquery from `stock_movements` to maintain a single source of truth.
- **Frontend Error Surfacing**: The API client extracts `409 INSUFFICIENT_STOCK` metadata (`available`, `sku`) so the UI displays actionable quantities directly on inputs/banners.

---

## 4. Future Improvements
- Implement warehouse bin/location tracking (Aisle, Shelf, Bin).
- Support partial order shipments and itemized returns.
- Add end-to-end integration test suite with `testcontainers-go`.

---

## 5. Honest Hours Spent

- Architecture, schema, & project setup: 5.0h
- Backend API, concurrency locking, & order transactions: 3h
- Frontend UI, components, & error handling: 3h
- Seeding, verification, & documentation: 1h
- **Total**: ~12 hours
