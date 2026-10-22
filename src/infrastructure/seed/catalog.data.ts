// Demo catalog used by `pnpm db:seed`. Products intentionally cover every
// configuration path: simple, multi-variant, formula pricing with options,
// docs, related/complement links, multi price lists and non-public statuses.

export interface SeedBrand {
  slug: string;
  name: string;
  description: string;
  color: string;
}

export interface SeedTag {
  slug: string;
  name: string;
}

export interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  color: string;
  children?: SeedCategory[];
}

export interface SeedVariantOption {
  key: string;
  label: string;
  type: 'short_text' | 'long_text' | 'number' | 'select';
  selectOptions?: string[];
  isRequired?: boolean;
  minValue?: number;
  maxValue?: number;
  helpText?: string;
}

export interface SeedVariant {
  code: string;
  title: string;
  unitSlug?: string;
  managesInventory?: boolean;
  minOrderQty?: number;
  incrementQty?: number;
  leadTimeDays?: number;
  pricingModel?: 'flat' | 'formula';
  priceFormula?: string;
  options?: SeedVariantOption[];
}

export interface SeedProductImage {
  color: string;
  altText: string;
  variantCode?: string;
  details?: boolean;
}

export interface SeedProductDocument {
  documentTypeSlug: string;
  label: string;
}

export interface SeedDetail {
  group?: string;
  label: string;
  value: string;
}

export interface SeedPrice {
  listSlug: string;
  amount: number;
}

export interface SeedProduct {
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  code: string | null;
  brandSlug: string | null;
  unitSlug: string;
  cost: number | null;
  satUnit: string | null;
  taxObject: string | null;
  taxName: string | null;
  taxRate: number | null;
  status: 'active' | 'inactive' | 'warehouse_only' | 'unlisted';
  tagSlugs: string[];
  categoryPaths: string[];
  details: SeedDetail[];
  prices: SeedPrice[];
  variants: SeedVariant[];
  images: SeedProductImage[];
  documents: SeedProductDocument[];
  relatedSlugs: string[];
  complementarySlugs: string[];
}

export const SEED_BRANDS: SeedBrand[] = [
  {
    slug: 'acrag',
    name: 'Acrag',
    description: 'Pinturas y recubrimientos de alto rendimiento.',
    color: '#E4572E',
  },
  {
    slug: 'cemixa',
    name: 'Cemixa',
    description: 'Cementos, morteros y adhesivos de construcción.',
    color: '#2E86AB',
  },
  {
    slug: 'ferrotek',
    name: 'Ferrotek',
    description: 'Herramienta profesional y equipos de aplicación.',
    color: '#6B7280',
  },
  {
    slug: 'ceramica-nova',
    name: 'Cerámica Nova',
    description: 'Azulejos, mosaicos y recubrimientos cerámicos.',
    color: '#8E44AD',
  },
  {
    slug: 'maderland',
    name: 'Maderland',
    description: 'Tableros y derivados de madera trabajados a la medida.',
    color: '#A0785A',
  },
];

