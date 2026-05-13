set -e

until npx prisma migrate deploy >/tmp/prisma-migrate.log 2>&1; do
  echo "Database is not ready yet. Retrying in 2 seconds..."
  sleep 2
done

cat /tmp/prisma-migrate.log
node server.js
