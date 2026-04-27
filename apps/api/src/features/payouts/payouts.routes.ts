import { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';

// Stripe Connect Express integration (Q8g).
//
// This is creator-station only — Apple's anti-steering rules forbid us from
// referring to non-IAP payments inside the iOS app. Mounted under /api/payouts
// and registered in app.ts.
//
// Tasks intentionally out of scope here: actual payout calculation (reading
// Purchase rows, applying the 70/30 split, calling stripe.transfers.create).
// That's the *mechanics* of paying creators; we only need the *onboarding*
// flow done before launch so creators can link a payout account.

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' as any })
  : null;

export async function payoutsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // GET /me/payouts — current Stripe Connect status for the signed-in creator
  app.get('/me/payouts', async (request, reply) => {
    const userId = (request.user as { id: string }).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectStatus: true,
      },
    });

    if (!user) return reply.status(404).send({ error: 'User not found' });

    if (!stripe || !user.stripeConnectAccountId) {
      return {
        connected: false,
        status: 'unconnected',
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };
    }

    // Refresh the cached status from Stripe so the UI is accurate. Cheap call.
    try {
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      const newStatus =
        account.charges_enabled && account.payouts_enabled
          ? 'active'
          : account.requirements?.disabled_reason
            ? 'restricted'
            : 'pending';

      if (newStatus !== user.stripeConnectStatus) {
        await prisma.user.update({
          where: { id: userId },
          data: { stripeConnectStatus: newStatus },
        });
      }

      return {
        connected: true,
        status: newStatus,
        accountId: user.stripeConnectAccountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      };
    } catch (err: any) {
      app.log.warn({ err }, 'Failed to refresh Stripe Connect status');
      return {
        connected: true,
        status: user.stripeConnectStatus ?? 'pending',
        accountId: user.stripeConnectAccountId,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };
    }
  });

  // POST /me/payouts/onboarding-link — get a fresh onboarding link.
  // Creates an Express account on first call, then returns a single-use
  // hosted onboarding URL. Onboarding URLs are short-lived; the client should
  // call this every time the user clicks "Set up payouts."
  app.post('/me/payouts/onboarding-link', async (request, reply) => {
    if (!stripe) {
      return reply.status(503).send({
        error: 'Payouts are not configured yet. Set STRIPE_SECRET_KEY in the API environment.',
      });
    }

    const userId = (request.user as { id: string }).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeConnectAccountId: true },
    });

    if (!user) return reply.status(404).send({ error: 'User not found' });

    let accountId = user.stripeConnectAccountId;

    if (!accountId) {
      // Create a Connect Express account. We default to US since revenue is
      // the operator's (Blue Pelican Digital LLC, TN) — Stripe will let the
      // creator pick their country during onboarding regardless.
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { urbanquest_user_id: user.id },
      });

      accountId = account.id;
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeConnectAccountId: accountId,
          stripeConnectStatus: 'pending',
        },
      });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: env.STRIPE_CONNECT_REFRESH_URL,
      return_url: env.STRIPE_CONNECT_RETURN_URL,
      type: 'account_onboarding',
    });

    return { url: link.url, expiresAt: link.expires_at };
  });

  // GET /me/payouts/dashboard-link — for already-onboarded creators to access
  // their Stripe-hosted Express dashboard (view balance, edit bank details, etc.).
  app.get('/me/payouts/dashboard-link', async (request, reply) => {
    if (!stripe) {
      return reply.status(503).send({ error: 'Payouts are not configured.' });
    }

    const userId = (request.user as { id: string }).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true },
    });

    if (!user?.stripeConnectAccountId) {
      return reply.status(400).send({ error: 'No payout account connected.' });
    }

    const link = await stripe.accounts.createLoginLink(user.stripeConnectAccountId);
    return { url: link.url };
  });
}
