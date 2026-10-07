export const FIELD_ERRORS = {
  email: 'El correo electrónico no es válido',
  password: 'La contraseña debe tener al menos 8 caracteres',
  required: 'El campo es requerido',
  name: 'El nombre es requerido',
  description: 'La descripción es demasiado larga',
  permissions: 'Debes seleccionar al menos un permiso',
  tooLong: 'El texto excede el número máximo de caracteres',
  postalCode: 'El código postal no es válido (5 dígitos)',
  phone: 'El teléfono no es válido (10 dígitos)',
  rfc: 'El RFC no es válido',
  url: 'La URL no es válida',
  date: 'La fecha no es válida',
} as const;

export const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intenta de nuevo.';
