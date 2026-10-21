import type { FieldPath } from 'react-hook-form';
import { z } from 'zod';
import { isCfdiUse, isFiscalRegime } from '@/modules/users/application/users.cfdi';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import {
  CHECKOUT_FILE_MAX_SIZE,
  type CheckoutStep,
  INVOICE_SHIPPING_OPTIONS,
  ORDER_TYPES,
  SHIPPING_TYPES,
} from './checkout.constants';
import type { CheckoutFormValues } from './checkout.types';

function requiredText(max: number) {
  return z.string().trim().min(1, FIELD_ERRORS.required).max(max, FIELD_ERRORS.tooLong);
}

const postalCode = z
  .string()
  .trim()
  .regex(/^\d{5}$/, FIELD_ERRORS.postalCode);
const phone = z
  .string()
  .trim()
  .regex(/^\d{10}$/, FIELD_ERRORS.phone);
const rfc = z
  .string()
  .trim()
  .min(1, FIELD_ERRORS.required)
  .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, FIELD_ERRORS.rfc);
const cfdiUse = z
  .string()
  .trim()
  .min(1, FIELD_ERRORS.required)
  .refine(isCfdiUse, 'El uso de CFDI no es válido');
const taxRegime = z
  .string()
  .trim()
  .min(1, FIELD_ERRORS.required)
  .refine(isFiscalRegime, 'El régimen fiscal no es válido');

const fileSchema = z
  .custom<File | null>(
    (value) => value === null || (typeof File !== 'undefined' && value instanceof File),
    'El archivo no es válido',
  )
  .refine((file) => file === null || file.type === 'application/pdf', 'El archivo debe ser PDF')
  .refine(
    (file) => file === null || file.size <= CHECKOUT_FILE_MAX_SIZE,
    'El archivo excede el tamaño máximo de 10 MB',
  );

const directionShape = {
  street: z.string(),
  colony: z.string(),
  municipality: z.string(),
  state: z.string(),
  postalCode: z.string(),
  contact: z.string(),
  phone: z.string(),
};

const looseDirectionSchema = z.object(directionShape);

const directionSchema = z.object({
  street: requiredText(150),
  colony: requiredText(100),
  municipality: requiredText(100),
  state: requiredText(100),
  postalCode,
  contact: requiredText(150),
  phone,
});

const invoiceSchema = z.object({
  businessName: requiredText(200),
  rfc,
  zipCode: postalCode,
  taxRegimen: taxRegime,
  cfdiUse,
  rfcFile: fileSchema,
});

const warehouseShape = {
  office: z.string(),
  licensePlate: z.string(),
  vehicle: z.string(),
  driver: z.string(),
  dateOfRecolection: z.string(),
};

const warehouseSchema = z.object({
  office: requiredText(100),
  licensePlate: requiredText(30),
  vehicle: requiredText(100),
  driver: requiredText(150),
  dateOfRecolection: requiredText(30),
});

const shippingInvoiceShape = {
  businessName: z.string(),
  rfc: z.string(),
  zipCode: z.string(),
  taxRegimen: z.string(),
  rfcFile: fileSchema,
};

const shippingInvoiceSchema = z.object({
  businessName: requiredText(200),
  rfc,
  zipCode: postalCode,
  taxRegimen: taxRegime,
  rfcFile: fileSchema,
});

const shippingPartyShape = {
  name: z.string(),
  direction: looseDirectionSchema,
  invoiceDetails: z.object(shippingInvoiceShape),
};

const shippingPartySchema = z.object({
  name: requiredText(200),
  direction: directionSchema,
  invoiceDetails: shippingInvoiceSchema,
});

const looseShippingCompanySchema = z.object({
  type: z.enum(SHIPPING_TYPES),
  freighter: z.string(),
  isSecured: z.boolean(),
  invoiceShipping: z.string(),
  invoiceShippingCustom: z.string(),
  cfdiUse: z.string(),
  branch: z.string(),
  hasReceiver: z.boolean(),
  sender: z.object(shippingPartyShape),
  receiver: z.object(shippingPartyShape),
  address: looseDirectionSchema,
});

