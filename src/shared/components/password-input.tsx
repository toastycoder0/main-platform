'use client';

import { EyeIcon, EyeOffIcon } from 'lucide-react';
import * as React from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/components/input-group';
import { cn } from '@/shared/utils/cn';

const PasswordInput = ({ className, ...props }: React.ComponentProps<'input'>) => {
  const [show, setShow] = React.useState(false);

  const handleToggle = () => setShow(!show);

  return (
    <InputGroup>
      <InputGroupInput type={show ? 'text' : 'password'} className={cn(className)} {...props} />
      <InputGroupAddon align='inline-end'>
        <InputGroupButton size='icon-xs' onClick={handleToggle}>
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
};

export { PasswordInput };
