import hero1 from '@/assets/hero/hero-1.jpg'
import hero2 from '@/assets/hero/hero-2.jpg'
import hero3 from '@/assets/hero/hero-3.jpg'
import { HeroCarousel } from '@/components/home/HeroCarousel'
import { heroSlides } from '@/lib/placeholder-content'

// Photographs in slide order (D-037). They are decorative: the slide headline carries the meaning.
const photos = [hero1, hero2, hero3]

/** FR-WEB-02 / FR-WEB-08 hero: a carousel of slides, each with a headline and one primary action. */
export function Hero() {
  const slides = heroSlides.map((slide, i) => ({ ...slide, image: photos[i % photos.length] }))
  return <HeroCarousel slides={slides} />
}
