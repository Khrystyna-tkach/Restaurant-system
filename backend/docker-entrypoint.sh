set -e

until npx prisma db push; do
  echo "Database is not ready yet. Retrying in 2 seconds..."
  sleep 2
done

node server.js
