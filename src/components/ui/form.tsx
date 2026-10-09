import type { ComponentProps, ReactNode } from 'react'

// Styled form controls for the design system. Real forms (contact form, build step 5) validate on
// the server; these components only handle presentation and accessible labelling.

const control =
  'block w-full min-h-11 rounded-lg border border-line-strong bg-white px-3 py-2 text-base text-ink aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger'

export function Input({ className = '', ...rest }: ComponentProps<'input'>) {
  return <input className={`${control} ${className}`} {...rest} />
}

export function Textarea({ className = '', ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={`${control} min-h-32 ${className}`} {...rest} />
}

export function Select({ className = '', ...rest }: ComponentProps<'select'>) {
  return <select className={`${control} ${className}`} {...rest} />
}

type FieldProps = {
  id: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  /** Renders the control, given the ids it must reference for its hint and error. */
  children: (control: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
}

/** Label, optional hint and error message, wired to the control with aria-describedby. */
export function Field({ id, label, hint, error, required, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-ink">
        {label}
        {required ? <span className="font-normal text-ink-muted"> (required)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-semibold text-danger">
          <span className="sr-only">Error: </span>
          {error}
        </p>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
    </div>
  )
}
