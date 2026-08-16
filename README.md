# AuthForge

An Auth-as-a-Service platform (Auth0/Okta-style) designed to provide authentication, authorization, and session management for multi-tenant applications.

## 🚀 Features

*   **JWT-Based Authentication**: Short-lived Access Tokens signed securely via dynamically generated **RS256** RSA key pairs.
*   **Refresh Token Rotation**: Automatic token rotation to prevent session hijacking.
*   **Advanced Reuse Detection**: Redis-backed security layer. If an attacker attempts to replay an intercepted, already-used refresh token, AuthForge instantly invalidates the *entire token family*, forcing the user to re-authenticate across all devices.
*   **Role-Based Access Control (RBAC)**: Fine-grained, many-to-many role and permission system with database-fresh JWT claim resolution.
*   **Production Ready**: Built with TypeScript, Express, Zod, Pino (structured logging), and Docker.

## 🛠 Tech Stack

*   **Runtime**: Node.js (v20+)
*   **Language**: TypeScript
*   **Framework**: Express.js
*   **Primary Database**: MySQL 8 (managed via Knex query builder)
*   **Cache / Session Store**: Redis 7
*   **Security**: bcrypt, jsonwebtoken, helmet, cors
*   **Validation**: Zod
*   **Logging**: Pino

## 🏗 Architecture & Design Decisions

### 1. RS256 Asymmetric Cryptography
Instead of a shared secret (HS256), AuthForge utilizes public/private key pairs. The private key signs the tokens, while client applications only need the public key to verify them. This prevents token forgery if a client app is compromised. The system automatically provisions a 2048-bit RSA key pair on startup if one is not provided in the environment.

### 2. Redis-Backed Token Tracking
Refresh tokens are intentionally kept out of the relational database. They are high-write, expiry-driven data. By storing token states in Redis with exact TTLs matching the token's expiration, the system avoids database bloat and ensures high-performance rotation checks.

### 3. Database-Fresh RBAC
While roles are assigned to users in the database, relying purely on embedded JWT claims for permissions creates a vulnerability window (until the token expires). AuthForge intercepts the Access Token and resolves the user's granular permissions directly from the database on protected routes, ensuring that revoked permissions take effect *immediately*.

## 🚦 Getting Started

### Prerequisites
*   Docker & Docker Compose
*   Node.js (v20+ recommended)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Rickydama3/AuthFroge.git
    cd AuthFroge
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start Infrastructure (MySQL & Redis):**
    ```bash
    docker compose up -d
    ```

4.  **Run Database Migrations:**
    ```bash
    npm run dev  # (or `npx tsx src/db/migrate.ts` manually)
    ```

5.  **Start the API:**
    ```bash
    npm run dev
    ```
    *The API will be available at `http://localhost:3000`*

## 📖 API Documentation

### Auth
*   `POST /auth/register` - Register a new user (`email`, `password`)
*   `POST /auth/login` - Authenticate and receive `access_token` and `refresh_token`
*   `POST /auth/refresh` - Rotate a `refresh_token` for a new pair
*   `POST /auth/logout` - Revoke an entire token family

### Admin (Requires `users:read` and `roles:write` permissions)
*   `GET /admin/users` - List all registered users
*   `POST /admin/users/:id/roles` - Assign a role to a user
