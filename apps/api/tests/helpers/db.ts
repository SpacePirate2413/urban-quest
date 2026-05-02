import { prisma } from '../../src/lib/prisma.js';

/**
 * Wipe every row from every table in dependency order (children first).
 * Call this in `beforeEach` so tests get a clean DB without re-pushing
 * the schema each time.
 */
export async function resetDb() {
  await prisma.report.deleteMany();
  await prisma.userBlock.deleteMany();
  await prisma.review.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.scene.deleteMany();
  await prisma.waypoint.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.scoutedWaypoint.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
