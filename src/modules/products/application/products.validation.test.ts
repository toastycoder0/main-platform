import { describe, expect, it } from 'vitest';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import {
  createProductSchema,
  MAX_DETAILS,
  MAX_DOCUMENTS,
  productFormSchema,
  productParamsSchema,
  updateProductSchema,
} from './products.validation';
import { MAX_VARIANTS } from './products.variants';

function variant(overrides: Record<string, unknown> = {}) {
  return {
    clientId: 'v1',
    title: 'Estándar',
    code: 'SKU-1',
    unitId: null,
    isActive: true,
    managesInventory: true,
    minOrderQty: 1,
    incrementQty: 1,
    leadTimeDays: 0,
    pricingModel: 'flat',
    priceFormula: '',
    options: [],
    ...overrides,
  };
}

function validProduct(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Playera',
    unitId: 'unit_1',
    baseCurrency: 'MXN',
    status: 'active',
    variants: [variant()],
    ...overrides,
  };
}

function messagesAt(result: ReturnType<typeof createProductSchema.safeParse>, path: string) {
  if (result.success) {
    return [];
  }
  return result.error.issues
    .filter((issue) => issue.path.join('.') === path)
    .map((issue) => issue.message);
}

describe('createProductSchema', () => {
  it('accepts a minimal product and applies collection defaults', () => {
    const result = createProductSchema.safeParse(validProduct());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tagIds).toEqual([]);
      expect(result.data.images).toEqual([]);
      expect(result.data.relatedProducts).toEqual([]);
    }
  });

  it('does not require a slug', () => {
    expect(createProductSchema.safeParse(validProduct()).success).toBe(true);
  });

  it('requires title, unit and base currency', () => {
    const result = createProductSchema.safeParse(
      validProduct({ title: '  ', unitId: '', baseCurrency: '' }),
    );

    expect(messagesAt(result, 'title')).toContain(FIELD_ERRORS.required);
    expect(messagesAt(result, 'unitId')).toContain(FIELD_ERRORS.required);
    expect(messagesAt(result, 'baseCurrency')).toContain(FIELD_ERRORS.required);
  });

  it('rejects unknown statuses', () => {
    expect(createProductSchema.safeParse(validProduct({ status: 'draft' })).success).toBe(false);
  });

  it.each(['active', 'inactive', 'warehouse_only'])('accepts the %s status', (status) => {
    expect(createProductSchema.safeParse(validProduct({ status })).success).toBe(true);
  });

  it('limits text lengths', () => {
    const result = createProductSchema.safeParse(
      validProduct({ title: 'a'.repeat(201), subtitle: 'a'.repeat(501), code: 'a'.repeat(101) }),
    );

    expect(messagesAt(result, 'title')).toContain(FIELD_ERRORS.tooLong);
    expect(messagesAt(result, 'subtitle')).toContain(FIELD_ERRORS.tooLong);
    expect(messagesAt(result, 'code')).toContain(FIELD_ERRORS.tooLong);
  });

  it('trims the title', () => {
    const result = createProductSchema.safeParse(validProduct({ title: '  Playera  ' }));
    expect(result.success && result.data.title).toBe('Playera');
  });

  describe('cost and tax', () => {
    it('accepts a cost together with its currency', () => {
      expect(
        createProductSchema.safeParse(validProduct({ cost: 10.5, costCurrency: 'USD' })).success,
      ).toBe(true);
    });

    it('accepts a zero cost and a zero tax rate', () => {
      expect(
        createProductSchema.safeParse(validProduct({ cost: 0, costCurrency: 'MXN', taxRate: 0 }))
          .success,
      ).toBe(true);
    });

    it('requires the cost currency when there is a cost', () => {
      const result = createProductSchema.safeParse(validProduct({ cost: 10 }));

      expect(messagesAt(result, 'cost')).toContain(
        'Costo y moneda de costo deben completarse ambos',
      );
      expect(messagesAt(result, 'costCurrency')).toHaveLength(1);
    });

    it('requires the cost when there is a cost currency', () => {
      const result = createProductSchema.safeParse(validProduct({ costCurrency: 'USD' }));
      expect(messagesAt(result, 'cost')).toHaveLength(1);
    });

    it('treats null cost and null currency as empty', () => {
      expect(
        createProductSchema.safeParse(validProduct({ cost: null, costCurrency: null })).success,
      ).toBe(true);
    });

    it('rejects negative amounts and out-of-range rates', () => {
      expect(
        createProductSchema.safeParse(validProduct({ cost: -1, costCurrency: 'MXN' })).success,
      ).toBe(false);
      expect(createProductSchema.safeParse(validProduct({ taxRate: -1 })).success).toBe(false);
      expect(createProductSchema.safeParse(validProduct({ taxRate: 100.01 })).success).toBe(false);
    });

    it('does not coerce an empty string into zero', () => {
      expect(
        createProductSchema.safeParse(validProduct({ cost: '', costCurrency: null })).success,
      ).toBe(false);
    });
  });

  describe('variants', () => {
    it('requires at least one variant', () => {
      const result = createProductSchema.safeParse(validProduct({ variants: [] }));
      expect(messagesAt(result, 'variants')).toContain(
        'El producto debe tener al menos una variante',
      );
    });

    it('limits the number of variants', () => {
      const variants = Array.from({ length: MAX_VARIANTS + 1 }, (_, i) =>
        variant({ clientId: `v${i}`, code: `SKU-${i}` }),
      );
      expect(createProductSchema.safeParse(validProduct({ variants })).success).toBe(false);
    });

    it('rejects repeated codes ignoring case', () => {
      const result = createProductSchema.safeParse(
        validProduct({
          variants: [variant(), variant({ clientId: 'v2', code: 'sku-1' })],
        }),
      );
      expect(messagesAt(result, 'variants.1.code')).toContain(
        'El código ya está en uso en otra variante',
      );
    });

    it('rejects repeated variant identifiers', () => {
      const result = createProductSchema.safeParse(
        validProduct({ variants: [variant(), variant({ code: 'SKU-2' })] }),
      );
      expect(messagesAt(result, 'variants.1.clientId')).toHaveLength(1);
    });

    it('requires a formula for the formula pricing model', () => {
      const result = createProductSchema.safeParse(
        validProduct({ variants: [variant({ pricingModel: 'formula', priceFormula: '  ' })] }),
      );
      expect(messagesAt(result, 'variants.0.priceFormula')).toContain('La fórmula es requerida');
    });

    it('accepts a formula', () => {
      expect(
        createProductSchema.safeParse(
          validProduct({
            variants: [variant({ pricingModel: 'formula', priceFormula: 'base_price * quantity' })],
          }),
        ).success,
      ).toBe(true);
    });

    it.each([
      ['minOrderQty', 0],
      ['incrementQty', 0],
      ['leadTimeDays', -1],
      ['minOrderQty', 1.5],
    ])('rejects %s = %s', (field, value) => {
      expect(
        createProductSchema.safeParse(validProduct({ variants: [variant({ [field]: value })] }))
          .success,
      ).toBe(false);
    });

    it('rejects an empty variant title or code', () => {
      const result = createProductSchema.safeParse(
        validProduct({ variants: [variant({ title: '', code: '' })] }),
      );
      expect(messagesAt(result, 'variants.0.title')).toContain(FIELD_ERRORS.required);
      expect(messagesAt(result, 'variants.0.code')).toContain(FIELD_ERRORS.required);
    });

    describe('options', () => {
      const option = (overrides: Record<string, unknown> = {}) => ({
        key: 'ancho',
        label: 'Ancho',
        type: 'short_text',
        selectOptions: [],
        isRequired: false,
        ...overrides,
      });
      const withOptions = (options: unknown[]) =>
        validProduct({ variants: [variant({ options })] });

      it('accepts a valid option', () => {
        expect(createProductSchema.safeParse(withOptions([option()])).success).toBe(true);
      });

      it.each(['Ancho', '1ancho', 'ancho-x', 'ancho x', ''])('rejects the key %j', (key) => {
        expect(createProductSchema.safeParse(withOptions([option({ key })])).success).toBe(false);
      });

      it('rejects repeated keys inside a variant', () => {
        const result = createProductSchema.safeParse(withOptions([option(), option()]));
        expect(messagesAt(result, 'variants.0.options.1.key')).toContain(
          'El identificador ya está en uso en esta variante',
        );
      });

      it('requires choices for select options', () => {
        const result = createProductSchema.safeParse(withOptions([option({ type: 'select' })]));
        expect(messagesAt(result, 'variants.0.options.0.selectOptions')).toContain(
          'Agrega al menos una opción a la lista',
        );
      });

      it('accepts select options with choices', () => {
        expect(
          createProductSchema.safeParse(
            withOptions([option({ type: 'select', selectOptions: [{ value: 'Mate' }] })]),
          ).success,
        ).toBe(true);
      });

      it('rejects an inverted number range', () => {
        const result = createProductSchema.safeParse(
          withOptions([option({ type: 'number', minValue: 10, maxValue: 1 })]),
        );
        expect(messagesAt(result, 'variants.0.options.0.maxValue')).toContain(
          'El máximo debe ser mayor o igual al mínimo',
        );
      });

      it('accepts equal bounds and open ranges', () => {
        expect(
          createProductSchema.safeParse(
            withOptions([option({ type: 'number', minValue: 5, maxValue: 5 })]),
          ).success,
        ).toBe(true);
        expect(
          createProductSchema.safeParse(
            withOptions([option({ type: 'number', minValue: null, maxValue: 5 })]),
          ).success,
        ).toBe(true);
      });
    });
  });

  describe('prices', () => {
    it('accepts amounts and empty entries', () => {
      expect(
        createProductSchema.safeParse(
          validProduct({
            prices: [
              { priceListId: 'plst_a', amount: 10 },
              { priceListId: 'plst_b', amount: '' },
              { priceListId: 'plst_c', amount: 0 },
            ],
          }),
        ).success,
      ).toBe(true);
    });

    it('rejects negative amounts', () => {
      const result = createProductSchema.safeParse(
        validProduct({ prices: [{ priceListId: 'plst_a', amount: -1 }] }),
      );
      expect(messagesAt(result, 'prices.0.amount')).toContain(
        'El precio debe ser mayor o igual a 0',
      );
    });

    it('rejects repeated price lists', () => {
      const result = createProductSchema.safeParse(
        validProduct({
          prices: [
            { priceListId: 'plst_a', amount: 1 },
            { priceListId: 'plst_a', amount: 2 },
          ],
        }),
      );
      expect(messagesAt(result, 'prices.1.priceListId')).toHaveLength(1);
    });
  });

  describe('details and documents', () => {
    it('requires label and value for details', () => {
      const result = createProductSchema.safeParse(
        validProduct({ details: [{ label: '', value: '' }] }),
      );
      expect(messagesAt(result, 'details.0.label')).toContain(FIELD_ERRORS.required);
      expect(messagesAt(result, 'details.0.value')).toContain(FIELD_ERRORS.required);
    });

    it('limits the number of details and documents', () => {
      const details = Array.from({ length: MAX_DETAILS + 1 }, () => ({ label: 'a', value: 'b' }));
      const documents = Array.from({ length: MAX_DOCUMENTS + 1 }, () => ({
        documentTypeId: 'dt_1',
        label: 'Ficha',
        isVisible: true,
      }));
      expect(createProductSchema.safeParse(validProduct({ details })).success).toBe(false);
      expect(createProductSchema.safeParse(validProduct({ documents })).success).toBe(false);
    });

    it('requires type and label for documents but not a file', () => {
      expect(
        createProductSchema.safeParse(
          validProduct({
            documents: [{ documentTypeId: 'dt_1', label: 'Ficha', isVisible: true }],
          }),
        ).success,
      ).toBe(true);

      const result = createProductSchema.safeParse(
        validProduct({ documents: [{ documentTypeId: '', label: '', isVisible: true }] }),
      );
      expect(messagesAt(result, 'documents.0.documentTypeId')).toContain(FIELD_ERRORS.required);
      expect(messagesAt(result, 'documents.0.label')).toContain(FIELD_ERRORS.required);
    });

    it('rejects repeated document ids', () => {
      const document = { id: 'pdoc_1', documentTypeId: 'dt_1', label: 'Ficha', isVisible: true };
      const result = createProductSchema.safeParse(
        validProduct({ documents: [document, document] }),
      );
      expect(messagesAt(result, 'documents.1.id')).toHaveLength(1);
    });
  });

  describe('images', () => {
    it('accepts images linked to a variant or to the product', () => {
      expect(
        createProductSchema.safeParse(
          validProduct({
            images: [
              { fileUrl: 'tmp/a.png', isVisible: true, variantId: null },
              { fileUrl: 'tmp/b.png', isVisible: false, variantId: 'v1' },
            ],
          }),
        ).success,
      ).toBe(true);
    });

    it('requires a file', () => {
      const result = createProductSchema.safeParse(
        validProduct({ images: [{ fileUrl: '', isVisible: true }] }),
      );
      expect(messagesAt(result, 'images.0.fileUrl')).toContain(FIELD_ERRORS.required);
    });

    it('rejects images linked to a variant that does not exist', () => {
      const result = createProductSchema.safeParse(
        validProduct({ images: [{ fileUrl: 'tmp/a.png', isVisible: true, variantId: 'gone' }] }),
      );
      expect(messagesAt(result, 'images.0.variantId')).toContain(
        'La variante seleccionada ya no existe',
      );
    });

    it('rejects repeated image ids', () => {
      const image = { id: 'pimg_1', fileUrl: 'tmp/a.png', isVisible: true };
      const result = createProductSchema.safeParse(validProduct({ images: [image, image] }));
      expect(messagesAt(result, 'images.1.id')).toHaveLength(1);
    });
  });

  describe('related and complementary products', () => {
    it('requires a product for related entries and rejects repeats', () => {
      const empty = createProductSchema.safeParse(
        validProduct({ relatedProducts: [{ linkedProductId: '' }] }),
      );
      expect(messagesAt(empty, 'relatedProducts.0.linkedProductId')).toContain(
        FIELD_ERRORS.required,
      );

      const repeated = createProductSchema.safeParse(
        validProduct({
          relatedProducts: [{ linkedProductId: 'prd_1' }, { linkedProductId: 'prd_1' }],
        }),
      );
      expect(messagesAt(repeated, 'relatedProducts.1.linkedProductId')).toContain(
        'Este producto ya fue agregado',
      );
    });

    it('rejects complements pointing at a variant that does not exist', () => {
      const result = createProductSchema.safeParse(
        validProduct({
          complementaryProducts: [{ linkedProductId: 'prd_1', variantId: 'gone' }],
        }),
      );
      expect(messagesAt(result, 'complementaryProducts.0.variantId')).toHaveLength(1);
    });

    it('rejects the same complement combination twice but allows different variants', () => {
      const repeated = createProductSchema.safeParse(
        validProduct({
          complementaryProducts: [
            { linkedProductId: 'prd_1', variantId: null, linkedVariantId: null },
            { linkedProductId: 'prd_1', variantId: null, linkedVariantId: null },
          ],
        }),
      );
      expect(messagesAt(repeated, 'complementaryProducts.1.linkedProductId')).toContain(
        'Esta combinación ya fue agregada',
      );

      expect(
        createProductSchema.safeParse(
          validProduct({
            complementaryProducts: [
              { linkedProductId: 'prd_1', variantId: null, linkedVariantId: null },
              { linkedProductId: 'prd_1', variantId: 'v1', linkedVariantId: null },
              { linkedProductId: 'prd_1', variantId: null, linkedVariantId: 'pitem_9' },
            ],
          }),
        ).success,
      ).toBe(true);
    });
  });
});

