# Payment Processing System

A production-grade backend system for processing payments, built with **NestJS**, **Sequelize (PostgreSQL)**, and **BullMQ (Redis)**. This project simulates real-world payment gateway behavior and demonstrates strong backend fundamentals such as idempotency, concurrency control, and failure handling.

---

## 🚀 Features

- **Payment Lifecycle**: Supports states like `PENDING`, `PROCESSING`, `SUCCESS`, and `FAILED`.
- **Failure Handling & Retry Logic**: Uses BullMQ for reliable background processing with **Exponential Backoff** (2s, 4s, 8s) up to 3 attempts.
- **Idempotency**: Prevents duplicate payments using `x-idempotency-key` headers and deduplicates webhooks using unique event IDs.
- **Concurrency Control**: Prevents parallel processing of the same payment using database row-level locking (`SELECT ... FOR UPDATE`).
- **External Gateway Simulation**: Simulates random success (50%), failure (30%), and timeouts (20%) with async webhook delivery.
- **Razorpay Integration (Mocked)**: Simulates the flow of creating Razorpay orders and handling webhooks without requiring real bank details or accounts.

---

## 🛠️ Tech Stack

- **Framework**: NestJS (v11)
- **Database**: PostgreSQL (via Sequelize ORM)
- **Queue System**: BullMQ + Redis (for reliable background jobs and retries)
- **Documentation**: Swagger UI
- **Containerization**: Docker (for Redis and Postgres)

---

## ⚙️ Setup & Installation

### Prerequisites

- Node.js (v18 or higher)
- Docker Desktop (for running Postgres and Redis)

### Step 1: Configure Environment Variables

Copy the example environment file and update values if necessary:

```bash
cp .env.example .env
```

_(The default values are configured to work with the provided Docker setup)._

### Step 2: Start Infrastructure (Postgres & Redis)

Make sure Docker is running, then execute:

```bash
docker-compose up -d
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Start the Application

```bash
npm run start:dev
```

The application will start on `http://localhost:3000`.

---

## 📖 API Documentation

Once the application is running, you can access the full interactive API documentation (Swagger) at:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

### Key Endpoints

#### 💳 Payments

- **`POST /payments`**: Initiate a payment.
  - Requires `x-idempotency-key` header.
- **`GET /payments/:id`**: Get payment status by ID.
- **`GET /payments`**: List all payments (filterable by status).

#### 🪝 Webhooks

- **`POST /webhooks/gateway`**: Handles simulated webhook callbacks.
- **`POST /webhooks/razorpay`**: Handles simulated Razorpay webhooks.

---

## 🧪 How to Test

### 1. Testing Idempotency

1. Call `POST /payments` with a specific `x-idempotency-key` (e.g., `key-101`).
2. Call it again with the **same** key.
3. You will notice the second call returns the same payment object and does not create a duplicate in the database.

### 2. Testing Retry Logic

1. Call `POST /payments` to create a payment.
2. Watch your terminal. If the simulation randomly picks a "Failure" or "Timeout", you will see BullMQ automatically retrying the job after 2s, then 4s, then 8s.

### 3. Testing Razorpay Flow (Mocked)

1. Call `POST /payments`. In the response, you will receive a mock Razorpay Order ID in the `gatewayReferenceId` field.
2. To simulate a successful payment from Razorpay, call `POST /webhooks/razorpay` with any string in the `x-razorpay-signature` header and the following body (replace with your order ID):

```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "order_id": "order_YOUR_ID_HERE"
      }
    }
  }
}
```

3. Check the status via `GET /payments/:id`, it will be updated to `SUCCESS`.

---

## 🐙 Git Commits

To commit your changes to your repository, run the following commands:

```bash
git add .
git commit -m "feat: complete payment processing system with idempotency, retries, and razorpay mock"
```
