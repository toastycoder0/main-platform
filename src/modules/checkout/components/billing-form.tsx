'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2Icon, UserRoundIcon } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { CFDI_USE_OPTIONS, FISCAL_REGIME_OPTIONS } from '@/modules/users/application/users.cfdi';
import type { UserTaxProfileDTO } from '@/modules/users/application/users.types';
import { submitAction } from '@/shared/actions/submit-action';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/card';
import { ControlledFileUploader } from '@/shared/components/file-uploader';
import { CHECKOUT_STEP_PATHS, MANUAL_OPTION } from '../application/checkout.constants';
import { mapTaxProfileToInvoice } from '../application/checkout.mapping';
import type { CheckoutUser } from '../application/checkout.types';
import {
  type CheckoutBilling,
  type CheckoutBillingInput,
  checkoutBillingSchema,
} from '../application/checkout.validation';
import { saveCheckoutBilling } from '../infrastructure/checkout.action';
import { CheckoutCallout } from './checkout-callout';
import { ChoiceCards } from './checkout-choice-cards';
import { CheckoutCombobox, CheckoutInput } from './checkout-fields';
import { StepFooter } from './step-footer';
import { StepSubmitButton } from './step-submit-button';

const FISCAL_REGIME_SELECT_OPTIONS = FISCAL_REGIME_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

const CFDI_USE_SELECT_OPTIONS = CFDI_USE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

interface BillingFormProps {
  defaultValues: CheckoutBillingInput;
  users: CheckoutUser[];
  sessionUser: CheckoutUser;
  taxProfiles: UserTaxProfileDTO[];
  canCreateForOther: boolean;
  totalLabel: string;
}

function matchingProfileId(
  profiles: UserTaxProfileDTO[],
  invoice: CheckoutBillingInput['invoice'],
): string {
  const match = profiles.find(
    (profile) => profile.rfc === invoice.rfc && profile.legalName === invoice.businessName,
  );
  return match?.id ?? MANUAL_OPTION;
}

export function BillingForm({
  defaultValues,
  users,
  sessionUser,
  taxProfiles,
  canCreateForOther,
  totalLabel,
}: BillingFormProps) {
  const [pending, startTransition] = useTransition();
  const [profileId, setProfileId] = useState(() =>
    matchingProfileId(taxProfiles, defaultValues.invoice),
  );
  const form = useForm<CheckoutBillingInput, unknown, CheckoutBilling>({
    resolver: zodResolver(checkoutBillingSchema),
    defaultValues,
  });

  const profileOptions = [
    {
      value: MANUAL_OPTION,
      label: 'Capturar manualmente',
      description: 'Escribe los datos fiscales directamente.',
      icon: UserRoundIcon,
    },
    ...taxProfiles.map((profile) => ({
      value: profile.id,
      label: profile.alias || profile.legalName,
      description: `${profile.legalName} · ${profile.rfc}`,
      icon: Building2Icon,
    })),
  ];

  const userOptions = users.map((user) => ({
    value: user.id,
    label: `${user.name} · ${user.email}`,
  }));

  function handleProfileChange(value: string): void {
    setProfileId(value);
    const profile = taxProfiles.find((item) => item.id === value);

    if (!profile) {
      return;
    }

    const invoice = mapTaxProfileToInvoice(profile);
    const options = { shouldDirty: true, shouldValidate: true };
    form.setValue('invoice.businessName', invoice.businessName, options);
    form.setValue('invoice.rfc', invoice.rfc, options);
    form.setValue('invoice.zipCode', invoice.zipCode, options);
    form.setValue('invoice.taxRegimen', invoice.taxRegimen, options);
    form.setValue('invoice.cfdiUse', invoice.cfdiUse, options);
  }

  function onSubmit(values: CheckoutBilling): void {
    startTransition(async () => {
      await submitAction(() => saveCheckoutBilling(values));
    });
  }

  return (
    <form noValidate className='flex flex-col gap-6' onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Propietario del pedido</CardTitle>
          <CardDescription>Indica a nombre de quién se registra esta compra.</CardDescription>
        </CardHeader>
        <CardContent>
          {canCreateForOther ? (
            <CheckoutCombobox
              control={form.control}
              name='userId'
              label='Usuario responsable'
              placeholder='Busca por nombre o correo'
              options={userOptions}
            />
          ) : (
            <div className='flex items-center gap-3 rounded-lg border bg-muted/40 p-3'>
              <div className='flex size-9 items-center justify-center rounded-full bg-background'>
                <UserRoundIcon className='size-4 text-muted-foreground' />
              </div>
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>{sessionUser.name}</span>
                <span className='text-xs text-muted-foreground'>{sessionUser.email}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos de facturación</CardTitle>
          <CardDescription>
            Selecciona un perfil fiscal guardado o captura los datos manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className='gap-6'>
          {taxProfiles.length > 0 ? (
            <ChoiceCards
              value={profileId}
              onValueChange={handleProfileChange}
              options={profileOptions}
              ariaLabel='Perfil fiscal'
              columns={2}
            />
          ) : null}

          <CheckoutCallout tone='warning' title='Datos fiscales del SAT'>
            Los datos deben escribirse exactamente como aparecen en el RFC.
          </CheckoutCallout>

          <div className='grid gap-4 sm:grid-cols-2'>
            <CheckoutInput
              control={form.control}
              name='invoice.businessName'
              label='Razón social'
              placeholder='Mi empresa S.A. de C.V.'
              autoComplete='organization'
            />
            <CheckoutInput
              control={form.control}
              name='invoice.rfc'
              label='RFC'
              placeholder='ABC123456789'
              autoComplete='off'
              transform={(value) => value.toUpperCase()}
            />
            <CheckoutInput
              control={form.control}
              name='invoice.zipCode'
              label='Código postal fiscal'
              placeholder='00000'
              autoComplete='postal-code'
            />
            <CheckoutCombobox
              control={form.control}
              name='invoice.taxRegimen'
              label='Régimen fiscal'
              placeholder='Selecciona un régimen'
              options={FISCAL_REGIME_SELECT_OPTIONS}
            />
            <CheckoutCombobox
              control={form.control}
              name='invoice.cfdiUse'
              label='Uso de CFDI'
              placeholder='Selecciona un uso'
              options={CFDI_USE_SELECT_OPTIONS}
            />
          </div>

          <div className='mt-4 border-t pt-4'>
            <ControlledFileUploader
              control={form.control}
              name='invoice.rfcKey'
              entity='order'
              scope='invoiceRfc'
              label='Cédula del RFC (opcional)'
            />
          </div>
        </CardContent>
      </Card>

      <StepFooter
        backHref={CHECKOUT_STEP_PATHS.cart}
        totalLabel={totalLabel}
        action={<StepSubmitButton label='Continuar' pending={pending} />}
      />
    </form>
  );
}
