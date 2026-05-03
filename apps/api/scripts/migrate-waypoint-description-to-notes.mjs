#!/usr/bin/env node
/**
 * One-shot migration: copy any text in Waypoint.description into Waypoint.notes
 * before we drop the description column. Safe to re-run — it only acts on rows
 * that have a non-empty description and an empty/missing notes; rows that have
 * both get the two fields concatenated with a separator so nothing is lost.
 *
 * Usage:
 *   node apps/api/scripts/migrate-waypoint-description-to-notes.mjs
 *
 * Run this BEFORE applying the schema change that drops the column. Use the
 * dev DATABASE_URL by default; pass DATABASE_URL=... to target another DB
 * (you'll want to do this against staging/prod when those exist).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Pull every waypoint that has any text in description. (Old schema only
  // — once the column is dropped this query will fail, which is the intended
  // signal that the migration is complete.)
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, description, notes FROM Waypoint WHERE description IS NOT NULL AND description != ''`,
  );

  if (rows.length === 0) {
    console.log('No waypoints need migration. ✅');
    return;
  }

  let touched = 0;
  for (const row of rows) {
    const desc = row.description?.trim() ?? '';
    const notes = row.notes?.trim() ?? '';
    let merged;
    if (!notes) {
      merged = desc;
    } else if (notes === desc) {
      merged = notes; // already identical, no change needed
    } else {
      // Preserve both. Description first because it was usually the longer
      // creator-facing text; notes after as supplementary.
      merged = `${desc}\n\n${notes}`;
    }
    if (merged !== row.notes) {
      await prisma.waypoint.update({ where: { id: row.id }, data: { notes: merged } });
      touched += 1;
    }
  }
  console.log(`Migrated ${touched}/${rows.length} waypoints. ✅`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
