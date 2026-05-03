# Order Management API

A backend REST API for managing production orders with role-based access control and structured status workflow.

This project is an order management system designed for a production workflow (e.g. printing/processing pipeline). It allows users to track orders through predefined statuses and control which roles are allowed to advance specific steps in the process.

Each order moves through a strict workflow, and only authorized roles can update its status.

## Features:
- Create and manage orders
- Status workflow system (step-by-step process)
- Role-based access control (RBAC)
- Different roles per production stage
- Protected status transitions
- Fetch orders by status
- Single order retrieval
- Business logic separated into services
- Structured backend architecture (controllers/services)

## Each order follows a predefined workflow:

- printing
- cutting
- gluing
- done

## Only specific roles can move an order forward:

printer → printing

cutter → cutting

gluer → gluing

admin → full access

## Orders move through a linear workflow:

printing → cutting → gluing → done

If a user does not have permission to perform a transition, the API returns a 403 Forbidden error.

## Tech Stack:
- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL (NeonDB)
- bcrypt (authentication utilities)
- express-validator (input validation)
- Supertest (API testing)
- JWT (authentication & authorization)
