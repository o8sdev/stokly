'use client'

import { useFormStatus } from 'react-dom'
import { Button, type ButtonProps } from './button'

// Submit button wired to the enclosing <form>'s pending state via
// useFormStatus (the React 18 pattern that pairs with useFormState). Shows
// `pendingText` while the action runs and is disabled when pending or when the
// caller passes an additional `disabled` condition.
export function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending && pendingText ? pendingText : children}
    </Button>
  )
}
