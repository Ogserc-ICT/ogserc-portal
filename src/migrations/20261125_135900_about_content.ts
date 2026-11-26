import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { aboutUs, descriptions, ogsercStructure, organogramNote, ourHistory, visionMissionValues } from './data/about-2026-11'

// Puts the About OGSERC pages' text, which sat in src/lib/about/content.ts, into the About OGSERC
// global (D-098), word for word. It reads only ./data/about-2026-11.ts, never the app's modules, so it
// keeps working after they change. It fills the global only while it is empty, so it never replaces
// what staff wrote.

const rows = (texts: string[]) => texts.map((text) => ({ text }))
const division = ({ name, units }: { name: string; units: string[] }) => ({ name, units: units.map((unit) => ({ name: unit })) })

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const current = (await payload.findGlobal({ slug: 'about-ogserc', depth: 0, req })) as { aboutUs?: { description?: string | null } }
  if (current.aboutUs?.description) return
  await payload.updateGlobal({
    slug: 'about-ogserc',
    req,
    data: {
      aboutUs: {
        description: descriptions.aboutUs,
        introduction: rows(aboutUs.introduction),
        whatWeDo: aboutUs.whatWeDo.map(({ title, icon, text }) => ({ title, icon: icon as 'licence', text })),
      },
      history: {
        description: descriptions.history,
        paragraphs: rows(ourHistory.paragraphs),
        keyDates: ourHistory.keyDates.map(({ date, text }) => ({ date, text })),
      },
      mission: {
        description: descriptions.mission,
        vision: visionMissionValues.vision,
        mission: visionMissionValues.mission,
        values: visionMissionValues.values.map(({ name, text }) => ({ name, text })),
      },
      structure: {
        description: descriptions.structure,
        introduction: rows(ogsercStructure.introduction),
        organogramNote,
        office: division(ogsercStructure.officeOfTheChairman),
        divisions: ogsercStructure.divisions.map(division),
      },
    },
  })
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // The schema migration before this one drops the global's tables; nothing to undo here.
}
