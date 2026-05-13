/*
  Warnings:

  - You are about to drop the column `seats` on the `Table` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Table` table. All the data in the column will be lost.
  - Added the required column `capacity` to the `Table` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Table" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "number" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isOccupied" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Table" ("id", "number") SELECT "id", "number" FROM "Table";
DROP TABLE "Table";
ALTER TABLE "new_Table" RENAME TO "Table";
CREATE UNIQUE INDEX "Table_number_key" ON "Table"("number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
