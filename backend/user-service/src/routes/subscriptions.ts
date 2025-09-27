import express from 'express';
import Stripe from 'stripe';
import { authMiddleware, requirePlan } from '../middleware/auth';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Plan configurations
const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: ['100 AI requests/month', 'Basic editor', 'Public projects only'],
    limits: {
      aiRequests: 100,
      projects: 3,
      storage: 100, // MB
    },
  },
  PRO: {
    name: 'Pro',
    price: 29,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: ['10,000 AI requests/month', 'Advanced AI models', 'Private projects', 'Priority support'],
    limits: {
      aiRequests: 10000,
      projects: 50,
      storage: 5000, // MB
    },
  },
  TEAM: {
    name: 'Team',
    price: 99,
    stripePriceId: process.env.STRIPE_TEAM_PRICE_ID,
    features: ['50,000 AI requests/month', 'Team collaboration', 'Shared workspaces', 'Admin controls'],
    limits: {
      aiRequests: 50000,
      projects: 200,
      storage: 20000, // MB
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Unlimited AI requests', 'Custom models', 'On-premise deployment', 'Dedicated support'],
    limits: {
      aiRequests: -1, // Unlimited
      projects: -1,
      storage: -1,
    },
  },
};

// Get available plans
router.get('/plans', async (req, res) => {
  try {
    res.json({
      plans: PLANS,
    });
  } catch (error) {
    logger.error('Get plans error:', error);
    res.status(500).json({
      error: 'Failed to get plans',
    });
  }
});

// Get current subscription
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user!.id,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        plan: true,
      },
    });

    res.json({
      subscription,
      currentPlan: user?.plan || 'FREE',
      planDetails: PLANS[user?.plan as keyof typeof PLANS] || PLANS.FREE,
    });
  } catch (error) {
    logger.error('Get current subscription error:', error);
    res.status(500).json({
      error: 'Failed to get subscription',
    });
  }
});

// Create checkout session
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !['PRO', 'TEAM'].includes(plan)) {
      return res.status(400).json({
        error: 'Invalid plan',
        message: 'Plan must be PRO or TEAM',
      });
    }

    const planConfig = PLANS[plan as keyof typeof PLANS];
    if (!planConfig.stripePriceId) {
      return res.status(400).json({
        error: 'Plan not available for checkout',
      });
    }

    // Get or create Stripe customer
    let customer;
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    if (user.subscriptions.length > 0 && user.subscriptions[0].stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.subscriptions[0].stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id,
        },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: planConfig.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?subscription=cancelled`,
      metadata: {
        userId: user.id,
        plan,
      },
    });

    logger.info(`Checkout session created for user ${user.email}, plan: ${plan}`);

    res.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    logger.error('Create checkout session error:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
    });
  }
});

// Create customer portal session
router.post('/portal', authMiddleware, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user!.id,
        status: 'ACTIVE',
      },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      return res.status(404).json({
        error: 'No active subscription found',
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    res.json({
      portalUrl: session.url,
    });
  } catch (error) {
    logger.error('Create portal session error:', error);
    res.status(500).json({
      error: 'Failed to create portal session',
    });
  }
});

// Cancel subscription
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user!.id,
        status: 'ACTIVE',
      },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({
        error: 'No active subscription found',
      });
    }

    // Cancel at period end
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update local subscription
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    logger.info(`Subscription cancelled for user: ${req.user!.email}`);

    res.json({
      message: 'Subscription will be cancelled at the end of the current period',
    });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
    });
  }
});

// Reactivate subscription
router.post('/reactivate', authMiddleware, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user!.id,
        status: 'ACTIVE',
        cancelAtPeriodEnd: true,
      },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({
        error: 'No cancelled subscription found',
      });
    }

    // Reactivate subscription
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update local subscription
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false,
      },
    });

    logger.info(`Subscription reactivated for user: ${req.user!.email}`);

    res.json({
      message: 'Subscription reactivated successfully',
    });
  } catch (error) {
    logger.error('Reactivate subscription error:', error);
    res.status(500).json({
      error: 'Failed to reactivate subscription',
    });
  }
});

// Get subscription history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        plan: sub.plan,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        canceledAt: sub.canceledAt,
        createdAt: sub.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Get subscription history error:', error);
    res.status(500).json({
      error: 'Failed to get subscription history',
    });
  }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Webhook handlers
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;

  if (!userId || !plan) {
    logger.error('Missing metadata in checkout session');
    return;
  }

  logger.info(`Checkout completed for user ${userId}, plan: ${plan}`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  const userId = (customer as Stripe.Customer).metadata?.userId;

  if (!userId) {
    logger.error('Missing userId in customer metadata');
    return;
  }

  const plan = subscription.items.data[0].price.metadata?.plan || 'PRO';

  await prisma.subscription.create({
    data: {
      userId,
      plan: plan as any,
      status: 'ACTIVE',
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  // Update user plan
  await prisma.user.update({
    where: { id: userId },
    data: { plan: plan as any },
  });

  logger.info(`Subscription created for user ${userId}, plan: ${plan}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status.toUpperCase() as any,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  logger.info(`Subscription updated: ${subscription.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: { user: true },
  });

  if (dbSubscription) {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    // Downgrade user to free plan
    await prisma.user.update({
      where: { id: dbSubscription.userId },
      data: { plan: 'FREE' },
    });

    logger.info(`Subscription deleted for user ${dbSubscription.user.email}`);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  logger.info(`Payment succeeded for invoice: ${invoice.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
    include: { user: true },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'PAST_DUE' },
    });

    logger.warn(`Payment failed for user ${subscription.user.email}`);
  }
}

export { router as subscriptionRouter };
