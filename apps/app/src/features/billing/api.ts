import { authClient } from '@/lib/auth'

export async function createCheckout(input: {
  plan: string
  annual: boolean
  referenceId: string
  seats: number
  subscriptionId?: string | undefined
  successUrl: string
  cancelUrl: string
  returnUrl: string
}) {
  const { data, error } = await authClient.subscription.upgrade({
    plan: input.plan,
    annual: input.annual,
    referenceId: input.referenceId,
    subscriptionId: input.subscriptionId,
    customerType: 'organization',
    seats: input.seats,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    returnUrl: input.returnUrl,
    disableRedirect: true,
  })
  if (error) throw new Error(error.message || "Couldn't start Stripe Checkout.")
  if (!data?.url) throw new Error('Stripe Checkout did not return a redirect URL.')
  return data.url
}

export async function createBillingPortal(input: { referenceId: string; returnUrl: string }) {
  const { data, error } = await authClient.subscription.billingPortal({
    referenceId: input.referenceId,
    customerType: 'organization',
    returnUrl: input.returnUrl,
    disableRedirect: true,
  })
  if (error) throw new Error(error.message || "Couldn't open the billing portal.")
  if (!data?.url) throw new Error('Stripe Billing Portal did not return a redirect URL.')
  return data.url
}
