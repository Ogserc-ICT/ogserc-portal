'use client'

import { Button, toast, useAuth, useConfig, useDocumentInfo } from '@payloadcms/ui'
import { useState } from 'react'

// On another account's screen in the admin panel, for administrators: resets that account's
// two-factor sign-in after a lost or replaced phone (D-084). The server decides who may do it
// (src/lib/auth/reset-two-factor.ts); this only hides the button where it could never work.

export function ResetTwoFactorButton() {
  const { id } = useDocumentInfo()
  const { user } = useAuth<{ id: number | string; roles?: string[] }>()
  const { config } = useConfig()
  const [busy, setBusy] = useState(false)

  const isAdministrator = user?.roles?.includes('administrator') === true
  if (!id || !isAdministrator || String(id) === String(user?.id)) return null

  async function reset() {
    const sure = window.confirm(
      'Reset two-factor sign-in for this account? They will be signed out everywhere, and must set it up again with their authenticator app the next time they sign in.',
    )
    if (!sure) return
    setBusy(true)
    try {
      const response = await fetch(`${config.serverURL}${config.routes.api}/users/${id}/reset-2fa`, {
        method: 'POST',
        credentials: 'include',
      })
      const { message } = (await response.json().catch(() => ({}))) as { message?: string }
      if (response.ok) toast.success(message ?? 'Two-factor sign-in reset.')
      else toast.error(message ?? 'The reset did not work. Try again, or ask another administrator.')
    } catch {
      toast.error('The reset did not work. Check the connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginBlock: '1rem' }}>
      <p>
        <strong>Two-factor sign-in</strong>
        <br />
        Lost or replaced phone? Reset it, and the person sets it up again at their next sign-in.
      </p>
      <Button buttonStyle="secondary" disabled={busy} onClick={reset} type="button">
        {busy ? 'Resetting…' : 'Reset two-factor sign-in'}
      </Button>
    </div>
  )
}
