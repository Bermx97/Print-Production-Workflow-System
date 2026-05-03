# Order Management API

A backend REST API for managing production orders with role-based access control and a structured workflow system.

The system is designed for production environments (e.g. printing pipelines), where orders move through predefined stages and only specific roles can advance them.

---

## Features

- Create and manage orders
- Structured status workflow system
- Role-based access control (RBAC)
- Protected status transitions
- Fetch orders by status
- Single order retrieval
- Clean separation of business logic (controllers/services)

---

## Workflow

Each order follows a linear production flow:

printing → cutting → gluing → done

---

## Role Permissions

Only specific roles are allowed to advance order status:

- printer → printing
- cutter → cutting
- gluer → gluing
- admin → full access

If a user tries to perform an invalid transition, the API returns:

- 403 Forbidden

---

## Tech Stack

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL (NeonDB)
- JWT (authentication & authorization)
- bcrypt (password hashing)
- express-validator (input validation)
- Supertest (API testing)