export const SEED_TAGS: SeedTag[] = [
  { slug: 'nuevo', name: 'Nuevo' },
  { slug: 'promocion', name: 'Promoción' },
  { slug: 'destacado', name: 'Destacado' },
  { slug: 'ecologico', name: 'Ecológico' },
  { slug: 'premium', name: 'Premium' },
  { slug: 'liquidacion', name: 'Liquidación' },
];

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    slug: 'pinturas',
    name: 'Pinturas y recubrimientos',
    description: 'Pinturas, barnices y recubrimientos para todo tipo de superficies.',
    color: '#E4572E',
    children: [
      {
        slug: 'interior',
        name: 'Interior',
        description: 'Pinturas formuladas para espacios interiores.',
        color: '#F08A5D',
      },
      {
        slug: 'exterior',
        name: 'Exterior',
        description: 'Pinturas resistentes a intemperie y radiación UV.',
        color: '#D64550',
      },
      {
        slug: 'barnices',
        name: 'Barnices',
        description: 'Barnices protectores para madera y metal.',
        color: '#C98B2E',
      },
    ],
  },
  {
    slug: 'recubrimientos',
    name: 'Recubrimientos',
    description: 'Azulejos, mosaicos y piedra para pisos y muros.',
    color: '#2E86AB',
    children: [
      {
        slug: 'azulejos',
        name: 'Azulejos',
        description: 'Azulejos cerámicos para cocinas y baños.',
        color: '#4FA3C7',
      },
      {
        slug: 'mosaicos',
        name: 'Mosaicos',
        description: 'Mosaicos decorativos y recreativos.',
        color: '#5B8FB9',
      },
      {
        slug: 'piedra',
        name: 'Piedra',
        description: 'Piedra natural y artificial para acabados.',
        color: '#7A8B99',
      },
    ],
  },
  {
    slug: 'construccion',
    name: 'Construcción y estructura',
    description: 'Materiales estructurales y de obra gruesa.',
    color: '#55606B',
    children: [
      {
        slug: 'cementos',
        name: 'Cementos',
        description: 'Cementos estructurados y de uso general.',
        color: '#6B7280',
      },
      {
        slug: 'morteros',
        name: 'Morteros',
        description: 'Morteros premezclados y adhesivos.',
        color: '#7C8B97',
      },
      {
        slug: 'aislantes',
        name: 'Aislantes',
        description: 'Aislantes térmicos e impermeables.',
        color: '#3E7CB1',
      },
    ],
  },
  {
    slug: 'madera',
    name: 'Madera y derivados',
    description: 'Tableros, contrachapados y productos de madera.',
    color: '#A0785A',
    children: [
      {
        slug: 'tablas',
        name: 'Tablas',
        description: 'Tablas macizas listas para trabajo.',
        color: '#B08A66',
      },
      {
        slug: 'contrachapado',
        name: 'Contrachapado',
        description: 'Tableros contrachapados y terpelizados.',
        color: '#8C6849',
      },
    ],
  },
  {
    slug: 'herramientas',
    name: 'Herramientas',
    description: 'Herramienta manual, accesorios y equipos.',
    color: '#6B7280',
    children: [
      {
        slug: 'manuales',
        name: 'Manuales',
        description: 'Herramienta de mano para obra y taller.',
        color: '#8899A6',
      },
      {
        slug: 'accesorios',
        name: 'Accesorios',
        description: 'Accesorios y consumibles para herramientas.',
        color: '#9AA5B1',
      },
      {
        slug: 'equipo',
        name: 'Equipo',
        description: 'Equipos eléctricos y de aplicación.',
        color: '#55606B',
      },
    ],
  },
];

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    slug: 'pintura-vinilo-blanco',
    title: 'Pintura de Vinilo Blanco',
    subtitle: 'Lavable para interiores',
    description:
      'Pintura de vinilo base agua, ideal para muros y techos interiores. Excelente poder cubridor y acabado mate uniforme.',
    code: 'PVB-20',
    brandSlug: 'acrag',
    unitSlug: 'bucket',
    cost: 180,
    satUnit: 'XBJ',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: ['destacado'],
    categoryPaths: ['pinturas/interior'],
    details: [
      { group: 'Presentación', label: 'Volumen', value: '20 L' },
      { group: 'Rendimiento', label: 'Cobertura', value: '12 m² por litro' },
      { group: 'Aplicación', label: 'Tiempo de secado', value: '4 horas' },
    ],
    prices: [{ listSlug: 'a', amount: 420 }],
    variants: [
      {
        code: 'PVB-20',
        title: 'Cubeta 20 L',
        managesInventory: false,
        pricingModel: 'flat',
      },
    ],
    images: [{ color: '#F5F0E8', altText: 'Cubeta de pintura de vinilo blanco' }],
    documents: [],
    relatedSlugs: [],
    complementarySlugs: [],
  },
  {
    slug: 'pintura-acrilica-texturizada',
    title: 'Pintura Acrílica Texturizada',
    subtitle: 'Acabado texturizado para fachadas',
    description:
      'Pintura acrílica texturizada de alta resistencia para fachadas. Disponible en tres tonos standard.',
    code: 'PAT-20',
    brandSlug: 'acrag',
    unitSlug: 'can',
    cost: 310,
    satUnit: 'H87',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: ['nuevo', 'destacado'],
    categoryPaths: ['pinturas/exterior'],
    details: [
      { group: 'Presentación', label: 'Volumen', value: '19 L' },
      { group: 'Rendimiento', label: 'Cobertura', value: '8 m² por litro' },
    ],
    prices: [
      { listSlug: 'a', amount: 560 },
      { listSlug: 'b', amount: 530 },
    ],
    variants: [
      { code: 'PAT-BR', title: 'Blanco', managesInventory: false, pricingModel: 'flat' },
      { code: 'PAT-NG', title: 'Negro', managesInventory: false, pricingModel: 'flat' },
      { code: 'PAT-GR', title: 'Gris', managesInventory: false, pricingModel: 'flat' },
    ],
    images: [
      { color: '#D9D2C5', altText: 'Lata de pintura acrílica texturizada' },
      { color: '#F5F5F0', altText: 'Acabado texturizado en tono blanco', variantCode: 'PAT-BR' },
    ],
    documents: [],
    relatedSlugs: ['pintura-vinilo-blanco'],
    complementarySlugs: [],
  },
  {
    slug: 'tablero-terpelizado-medida',
    title: 'Tablero Terpelizado a la Medida',
    subtitle: 'Corte y acabado según tus dimensiones',
    description:
      'Tablero contrachapado terpelizado cortado a la medida del proyecto. El precio se calcula por superficie según las dimensiones capturadas.',
    code: 'TTP-M2',
    brandSlug: 'maderland',
    unitSlug: 'm2',
    cost: 190,
    satUnit: 'MTK',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: ['premium'],
    categoryPaths: ['madera/contrachapado'],
    details: [
      { group: 'Material', label: 'Tipo', value: 'Contrachapado terpelizado' },
      { group: 'Acabado', label: 'Cara', value: 'Dos caras terpelizadas' },
    ],
    prices: [{ listSlug: 'a', amount: 310 }],
    variants: [
      {
        code: 'TTP-M2',
        title: 'Corte a medida',
        unitSlug: 'm2',
        managesInventory: false,
        pricingModel: 'formula',
        priceFormula: 'option.largo_m * option.ancho_m * base_price',
        options: [
          {
            key: 'largo_m',
            label: 'Largo (m)',
            type: 'number',
            isRequired: true,
            minValue: 0.1,
            maxValue: 6,
            helpText: 'Entre 0.1 y 6 metros',
          },
          {
            key: 'ancho_m',
            label: 'Ancho (m)',
            type: 'number',
            isRequired: true,
            minValue: 0.1,
            maxValue: 2.4,
          },
          {
            key: 'grosor_mm',
            label: 'Grosor',
            type: 'select',
            selectOptions: ['15 mm', '18 mm', '25 mm'],
            isRequired: true,
          },
        ],
      },
    ],
    images: [{ color: '#A0785A', altText: 'Tablero terpelizado listo para corte' }],
    documents: [
      { documentTypeSlug: 'technical_information', label: 'Ficha técnica del tablero terpelizado' },
    ],
    relatedSlugs: [],
    complementarySlugs: [],
  },
  {
    slug: 'azulejo-cuadrico-30x30',
    title: 'Azulejo Cuádrico 30×30',
    subtitle: 'Acabado brillante para interiores',
    description:
      'Azulejo cerámico cuádrico de 30×30 cm con acabado brillante. Ideal para cocinas y baños.',
    code: 'AZC-3030',
    brandSlug: 'ceramica-nova',
    unitSlug: 'm2',
    cost: 95,
    satUnit: 'MTK',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: [],
    categoryPaths: ['recubrimientos/azulejos'],
    details: [
      { group: 'Dimensiones', label: 'Tamaño', value: '30 × 30 cm' },
      { group: 'Presentación', label: 'Contenido por caja', value: '1.44 m²' },
      { group: 'Acabado', label: 'Superficie', value: 'Brillante' },
    ],
    prices: [
      { listSlug: 'a', amount: 210 },
      { listSlug: 'b', amount: 199 },
      { listSlug: 'c', amount: 185 },
    ],
    variants: [
      {
        code: 'AZC-3030-CAJA',
        title: 'Caja 1.44 m²',
        unitSlug: 'package',
        managesInventory: false,
        pricingModel: 'flat',
      },
    ],
    images: [{ color: '#4FA3C7', altText: 'Azulejo cuádrico azul en muro de cocina' }],
    documents: [
      { documentTypeSlug: 'technical_information', label: 'Ficha técnica del azulejo cuádrico' },
      { documentTypeSlug: 'installation', label: 'Guía de instalación del azulejo cuádrico' },
    ],
    relatedSlugs: ['mosaico-recreativo-2x2'],
    complementarySlugs: [],
  },
  {
    slug: 'mosaico-recreativo-2x2',
    title: 'Mosaico Recreativo 2×2',
    subtitle: 'Diseño decorativo por módulos',
    description:
      'Mosaico recreativo de 2×2 cm en tonos variados. Requiere adhesivo específico para mejor adherencia.',
    code: 'MR-22',
    brandSlug: 'ceramica-nova',
    unitSlug: 'm2',
    cost: 180,
    satUnit: 'MTK',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: ['promocion'],
    categoryPaths: ['recubrimientos/mosaicos'],
    details: [
      { group: 'Dimensiones', label: 'Módulo', value: '2 × 2 cm' },
      { group: 'Presentación', label: 'Contenido por caja', value: '1 m²' },
    ],
    prices: [{ listSlug: 'a', amount: 340 }],
    variants: [
      {
        code: 'MR-22-CAJA',
        title: 'Caja 1 m²',
        unitSlug: 'package',
        managesInventory: false,
        pricingModel: 'flat',
      },
    ],
    images: [{ color: '#5B8FB9', altText: 'Mosaico recreativo azul en piso de baño' }],
    documents: [],
    relatedSlugs: [],
    complementarySlugs: ['pegazulejo-sintetico'],
  },
  {
    slug: 'pegazulejo-sintetico',
    title: 'Pegazulejo Sintético',
    subtitle: 'Adhesivo de alta adherencia',
    description:
      'Pegazulejo sintético de fraguado rápido para instalación de azulejos y mosaicos en muro.',
    code: 'PGZ-20',
    brandSlug: 'cemixa',
    unitSlug: 'sack',
    cost: 140,
    satUnit: 'SA',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: [],
    categoryPaths: ['construccion/morteros', 'recubrimientos/azulejos'],
    details: [
      { group: 'Presentación', label: 'Peso', value: '20 kg' },
      { group: 'Rendimiento', label: 'Cobertura', value: '4 m² por saco' },
    ],
    prices: [{ listSlug: 'a', amount: 260 }],
    variants: [
      {
        code: 'PGZ-20-SACO',
        title: 'Saco 20 kg',
        managesInventory: false,
        pricingModel: 'flat',
      },
    ],
    images: [{ color: '#2E86AB', altText: 'Saco de pegazulejo sintético' }],
    documents: [
      {
        documentTypeSlug: 'technical_information',
        label: 'Ficha técnica del pegazulejo sintético',
      },
    ],
    relatedSlugs: [],
    complementarySlugs: [],
  },
  {
    slug: 'cemento-structural-50',
    title: 'Cemento Estructural SMP-50',
    subtitle: 'Alta resistencia para obra gruesa',
    description:
      'Cemento estructural de alta resistencia para fundiciones, columnas y elementos estructurales.',
    code: 'CEM-50',
    brandSlug: 'cemixa',
    unitSlug: 'sack',
    cost: 110,
    satUnit: 'SA',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: ['destacado', 'premium'],
    categoryPaths: ['construccion/cementos'],
    details: [
      { group: 'Presentación', label: 'Peso', value: '50 kg' },
      { group: 'Resistencia', label: 'Compresión a 28 días', value: '42.5 MPa' },
      { group: 'Almacenamiento', label: 'Vida en almacén', value: '6 meses en lugar seco' },
    ],
    prices: [
      { listSlug: 'a', amount: 185 },
      { listSlug: 'b', amount: 175 },
      { listSlug: 'c', amount: 168 },
    ],
    variants: [
      {
        code: 'CEM-50-SACO',
        title: 'Saco 50 kg',
        managesInventory: false,
        pricingModel: 'flat',
      },
      {
        code: 'CEM-50-PALET',
        title: 'Palet 40 sacos',
        unitSlug: 'package',
        managesInventory: false,
        minOrderQty: 2,
        incrementQty: 2,
        leadTimeDays: 3,
        pricingModel: 'flat',
      },
    ],
    images: [
      { color: '#6B7280', altText: 'Palet de cemento estructural SMP-50' },
      { color: '#9CA3AF', altText: 'Aplicación de cemento estructural en columna', details: true },
    ],
    documents: [{ documentTypeSlug: 'certifications', label: 'Certificado de calidad del SMP-50' }],
    relatedSlugs: [],
    complementarySlugs: [],
  },
  {
    slug: 'rodillo-epoxico-25',
    title: 'Rodillo Epóxico 25 cm',
    subtitle: 'Para pisos epóxicos y recubrimientos',
    description:
      'Rodillo de pelo corto para aplicación de recubrimientos epóxicos. Mangue larga para trabajar de pie.',
    code: 'REP-25',
    brandSlug: 'ferrotek',
    unitSlug: 'piece',
    cost: 70,
    satUnit: 'H87',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: ['nuevo'],
    categoryPaths: ['herramientas/manuales'],
    details: [
      { group: 'Dimensiones', label: 'Ancho de rodada', value: '25 cm' },
      { group: 'Material', label: 'Pelo', value: 'Poliéster corto' },
    ],
    prices: [{ listSlug: 'a', amount: 145 }],
    variants: [
      {
        code: 'REP-25',
        title: 'Pieza',
        managesInventory: false,
        leadTimeDays: 3,
        pricingModel: 'flat',
      },
    ],
    images: [{ color: '#F08A5D', altText: 'Rodillo epóxico de 25 cm con mango largo' }],
    documents: [],
    relatedSlugs: [],
    complementarySlugs: [],
  },
  {
    slug: 'aislante-teflon-liquido',
    title: 'Aislante Líquido Teflón',
    subtitle: 'Impermeabilizante de aplicación directa',
    description:
      'Aislante líquido base teflón para impermeabilizar muros y cubiertas. El precio se calcula por superficie y tipo de tratamiento.',
    code: 'ALT-L',
    brandSlug: 'cemixa',
    unitSlug: 'gallon',
    cost: 60,
    satUnit: 'GLL',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: ['ecologico'],
    categoryPaths: ['construccion/aislantes', 'pinturas/exterior'],
    details: [
      { group: 'Presentación', label: 'Volumen', value: '1 galón' },
      { group: 'Rendimiento', label: 'Cobertura', value: '6 m² por galón' },
    ],
    prices: [{ listSlug: 'a', amount: 95 }],
    variants: [
      {
        code: 'ALT-L',
        title: 'Aplicación por superficie',
        unitSlug: 'm2',
        managesInventory: false,
        pricingModel: 'formula',
        priceFormula: 'cost * 1.4 + option.superficie_m2 * base_price',
        options: [
          {
            key: 'superficie_m2',
            label: 'Superficie a aislar (m²)',
            type: 'number',
            isRequired: true,
            minValue: 1,
            maxValue: 5000,
          },
          {
            key: 'tipo',
            label: 'Tipo de tratamiento',
            type: 'select',
            selectOptions: ['Impermeable', 'Ignífugo', 'Térmico'],
            isRequired: true,
          },
        ],
      },
    ],
    images: [{ color: '#3E7CB1', altText: 'Aplicación de aislante líquido teflón en cubierta' }],
    documents: [
      { documentTypeSlug: 'maintenance', label: 'Protocolo de mantenimiento del aislante' },
    ],
    relatedSlugs: [],
    complementarySlugs: [],
  },
  {
    slug: 'piedra-natural-slip-not',
    title: 'Piedra Natural Slip-Not',
    subtitle: 'Antiderrapante para áreas húmedas',
    description:
      'Piedra natural tallada con acabado antiderrapante. Venta por volumen desde almacén.',
    code: 'PNS-M2',
    brandSlug: null,
    unitSlug: 'm2',
    cost: 520,
    satUnit: 'MTK',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'warehouse_only',
    tagSlugs: ['liquidacion'],
    categoryPaths: ['recubrimientos/piedra'],
    details: [
      { group: 'Dimensiones', label: 'Espesor', value: '2 cm' },
      { group: 'Acabado', label: 'Superficie', value: 'Antiderrapante' },
    ],
    prices: [{ listSlug: 'a', amount: 890 }],
    variants: [
      {
        code: 'PNS-M2',
        title: 'Metro cuadrado',
        managesInventory: false,
        pricingModel: 'flat',
      },
    ],
    images: [{ color: '#7A8B99', altText: 'Piedra natural antiderrapante en área húmeda' }],
    documents: [],
    relatedSlugs: [],
    complementarySlugs: [],
  },
  {
    slug: 'esmalte-sintetico-brillo',
    title: 'Esmalte Sintético Brillante',
    subtitle: 'Acabado brillante y resistente',
    description:
      'Esmalte sintético base solvente con acabado brillante de alta adherencia. Indicado para madera y metal en interior y exterior.',
    code: 'ESB-40',
    brandSlug: 'acrag',
    unitSlug: 'can',
    cost: 165,
    satUnit: 'H87',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: ['destacado'],
    categoryPaths: ['pinturas/interior'],
    details: [
      { group: 'Presentación', label: 'Volumen', value: '4 L' },
      { group: 'Aplicación', label: 'Herramienta', value: 'Pincel o rodillo' },
      { group: 'Aplicación', label: 'Tiempo de secado', value: '6 horas' },
    ],
    prices: [
      { listSlug: 'a', amount: 285 },
      { listSlug: 'b', amount: 270 },
    ],
    variants: [
      { code: 'ESB-BL', title: 'Blanco', managesInventory: true, pricingModel: 'flat' },
      { code: 'ESB-NG', title: 'Negro', managesInventory: true, pricingModel: 'flat' },
      { code: 'ESB-RJ', title: 'Rojo óxido', managesInventory: true, pricingModel: 'flat' },
    ],
    images: [{ color: '#EDEDE8', altText: 'Lata de esmalte sintético brillante en tono blanco' }],
    documents: [],
    relatedSlugs: [],
    complementarySlugs: [],
  },
  {
    slug: 'barniz-marino-premium',
    title: 'Barniz Marino Premium',
    subtitle: 'Protección para madera expuesta',
    description:
      'Barniz marino de alta resistencia a la humedad y la radiación UV, formulado para madera en terrazas, barcos y exteriores.',
    code: 'BMP-38',
    brandSlug: 'acrag',
    unitSlug: 'gallon',
    cost: 300,
    satUnit: 'GLL',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: ['premium'],
    categoryPaths: ['pinturas/barnices'],
    details: [
      { group: 'Presentación', label: 'Volumen', value: '3.78 L (1 galón)' },
      { group: 'Rendimiento', label: 'Cobertura', value: '14 m² por galón' },
      { group: 'Aplicación', label: 'Manos recomendadas', value: '2 manos' },
    ],
    prices: [{ listSlug: 'a', amount: 520 }],
    variants: [
      { code: 'BMP-38', title: 'Galón 3.78 L', managesInventory: true, pricingModel: 'flat' },
    ],
    images: [{ color: '#B5844A', altText: 'Galón de barniz marino premium' }],
    documents: [
      { documentTypeSlug: 'maintenance', label: 'Protocolo de mantenimiento del barniz marino' },
    ],
    relatedSlugs: [],
    complementarySlugs: [],
  },
  {
    slug: 'tornillo-madera-acero',
    title: 'Tornillo para Madera de Acero Galvanizado',
    subtitle: 'Cabeza ranurada, punta mecha',
    description:
      'Tornillo para madera de acero galvanizado con cabeza ranurada y punta mecha. Presentado en caja surtida por longitud.',
    code: 'TMA-CJ',
    brandSlug: 'ferrotek',
    unitSlug: 'box',
    cost: 55,
    satUnit: 'H87',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: ['promocion'],
    categoryPaths: ['herramientas/accesorios'],
    details: [
      { group: 'Material', label: 'Acabado', value: 'Acero galvanizado' },
      { group: 'Presentación', label: 'Contenido', value: 'Caja de 200 piezas' },
    ],
    prices: [{ listSlug: 'a', amount: 95 }],
    variants: [
      { code: 'TMA-100', title: '1 pulgada', managesInventory: true, pricingModel: 'flat' },
      { code: 'TMA-200', title: '2 pulgadas', managesInventory: true, pricingModel: 'flat' },
      { code: 'TMA-300', title: '3 pulgadas', managesInventory: true, pricingModel: 'flat' },
    ],
    images: [{ color: '#A9AFB6', altText: 'Caja de tornillos de acero galvanizado para madera' }],
    documents: [],
    relatedSlugs: [],
    complementarySlugs: [],
  },
  {
    slug: 'guante-carnaza-reforzado',
    title: 'Guante de Carnaza Reforzado',
    subtitle: 'Protección para obra y taller',
    description:
      'Guante de carnaza de res con costura reforzada y puño elástico, indicado para manejo de materiales y herramienta manual.',
    code: 'GCR-PAR',
    brandSlug: 'ferrotek',
    unitSlug: 'piece',
    cost: 38,
    satUnit: 'H87',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: ['nuevo'],
    categoryPaths: ['herramientas/manuales'],
    details: [
      { group: 'Material', label: 'Material', value: 'Carnaza de res' },
      { group: 'Presentación', label: 'Empaque', value: 'Par (2 piezas)' },
    ],
    prices: [{ listSlug: 'a', amount: 68 }],
    variants: [
      { code: 'GCR-CH', title: 'Chico', managesInventory: true, pricingModel: 'flat' },
      { code: 'GCR-MD', title: 'Mediano', managesInventory: true, pricingModel: 'flat' },
      { code: 'GCR-GR', title: 'Grande', managesInventory: true, pricingModel: 'flat' },
    ],
    images: [{ color: '#C89A6B', altText: 'Par de guantes de carnaza reforzada' }],
    documents: [],
    relatedSlugs: [],
    complementarySlugs: [],
  },
  {
    slug: 'lija-al-agua-grano-320',
    title: 'Lija al Agua Grano 320',
    subtitle: 'Acabado fino en húmedo',
    description:
      'Lija al agua de grano fino para lijado en húmedo de pintura, masilla y acabados finos. Hoja estándar de 23 × 28 cm.',
    code: 'LAG-320',
    brandSlug: 'ferrotek',
    unitSlug: 'package',
    cost: 7,
    satUnit: 'H87',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: [],
    categoryPaths: ['herramientas/accesorios'],
    details: [
      { group: 'Abrasionivo', label: 'Grano', value: '320' },
      { group: 'Presentación', label: 'Contenido', value: '10 hojas' },
    ],
    prices: [{ listSlug: 'a', amount: 12 }],
    variants: [
      { code: 'LAG-320', title: 'Paquete 10 hojas', managesInventory: true, pricingModel: 'flat' },
    ],
    images: [{ color: '#8E9BA8', altText: 'Paquete de lija al agua grano 320' }],
    documents: [],
    relatedSlugs: [],
    complementarySlugs: [],
  },
  {
    slug: 'cal-hidratada-mamposteria',
    title: 'Cal Hidratada de Mampostería',
    subtitle: 'Agrego para morteros y revestimientos',
    description:
      'Cal hidratada de alta pureza para morteros, aplanados y revestimientos. Buen trabajabilidad y excelentes propiedades plásticas.',
    code: 'CHM-25',
    brandSlug: 'cemixa',
    unitSlug: 'sack',
    cost: 42,
    satUnit: 'SA',
    taxObject: '02',
    taxName: 'IVA',
    taxRate: 16,
    status: 'active',
    tagSlugs: ['ecologico'],
    categoryPaths: ['construccion/morteros'],
    details: [
      { group: 'Presentación', label: 'Peso', value: '25 kg' },
      { group: 'Composición', label: 'Pureza', value: '92 % mínimo' },
    ],
    prices: [{ listSlug: 'a', amount: 74 }],
    variants: [
      { code: 'CHM-25', title: 'Saco 25 kg', managesInventory: true, pricingModel: 'flat' },
    ],
    images: [{ color: '#E4E7EA', altText: 'Saco de cal hidratada de mampostería' }],
    documents: [],
    relatedSlugs: [],
    complementarySlugs: [],
  },
];