describe('updateProductSchema', () => {
  it('requires the product id', () => {
    expect(updateProductSchema.safeParse(validProduct()).success).toBe(false);
    expect(updateProductSchema.safeParse(validProduct({ id: '' })).success).toBe(false);
    expect(updateProductSchema.safeParse(validProduct({ id: 'prd_1' })).success).toBe(true);
  });

  it('runs the same cross-field checks', () => {
    const result = updateProductSchema.safeParse(validProduct({ id: 'prd_1', cost: 5 }));
    expect(result.success).toBe(false);
  });
});

describe('productFormSchema', () => {
  it('accepts a form without id (create) and with id (edit)', () => {
    expect(productFormSchema.safeParse(validProduct()).success).toBe(true);
    expect(productFormSchema.safeParse(validProduct({ id: 'prd_1' })).success).toBe(true);
  });

  it('runs the same cross-field checks', () => {
    expect(productFormSchema.safeParse(validProduct({ costCurrency: 'MXN' })).success).toBe(false);
  });
});

describe('productParamsSchema', () => {
  it('requires a non-empty id', () => {
    expect(productParamsSchema.safeParse({ id: 'prd_1' }).success).toBe(true);
    expect(productParamsSchema.safeParse({ id: '' }).success).toBe(false);
    expect(productParamsSchema.safeParse({}).success).toBe(false);
  });
});
