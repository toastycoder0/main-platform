'use client';

import { Building2Icon, UserRoundIcon } from 'lucide-react';
import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { CFDI_USE_OPTIONS, FISCAL_REGIME_OPTIONS } from '@/modules/users/application/users.cfdi';
import type { UserTaxProfileDTO } from '@/modules/users/application/users.types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/card';
import { ControlledFileUploader } from '@/shared/components/file-uploader';
import { MANUAL_OPTION } from '../../application/checkout.constants';
import { mapTaxProfileToInvoiceDetails } from '../../application/checkout.mapping';
import type { CheckoutFormValues, CheckoutUser } from '../../application/checkout.types';
import { CheckoutCallout } from '../checkout-callout';
import { ChoiceCards } from '../checkout-choice-cards';
import { CheckoutCombobox, CheckoutInput } from '../checkout-fields';

const FISCAL_REGIME_SELECT_OPTIONS = FISCAL_REGIME_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

const CFDI_USE_SELECT_OPTIONS = CFDI_USE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

interface BillingStepProps {
  form: UseFormReturn<CheckoutFormValues>;
  users: CheckoutUser[];
  sessionUser: CheckoutUser;
  taxProfiles: UserTaxProfileDTO[];
  canCreateForOther: boolean;
}

export function BillingStep({
  form,
  users,
  sessionUser,
  taxProfiles,
  canCreateForOther,
}: BillingStepProps) {
  const selectedTaxProfileId = useWatch({
    control: form.control,
    name: 'selectedTaxProfileId',
  });

  const profileOptions = useMemo(
    () => [
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
    ],
    [taxProfiles],
  );

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user.id,
        label: `${user.name} · ${user.email}`,
      })),
    [users],
  );

  async function handleProfileChange(value: string): Promise<void> {
    form.setValue('selectedTaxProfileId', value, { shouldDirty: true });

    if (value === MANUAL_OPTION) {
      return;
    }

    const profile = taxProfiles.find((item) => item.id === value);

    if (!profile) {
      return;
    }

    const invoice = mapTaxProfileToInvoiceDetails(profile);
    form.setValue('invoiceDetails.businessName', invoice.businessName, { shouldDirty: true });
    form.setValue('invoiceDetails.rfc', invoice.rfc, { shouldDirty: true });
    form.setValue('invoiceDetails.zipCode', invoice.zipCode, { shouldDirty: true });
    form.setValue('invoiceDetails.taxRegimen', invoice.taxRegimen, { shouldDirty: true });
    form.setValue('invoiceDetails.cfdiUse', invoice.cfdiUse, { shouldDirty: true });

    await form.trigger([
      'invoiceDetails.businessName',
      'invoiceDetails.rfc',
      'invoiceDetails.zipCode',
      'invoiceDetails.taxRegimen',
      'invoiceDetails.cfdiUse',
    ]);
  }

  return (
    <div className='flex flex-col gap-6'>
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
              value={selectedTaxProfileId}
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
              name='invoiceDetails.businessName'
              label='Razón social'
              placeholder='Mi empresa S.A. de C.V.'
              autoComplete='organization'
            />
            <CheckoutInput
              control={form.control}
              name='invoiceDetails.rfc'
              label='RFC'
              placeholder='ABC123456789'
              autoComplete='off'
              transform={(value) => value.toUpperCase()}
            />
            <CheckoutInput
              control={form.control}
              name='invoiceDetails.zipCode'
              label='Código postal fiscal'
              placeholder='00000'
              autoComplete='postal-code'
            />
            <CheckoutCombobox
              control={form.control}
              name='invoiceDetails.taxRegimen'
              label='Régimen fiscal'
              placeholder='Selecciona un régimen'
              options={FISCAL_REGIME_SELECT_OPTIONS}
            />
            <CheckoutCombobox
              control={form.control}
              name='invoiceDetails.cfdiUse'
              label='Uso de CFDI'
              placeholder='Selecciona un uso'
              options={CFDI_USE_SELECT_OPTIONS}
            />
          </div>

          <div className='mt-4 border-t pt-4'>
            <ControlledFileUploader
              control={form.control}
              name='invoiceDetails.rfcKey'
              entity='order'
              scope='invoiceRfc'
              label='Cédula del RFC (opcional)'
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
