export interface CfdiOption {
  label: string;
  value: string;
}

export const CFDI_USE_OPTIONS: CfdiOption[] = [
  { label: 'G01 - Adquisición de mercancías', value: 'G01' },
  { label: 'G02 - Devoluciones, descuentos o bonificaciones', value: 'G02' },
  { label: 'G03 - Gastos en general', value: 'G03' },
  { label: 'I01 - Construcciones', value: 'I01' },
  { label: 'I02 - Mobiliario y equipo de oficina para inversiones', value: 'I02' },
  { label: 'I03 - Equipo de transporte', value: 'I03' },
  { label: 'I04 - Equipo de cómputo y accesorios', value: 'I04' },
  { label: 'I05 - Dados, troqueles, moldes, matrices y herramental', value: 'I05' },
  { label: 'I06 - Comunicaciones telefónicas', value: 'I06' },
  { label: 'I07 - Comunicaciones satelitales', value: 'I07' },
  { label: 'I08 - Otra maquinaria y equipo', value: 'I08' },
  { label: 'D01 - Honorarios médicos, dentales y hospitalarios', value: 'D01' },
  { label: 'D02 - Gastos médicos por incapacidad o discapacidad', value: 'D02' },
  { label: 'D03 - Gastos funerales', value: 'D03' },
  { label: 'D04 - Donativos', value: 'D04' },
  { label: 'D05 - Intereses reales pagados por créditos hipotecarios', value: 'D05' },
  { label: 'D06 - Aportaciones voluntarias al SAR', value: 'D06' },
  { label: 'D07 - Primas de seguros de gastos médicos', value: 'D07' },
  { label: 'D08 - Gastos de transportación escolar obligatoria', value: 'D08' },
  { label: 'D09 - Depósitos en cuentas para el ahorro, primas de pensiones', value: 'D09' },
  { label: 'D10 - Pagos por servicios educativos (colegiaturas)', value: 'D10' },
  { label: 'S01 - Sin efectos fiscales', value: 'S01' },
  { label: 'CP01 - Pagos', value: 'CP01' },
  { label: 'CN01 - Nómina', value: 'CN01' },
];

export const FISCAL_REGIME_OPTIONS: CfdiOption[] = [
  { label: '601 - General de Ley Personas Morales', value: '601' },
  { label: '602 - Régimen Simplificado de Ley Personas Morales', value: '602' },
  { label: '603 - Personas Morales con Fines no Lucrativos', value: '603' },
  { label: '604 - Régimen de Pequeños Contribuyentes', value: '604' },
  { label: '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios', value: '605' },
  { label: '606 - Arrendamiento', value: '606' },
  { label: '607 - Régimen de Enajenación o Adquisición de Bienes', value: '607' },
  { label: '608 - Demás ingresos', value: '608' },
  { label: '609 - Régimen de Consolidación', value: '609' },
  {
    label: '610 - Residentes en el Extranjero sin Establecimiento Permanente en México',
    value: '610',
  },
  { label: '611 - Régimen de Ingresos por Dividendos (Socios y Accionistas)', value: '611' },
  {
    label: '612 - Régimen de las Personas Físicas con Actividades Empresariales y Profesionales',
    value: '612',
  },
  {
    label: '613 - Régimen Intermedio de las Personas Físicas con Actividades Empresariales',
    value: '613',
  },
  { label: '614 - Régimen de los Ingresos por Intereses', value: '614' },
  { label: '615 - Régimen de los Ingresos por Obtención de Premios', value: '615' },
  { label: '616 - Sin Obligaciones Fiscales', value: '616' },
  { label: '617 - PEMEX', value: '617' },
  { label: '618 - Régimen Simplificado de Ley Personas Físicas', value: '618' },
  { label: '619 - Ingresos por la Obtención de Préstamos', value: '619' },
  {
    label: '620 - Sociedades Cooperativas de Producción que Optan por Diferir sus Ingresos',
    value: '620',
  },
  { label: '621 - Régimen de Incorporación Fiscal', value: '621' },
  {
    label: '622 - Régimen de Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras PM',
    value: '622',
  },
  { label: '623 - Régimen Opcional Para Grupos de Sociedades', value: '623' },
  { label: '624 - Régimen de los Coordinados', value: '624' },
  {
    label:
      '625 - Régimen de las Actividades Empresariales con Ingresos a Través de Plataformas Tecnológicas',
    value: '625',
  },
  { label: '626 - Régimen Simplificado de Confianza', value: '626' },
];

export function isCfdiUse(value: string): boolean {
  return CFDI_USE_OPTIONS.some((option) => option.value === value);
}

export function isFiscalRegime(value: string): boolean {
  return FISCAL_REGIME_OPTIONS.some((option) => option.value === value);
}
