import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth';
import { query } from '../db';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.warn('[billing] STRIPE_SECRET_KEY is not set; billing endpoints will fail until configured.');
}
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : (null as any);

const billingRoutes = Router();

// POST /api/billing/create-checkout-session { planId?: number, planName?: string }
billingRoutes.post('/create-checkout-session', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!stripe) return res.status(500).json({ message: 'Stripe not configured' });
    const userId = res.locals.userId as number;
    const { planId, planName } = req.body as { planId?: number; planName?: string };
    if (!planId && !planName) return res.status(400).json({ message: 'planId or planName is required' });

    // Resolve plan
    const planRes = planId
      ? await query<{ id: number; name: string; stripe_price_id: string | null }>('SELECT id, name, stripe_price_id FROM plans WHERE id = $1', [planId])
      : await query<{ id: number; name: string; stripe_price_id: string | null }>('SELECT id, name, stripe_price_id FROM plans WHERE name = $1', [planName]);
    const plan = planRes.rows[0];
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    if (!plan.stripe_price_id) return res.status(400).json({ message: 'Plan is not configured for Stripe (missing price id)' });

    // Ensure Stripe customer
    const userRes = await query<{ email: string; full_name: string | null; stripe_customer_id: string | null }>('SELECT email, full_name, stripe_customer_id FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name || undefined,
        metadata: { userId: String(userId) },
      });
      customerId = customer.id;
      await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId]);
    }

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing/cancel`,
      allow_promotion_codes: true,
      metadata: {
        userId: String(userId),
        planId: String(plan.id),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[billing/create-checkout-session] error', err);
    return res.status(500).json({ message: 'Failed to create checkout session' });
  }
});

export default billingRoutes;

// Stripe webhook handler (requires raw body mounting at app level)
export async function stripeWebhookHandler(req: Request, res: Response) {
  try {
    const sig = req.headers['stripe-signature'];
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !whSecret || !stripe) return res.status(500).send('Webhook not configured');
    const rawBody = (req as any).rawBody || (req as any).body; // populated by express.raw
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig as string, whSecret);
    } catch (err: any) {
      console.error('[stripe webhook] signature verification failed', err?.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string | null;
        const customerId = session.customer as string | null;
        const planId = session.metadata?.planId ? Number(session.metadata.planId) : undefined;
        const userId = session.metadata?.userId ? Number(session.metadata.userId) : undefined;
        if (userId && customerId) {
          await query('UPDATE users SET stripe_customer_id = COALESCE(stripe_customer_id, $1), stripe_subscription_id = COALESCE($2, stripe_subscription_id), plan_id = COALESCE($3, plan_id), membership_status = $4, updated_at = now() WHERE id = $5', [
            customerId,
            subscriptionId,
            planId ?? null,
            'active',
            userId,
          ]);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        const status = sub.status; // trialing, active, past_due, canceled, incomplete, incomplete_expired, unpaid
        const mapped = status === 'active' || status === 'trialing' ? 'active' : (status === 'past_due' || status === 'unpaid' ? 'past_due' : status);
        await query('UPDATE users SET stripe_subscription_id = $1, membership_status = $2, updated_at = now() WHERE stripe_customer_id = $3', [
          sub.id,
          mapped,
          customerId,
        ]);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        await query('UPDATE users SET membership_status = $1, updated_at = now() WHERE stripe_customer_id = $2', [
          'canceled',
          customerId,
        ]);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        await query('UPDATE users SET membership_status = $1, updated_at = now() WHERE stripe_customer_id = $2', [
          'past_due',
          customerId,
        ]);
        break;
      }
      default:
        // Ignored event types
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[stripe webhook] handler error', err);
    res.status(500).send('Webhook handler error');
  }
}
