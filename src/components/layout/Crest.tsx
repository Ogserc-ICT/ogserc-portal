import Image from 'next/image'

import crest from '../../../public/brand/ogun-state-crest.png'

/** The Ogun State crest beside the OGSERC logo (SRS 2.4): 40px tall on phones, 64px from lg. */
export function Crest() {
  return (
    <Image
      src={crest}
      alt="Ogun State Government crest"
      sizes="(min-width: 1024px) 65px, 41px"
      className="h-10 w-auto shrink-0 lg:h-16"
    />
  )
}
