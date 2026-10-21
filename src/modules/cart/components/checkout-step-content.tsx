'use client';

import type { UseFormReturn } from 'react-hook-form';
import type { UserAddressDTO, UserTaxProfileDTO } from '@/modules/users/application/users.types';
import type { CartDTO } from '../application/cart.types';
import type { CheckoutStep } from '../application/checkout.constants';
import type { CheckoutFormValues, CheckoutUser } from '../application/checkout.types';
import { BillingStep } from './steps/billing-step';
import { OrderStep } from './steps/order-step';
import { ReviewStep } from './steps/review-step';

interface CheckoutStepContentProps {
  step: CheckoutStep;
  form: UseFormReturn<CheckoutFormValues>;
  cart: CartDTO;
  users: CheckoutUser[];
  sessionUser: CheckoutUser;
  addresses: UserAddressDTO[];
  taxProfiles: UserTaxProfileDTO[];
  canSelectOwner: boolean;
  canReserve: boolean;
  mxnSubtotal: number | null;
  ownerName: string;
  onEdit: (step: CheckoutStep) => void;
}

export function CheckoutStepContent({
  step,
  form,
  cart,
  users,
  sessionUser,
  addresses,
  taxProfiles,
  canSelectOwner,
  canReserve,
  mxnSubtotal,
  ownerName,
  onEdit,
}: CheckoutStepContentProps) {
  if (step === 'cart') {
    return null;
  }

  if (step === 'billing') {
    return (
      <BillingStep
        form={form}
        users={users}
        sessionUser={sessionUser}
        taxProfiles={taxProfiles}
        canSelectOwner={canSelectOwner}
      />
    );
  }

  if (step === 'order') {
    return (
      <OrderStep
        form={form}
        addresses={addresses}
        mxnSubtotal={mxnSubtotal}
        canReserve={canReserve}
      />
    );
  }

  return <ReviewStep form={form} lines={cart.lines} ownerName={ownerName} onEdit={onEdit} />;
}