type ShippingCompanyInput = z.infer<typeof looseShippingCompanySchema>;

function addNestedIssues(
  result: { success: true } | { success: false; error: z.ZodError },
  ctx: z.RefinementCtx,
  prefix: Array<string | number>,
): void {
  if (result.success) {
    return;
  }

  for (const issue of result.error.issues) {
    ctx.addIssue({ ...issue, path: [...prefix, ...issue.path] });
  }
}

function validateShippingBilling(value: ShippingCompanyInput, ctx: z.RefinementCtx): void {
  if (!(INVOICE_SHIPPING_OPTIONS as readonly string[]).includes(value.invoiceShipping)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Selecciona una opción de facturación válida',
      path: ['invoiceShipping'],
    });
  }

  if (value.invoiceShipping === 'Otro' && value.invoiceShippingCustom.trim().length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: FIELD_ERRORS.required,
      path: ['invoiceShippingCustom'],
    });
  }

  if (!isCfdiUse(value.cfdiUse)) {
    ctx.addIssue({
      code: 'custom',
      message: 'El uso de CFDI no es válido',
      path: ['cfdiUse'],
    });
  }
}

function validateShippingParties(value: ShippingCompanyInput, ctx: z.RefinementCtx): void {
  addNestedIssues(shippingPartySchema.safeParse(value.sender), ctx, ['sender']);

  if (value.hasReceiver || value.type === 'home') {
    addNestedIssues(shippingPartySchema.safeParse(value.receiver), ctx, ['receiver']);
  }

  if (value.type === 'home') {
    addNestedIssues(directionSchema.safeParse(value.address), ctx, ['address']);

    if (!value.hasReceiver) {
      ctx.addIssue({
        code: 'custom',
        message: 'El destinatario es obligatorio para envío a domicilio',
        path: ['hasReceiver'],
      });
    }
  }

  if (value.type === 'happening' && value.branch.trim().length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: FIELD_ERRORS.required,
      path: ['branch'],
    });
  }
}

const shippingCompanySchema = looseShippingCompanySchema.superRefine((value, ctx) => {
  validateShippingBilling(value, ctx);
  validateShippingParties(value, ctx);
});

export const checkoutFormSchema = z
  .object({
    userId: requiredText(100),
    selectedTaxProfileId: z.string(),
    selectedHomeAddressId: z.string(),
    selectedSenderAddressId: z.string(),
    selectedReceiverAddressId: z.string(),
    selectedShippingAddressId: z.string(),
    invoiceDetails: invoiceSchema,
    type: z.enum(ORDER_TYPES),
    home: looseDirectionSchema,
    warehouse: z.object(warehouseShape),
    shippingCompany: looseShippingCompanySchema,
    notes: z.string().trim().max(1000, FIELD_ERRORS.tooLong),
    reservationEnabled: z.boolean(),
    reservationHours: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'home') {
      addNestedIssues(directionSchema.safeParse(value.home), ctx, ['home']);
    }

    if (value.type === 'warehouse') {
      addNestedIssues(warehouseSchema.safeParse(value.warehouse), ctx, ['warehouse']);
    }

    if (value.type === 'shipping-company') {
      addNestedIssues(shippingCompanySchema.safeParse(value.shippingCompany), ctx, [
        'shippingCompany',
      ]);
    }

    if (value.reservationEnabled) {
      const hours = Number(value.reservationHours);

      if (!Number.isFinite(hours) || hours <= 0 || hours > 720) {
        ctx.addIssue({
          code: 'custom',
          message: 'Indica una duración válida entre 1 y 720 horas',
          path: ['reservationHours'],
        });
      }
    }
  });

export const CHECKOUT_STEP_FIELDS: Record<CheckoutStep, FieldPath<CheckoutFormValues>[]> = {
  cart: [],
  billing: ['userId', 'selectedTaxProfileId', 'invoiceDetails'],
  order: [
    'type',
    'home',
    'warehouse',
    'shippingCompany',
    'selectedHomeAddressId',
    'selectedSenderAddressId',
    'selectedReceiverAddressId',
    'selectedShippingAddressId',
    'notes',
    'reservationEnabled',
    'reservationHours',
  ],
  review: [],
};
