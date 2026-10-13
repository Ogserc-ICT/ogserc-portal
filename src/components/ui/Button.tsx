import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'outline-on-dark'

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-base font-semibold transition duration-200 hover:shadow-md motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0'

// Gold is for buttons and accents only; text on gold is always the dark neutral (ink).
const variants: Record<ButtonVariant, string> = {
  primary: 'border border-gold-500 bg-gold-400 text-ink hover:bg-gold-500',
  secondary: 'bg-green-700 text-white hover:bg-green-900',
  outline: 'border-2 border-green-700 text-green-700 hover:bg-green-50',
  'outline-on-dark': 'border-2 border-white text-white hover:bg-white hover:text-green-900',
}

export const buttonClasses = (variant: ButtonVariant = 'primary', extra = '') =>
  [base, variants[variant], extra].filter(Boolean).join(' ')

type ButtonLinkProps = {
  href: string
  variant?: ButtonVariant
  className?: string
  children: ReactNode
}

export function ButtonLink({ href, variant, className, children }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses(variant, className)}>
      {children}
    </Link>
  )
}

type ButtonProps = ComponentProps<'button'> & { variant?: ButtonVariant }

export function Button({ variant, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...rest} />
}
