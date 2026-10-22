import { describe, expect, it } from 'vitest';
import { createDeliveryFormSchema, toDeliveryFormValues, toDeliveryInput } from './checkout.form';
import { HOME_MINIMUM_ERROR } from './checkout.rules';
import { checkoutDeliverySchema, type DeliveryFormValues } from './checkout.validation';

const direction = {
  street: 'Av. Reforma 123',
  colony: 'Centro',
  municipality: 'Cuauhtémoc',
  state: 'Ciudad de México',
  postalCode: '06000',
  contact: 'Ana López',
  phone: '5512345678',
};

const party = {
  name: 'Empresa',
  direction,
  invoice: {
    businessName: 'Empresa S.A. de C.V.',
    rfc: 'EMP010101AAA',
    zipCode: '06000',
    taxRegimen: '601',
    rfcKey: '',
  },
};

function homeForm(): DeliveryFormValues {
  return { ...toDeliveryFormValues(null), type: 'home', home: direction };
}

function paths(result: ReturnType<ReturnType<typeof createDeliveryFormSchema>['safeParse']>) {
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('createDeliveryFormSchema', () => {
  const schema = createDeliveryFormSchema({ canDeliverHome: true });

  it('outputs only the chosen branch', () => {
    const result = schema.safeParse(homeForm());

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      type: 'home',
      home: direction,
      notes: '',
      reservationHours: null,
    });
  });

  it('reports issues of the chosen branch with form paths', () => {
    const result = schema.safeParse({ ...homeForm(), home: { ...direction, phone: '12' } });

    expect(paths(result)).toEqual(['home.phone']);
  });

  it('ignores invalid values of branches that were not chosen', () => {
    const values = homeForm();
    values.warehouse.licensePlate = '';

    expect(schema.safeParse(values).success).toBe(true);
  });

  it('adds the home minimum rule on the order type', () => {
    const result = createDeliveryFormSchema({ canDeliverHome: false }).safeParse(homeForm());

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([HOME_MINIMUM_ERROR]);
  });

  it('drops the receiver when an "ocurre" shipment has none', () => {
    const values = toDeliveryFormValues(null);
    values.type = 'shipping-company';
    values.shippingCompany = {
      ...values.shippingCompany,
      type: 'happening',
      cfdiUse: 'G03',
      branch: 'Sucursal Norte',
      hasReceiver: false,
      sender: party,
    };

    const result = schema.safeParse(values);

    expect(result.success).toBe(true);
    expect(result.data?.type === 'shipping-company' && result.data.shippingCompany.receiver).toBe(
      null,
    );
  });

  it('parses the reservation duration', () => {
    const values = { ...homeForm(), reservationEnabled: true, reservationHours: '8' };

    expect(schema.safeParse(values).data?.reservationHours).toBe(8);
    expect(paths(schema.safeParse({ ...values, reservationHours: '30' }))).toEqual([
      'reservationHours',
    ]);
  });
});

describe('toDeliveryFormValues', () => {
  it('restores a saved draft into the form', () => {
    const draft = checkoutDeliverySchema.parse(toDeliveryInput(homeForm()));

    expect(toDeliveryFormValues(draft)).toEqual(homeForm());
  });
});
