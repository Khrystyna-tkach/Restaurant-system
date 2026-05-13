# Restaurant System

Restaurant System is a web application for restaurant management. It supports users with roles, menu categories, dishes, tables, orders, ingredients, and basic dashboard workflows.

The project is fully containerized. To run it after cloning the repository, a user only needs Docker Desktop. There is no need to install MySQL, Node.js, Prisma, or project dependencies locally.

## Technologies

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL
- ORM: Prisma
- Containers: Docker + Docker Compose

## Project Structure

```text
restaurant/
  backend/
    prisma/
      migrations/
      schema.prisma
    docker-entrypoint.sh
    dockerfile
    package.json
    server.js

  frontend/
    public/
    src/
    dockerfile
    package.json
    vite.config.js

  docker/
    mysql/
      init/
        01-restaurant-db.sql
        02-prisma-baseline.sql

  docker-compose.yml
  README.md
```

## Ports

| Service | URL / Port |
| --- | --- |
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:5000/api` |
| MySQL inside Docker | `db:3306` |
| MySQL from host machine | `localhost:3307` |

MySQL is exposed on host port `3307` because port `3306` is often already used by a local MySQL installation.

## How To Run

Clone the repository:

```bash
git clone <repository-url>
cd restaurant
```

Build and start all containers:

```bash
docker compose up -d --build
```

Check container status:

```bash
docker compose ps
```

Open the application:

```text
http://localhost:5173/login
```

## Useful Commands

Show backend logs:

```bash
docker compose logs -f backend
```

Show frontend logs:

```bash
docker compose logs -f frontend
```

Show database logs:

```bash
docker compose logs -f db
```

Stop containers without deleting database data:

```bash
docker compose down
```

Stop containers and delete the database volume:

```bash
docker compose down -v
```

Use `docker compose down -v` only when you want to reset the database completely.

## Database

The database runs in a MySQL Docker container.

Database name:

```text
restaurant_db
```

Backend connection string inside Docker:

```text
mysql://root:root@db:3306/restaurant_db
```

Initial database data is stored in:

```text
docker/mysql/init/01-restaurant-db.sql
```

When the MySQL container is created for the first time, Docker automatically imports this SQL dump. That is why the project starts with prepared categories, dishes, tables, users, ingredients, and orders.

Database data is stored in the Docker volume:

```text
mysql_data
```

Data is preserved between restarts while this volume exists.

## Migrations

Prisma migrations are stored in:

```text
backend/prisma/migrations
```

The project uses MySQL migrations. When the backend container starts, it runs:

```bash
npx prisma migrate deploy
```

Run migrations manually:

```bash
docker compose exec backend npx prisma migrate deploy
```

Regenerate Prisma Client manually:

```bash
docker compose exec backend npx prisma generate
```

Reset the Docker database and import the initial data again:

```bash
docker compose down -v
docker compose up -d --build
```

## How To Use The Application

1. Open `http://localhost:5173/login`.
2. Log in with an existing test account or register a new user.
3. Use the sidebar to navigate through the main sections:
   - Dashboard
   - Menu
   - Categories
   - Tables
   - Orders
   - Ingredients
4. Available actions depend on the user role:
   - `ADMIN`
   - `WAITER`
   - `CHEF`

## Test Accounts

| Role | Email | Password |
| --- | --- | --- |
| ADMIN | `lo@gmail.com` | `11111111` |
| WAITER | `tkachristina079@gmail.com` | `111111` |
| CHEF | `ro@gmail.com` | `11111111` |

## Why Data Is Preserved

The initial data is included in the repository as a MySQL dump. Docker imports it only when the database volume is created for the first time.

This keeps existing data:

```bash
docker compose down
docker compose up -d
```

This deletes all database data and recreates it from the SQL dump:

```bash
docker compose down -v
docker compose up -d --build
```
