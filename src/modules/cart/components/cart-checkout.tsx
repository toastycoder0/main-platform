'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { formatCurrency } from '@/shared/utils/format-currency';
import { CHECKOUT_STEPS, MIN_HOME_DELIVERY_MXN } from '../application/checkout.constants';
import { createCheckoutDefaults } from '../application/checkout.defaults';
import { getMxnSubtotal } from '../application/checkout.mapping';
import { buildCheckoutSubmission } from '../application/checkout.payload';
import type {
  CheckoutFormValues,
  CheckoutProps,
  CheckoutSubmission,
} from '../application/checkout.types';
import { CHECKOUT_STEP_FIELDS, checkoutFormSchema } from '../application/checkout.validation';
import { useCartFlow } from './cart-flow';
import { CheckoutActions } from './checkout-actions';
import { CheckoutMobileBar } from './checkout-mobile-bar';
import { CheckoutStepContent } from './checkout-step-content';

const HOME_MINIMUM_ERROR = `El subtotal debe alcanzar ${formatCurrency(
  MIN_HOME_DELIVERY_MXN,
  'MXN',
)} para entrega a domicilio.`;

function onConfirm(_submission: CheckoutSubmission): void {
  // Wired to the real checkout action in the next phase.
}

export function CartCheckout({
  cart,
  users,
  sessionUser,
  addresses,
  taxProfiles,
  canCreateForOther,
  canReserve,
}: CheckoutProps) {
  const { step, setStep } = useCartFlow();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: createCheckoutDefaults(sessionUser.id),
    mode: 'onTouched',
  });

  const userId = useWatch({ control: form.control, name: 'userId' });
  const currentIndex = CHECKOUT_STEPS.indexOf(step);
  const nextStep = CHECKOUT_STEPS[currentIndex + 1];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === CHECKOUT_STEPS.length - 1;
  const owner = users.find((user) => user.id === userId) ?? sessionUser;
  const ownerName = owner.name || sessionUser.name;
  const hasStockIssue = cart.lines.some((line) => line.issue !== null);
  const canContinue = cart.lines.length > 0 && !hasStockIssue;
  const mxnSubtotal = getMxnSubtotal(cart);
  const totalLabel =
    cart.totals.map((total) => formatCurrency(total.amount, total.currency)).join(' + ') || '—';

  async function goNext(): Promise<void> {
    const current = form.getValues();

    if (
      step === 'order' &&
      current.type === 'home' &&
      (mxnSubtotal === null || mxnSubtotal < MIN_HOME_DELIVERY_MXN)
    ) {
      form.setError('type', { type: 'custom', message: HOME_MINIMUM_ERROR });
      return;
    }

    if (step === 'order') {
      form.clearErrors('type');
    }

    const valid = await form.trigger(CHECKOUT_STEP_FIELDS[step]);

    if (valid && nextStep) {
      setStep(nextStep);
    }
  }

  function goBack(): void {
    const previous = CHECKOUT_STEPS[currentIndex - 1];

    if (previous) {
      setStep(previous);
    }
  }

  async function onSubmit(formValues: CheckoutFormValues): Promise<void> {
    if (step !== 'review') {
      await goNext();
      return;
    }

    if (hasStockIssue) {
      setStep('cart');
      return;
    }

    if (
      formValues.type === 'home' &&
      (mxnSubtotal === null || mxnSubtotal < MIN_HOME_DELIVERY_MXN)
    ) {
      setStep('order');
      form.setError('type', { type: 'custom', message: HOME_MINIMUM_ERROR });
      return;
    }

    onConfirm(buildCheckoutSubmission(formValues, cart, owner));
  }

  return (
    <>
      <form
        id='checkout-form'
        noValidate
        className='flex flex-col gap-6'
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <CheckoutStepContent
          step={step}
          form={form}
          cart={cart}
          users={users}
          sessionUser={sessionUser}
          addresses={addresses}
          taxProfiles={taxProfiles}
          canCreateForOther={canCreateForOther}
          canReserve={canReserve}
          mxnSubtotal={mxnSubtotal}
          ownerName={ownerName}
          onEdit={setStep}
        />

        <CheckoutActions
          step={step}
          isFirst={isFirst}
          isLast={isLast}
          canContinue={canContinue}
          hasStockIssue={hasStockIssue}
          onBack={goBack}
          onNext={goNext}
        />
      </form>

      <CheckoutMobileBar
        totalLabel={totalLabel}
        isFirst={isFirst}
        isLast={isLast}
        canContinue={canContinue}
        hasStockIssue={hasStockIssue}
        onBack={goBack}
        onNext={goNext}
      />
      <div className='h-20 lg:hidden' />
    </>
  );
}
