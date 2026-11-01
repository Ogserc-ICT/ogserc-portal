import type { ReactNode } from 'react'

import type { BankAccount } from '@/lib/notices/public-notices'

/**
 * OGSERC's bank accounts for registration fees, one card per account (a five-column table does not
 * fit a 360px phone). Name, number and bank are bold so they are hard to miss (owner, 2026-11-02).
 */
export function BankAccounts({ accounts }: { accounts: BankAccount[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {accounts.map((account) => (
        <li
          key={account.accountNumber}
          className="rounded-lg border border-line border-l-4 border-l-gold-400 bg-white p-5"
        >
          <dl className="space-y-3">
            <Row label="Account name">
              <span className="font-bold text-green-900">{account.accountName}</span>
            </Row>
            <Row label="Account number">
              <span className="text-2xl font-bold tracking-wider text-green-900 tabular-nums">
                {account.accountNumber}
              </span>
            </Row>
            <Row label="Bank">
              <span className="text-lg font-bold text-green-900">{account.bank}</span>
            </Row>
            <Row label="Payment description">{account.description}</Row>
            <Row label="Amount">{account.amount}</Row>
          </dl>
        </li>
      ))}
    </ul>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}
