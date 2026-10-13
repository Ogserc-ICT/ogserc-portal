import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Badge, documentStatusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, ImagePlaceholder } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { PENDING_PATH } from '@/lib/navigation'

// Review page for OGSERC's design-system approval (SRS 2.5). Not linked from the site and not
// indexed. Remove before launch (docs/RUNBOOK.md launch checklist; D-031).
export const metadata: Metadata = {
  title: 'Design system (review)',
  robots: { index: false, follow: false },
}

// Values are defined only in globals.css; contrast ratios are from D-024.
const swatches = [
  {
    name: 'green-900',
    bg: 'bg-green-900',
    role: 'Darkest green: utility bar, hero, footer',
    ratio: 'White text 11.7:1',
  },
  {
    name: 'green-700',
    bg: 'bg-green-700',
    role: 'Deep green: links, menu bar, secondary buttons',
    ratio: 'White text 5.9:1; as text on white 5.9:1',
  },
  {
    name: 'green-500',
    bg: 'bg-green-500',
    role: 'Mid green: icons, borders, large text only',
    ratio:
      'On white 3.5:1 (large text and non-text only). Never a background behind text: ink on it is 3.2:1',
  },
  {
    name: 'green-300',
    bg: 'bg-green-300',
    role: 'Light green: highlights and tints',
    ratio: 'Ink text 6.3:1',
  },
  {
    name: 'green-50',
    bg: 'bg-green-50',
    role: 'Section background (derived)',
    ratio: 'Ink text 10.1:1',
  },
  {
    name: 'gold-400',
    bg: 'bg-gold-400',
    role: 'Gold: buttons and accents. Never text on white',
    ratio: 'Ink text 7.5:1; on white 1.5:1 (not allowed)',
  },
  {
    name: 'ink',
    bg: 'bg-ink',
    role: 'Dark olive-brown from the full logo lockup: body text, text on gold',
    ratio: 'On white 11.1:1',
  },
  {
    name: 'ink-muted',
    bg: 'bg-ink-muted',
    role: 'Secondary text (derived)',
    ratio: 'On white 7.4:1',
  },
  {
    name: 'danger',
    bg: 'bg-danger',
    role: 'Errors and revoked status (derived)',
    ratio: 'On white 6.6:1',
  },
]

export default function DesignSystemPage() {
  return (
    <Container className="space-y-16 py-8 sm:py-12">
      <div>
        <Breadcrumbs items={[{ label: 'Design system (review)' }]} />
        <h1 className="mt-8 text-3xl font-bold text-green-900 sm:text-4xl">Design system</h1>
        <p className="mt-3 max-w-2xl text-lg">
          For OGSERC review. Colours, type, buttons, cards, badges and form controls used across the
          site.
        </p>
      </div>

      <section aria-labelledby="ds-colours">
        <SectionHeading id="ds-colours" title="Colours" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {swatches.map((s) => (
            <li key={s.name} className="overflow-hidden rounded-lg border border-line">
              <div aria-hidden="true" className={`h-16 ${s.bg}`} />
              <div className="space-y-1 p-4 text-sm">
                <p className="text-base font-semibold text-green-900">{s.name}</p>
                <p>{s.role}</p>
                <p className="text-ink-muted">{s.ratio}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ds-type">
        <SectionHeading id="ds-type" title="Typography" />
        <p className="mb-6 text-ink-muted">Public Sans, self-hosted. Body text 16px minimum.</p>
        <div className="space-y-4">
          <p className="text-4xl font-bold text-green-900 sm:text-5xl">Page title</p>
          <p className="text-2xl font-bold text-green-900 sm:text-3xl">Section heading</p>
          <p className="text-lg font-semibold text-green-900">Card title</p>
          <p className="max-w-2xl">
            Body text. The quick brown fox jumps over the lazy dog. Yoruba place names: Abẹokuta,
            Ijẹbu-Ode, Ṣagamu, Ọta.
          </p>
          <p className="text-sm text-ink-muted">Secondary text, dates and captions.</p>
          <p>
            <Link href={PENDING_PATH} className="text-green-700 underline underline-offset-4">
              An inline text link
            </Link>
          </p>
        </div>
      </section>

      <section aria-labelledby="ds-buttons">
        <SectionHeading id="ds-buttons" title="Buttons" />
        <div className="flex flex-wrap gap-3">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button variant="outline">Outline action</Button>
        </div>
        <div className="on-dark mt-4 flex flex-wrap gap-3 rounded-lg bg-green-900 p-6">
          <Button>Primary on dark</Button>
          <Button variant="outline-on-dark">Outline on dark</Button>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          Press Tab to see focus outlines: darkest green on light backgrounds, gold on dark ones.
        </p>
      </section>

      <section aria-labelledby="ds-badges">
        <SectionHeading id="ds-badges" title="Badges and document status" />
        <div className="flex flex-wrap gap-3">
          {Object.entries(documentStatusTone).map(([status, tone]) => (
            <Badge key={status} tone={tone}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          ))}
          <Badge>Public notice</Badge>
        </div>
      </section>

      <section aria-labelledby="ds-cards">
        <SectionHeading
          id="ds-cards"
          title="Cards"
          action={{ label: 'Section link', href: PENDING_PATH }}
        />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <Card
              title="[Sample card title, OGSERC to supply]"
              href={PENDING_PATH}
              media={<ImagePlaceholder />}
              meta="9 October 2026"
            >
              [Sample summary, OGSERC to supply]
            </Card>
          </li>
          <li>
            <Card
              title="[Sample card without image, OGSERC to supply]"
              href={PENDING_PATH}
              meta="[Sample reference]"
            >
              [Sample summary, OGSERC to supply]
            </Card>
          </li>
        </ul>
      </section>

      <section aria-labelledby="ds-forms">
        <SectionHeading id="ds-forms" title="Form controls" />
        <p className="mb-6 text-ink-muted">
          Display only. Real forms validate on the server (build step 5).
        </p>
        <div className="grid max-w-xl gap-6">
          <Field id="ds-name" label="Full name" required>
            {(c) => (
              <Input id={c.id} name="name" autoComplete="name" aria-describedby={c.describedBy} />
            )}
          </Field>
          <Field
            id="ds-email"
            label="Email address"
            hint="We will only use this to reply to you."
            error="Enter an email address in the correct format, like name@example.com"
          >
            {(c) => (
              <Input
                id={c.id}
                type="email"
                name="email"
                aria-describedby={c.describedBy}
                aria-invalid={c.invalid}
              />
            )}
          </Field>
          <Field id="ds-topic" label="Topic">
            {(c) => (
              <Select id={c.id} name="topic" aria-describedby={c.describedBy}>
                <option>[Sample option, OGSERC to supply]</option>
              </Select>
            )}
          </Field>
          <Field id="ds-message" label="Message">
            {(c) => <Textarea id={c.id} name="message" aria-describedby={c.describedBy} />}
          </Field>
        </div>
      </section>
    </Container>
  )
}
