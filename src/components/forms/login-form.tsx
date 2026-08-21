import { Button } from '@/components/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

export function LoginForm() {
  return (
    <form>
      <FieldSet>
        <FieldGroup>
          <Field orientation='vertical'>
            <FieldLabel>Correo electrónico</FieldLabel>
            <FieldContent>
              <Input type='email' placeholder='tu@correo.com' />
            </FieldContent>
            <FieldDescription>Ingresa el correo asociado a tu cuenta.</FieldDescription>
          </Field>
          <Field orientation='vertical'>
            <FieldLabel>Contraseña</FieldLabel>
            <FieldContent>
              <PasswordInput placeholder='Ingresa tu contraseña' />
            </FieldContent>
          </Field>
        </FieldGroup>
        <Button type='submit' className='w-full'>
          Iniciar sesión
        </Button>
      </FieldSet>
    </form>
  );
}
