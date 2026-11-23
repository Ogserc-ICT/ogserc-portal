import type { Metadata } from 'next'

import { PageBand } from '@/components/layout/PageBand'
import { Container } from '@/components/ui/Container'
import { routes } from '@/lib/navigation'
import { registeredOperators } from '@/lib/operators/registered-operators'

const page = routes.registeredOperators

export const metadata: Metadata = {
  title: page.label,
  description:
    'Electricity operators registered with the Ogun State Electricity Regulatory Commission.',
}

/** Registered operators, numbered in registration order (D-088). */
export default function RegisteredOperatorsPage() {
  return (
    <>
      <PageBand
        breadcrumbs={[{ label: page.label }]}
        eyebrow="Registration"
        titleId="page-title"
        title={page.label}
      >
        <p className="mt-4 max-w-2xl text-lg text-green-50">
          Operators registered with OGSERC to carry out electricity activities in Ogun State.
        </p>
      </PageBand>

      <div className="bg-green-50 py-10 sm:py-14">
        <Container>
          <div className="rounded-lg border border-line bg-white p-5 sm:p-8">
            <table className="w-full text-left">
              <caption className="pb-4 text-left text-ink-muted">
                {registeredOperators.length === 1
                  ? '1 registered operator'
                  : `${registeredOperators.length} registered operators`}
              </caption>
              <thead>
                <tr className="border-b-2 border-green-700">
                  <th scope="col" className="w-12 py-3 pr-4 font-semibold">
                    No.
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Operator
                  </th>
                  <th scope="col" className="py-3 font-semibold">
                    Registration number
                  </th>
                </tr>
              </thead>
              <tbody>
                {registeredOperators.map((operator, index) => (
                  <tr key={operator.registrationNumber} className="border-b border-line align-top">
                    <td className="py-3 pr-4 font-semibold text-green-900">{index + 1}</td>
                    <th scope="row" className="py-3 pr-4 font-semibold text-green-900">
                      {operator.name}
                    </th>
                    <td className="py-3 break-all sm:break-normal">
                      {operator.registrationNumber}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </div>
    </>
  )
}
