import { HeroCarousel } from '@/components/home/HeroCarousel'
import { heroSlides } from '@/lib/cms/content'

/**
 * FR-WEB-02 / FR-WEB-08 hero: a carousel of slides, each with a headline and one primary action,
 * from the site settings (D-096). The photographs are decorative: the slide headline carries the
 * meaning. A slide whose photograph is missing is left out.
 */
export async function Hero() {
  const slides = (await heroSlides()).flatMap((slide) => (slide.image ? [{ ...slide, image: slide.image }] : []))
  return slides.length > 0 ? <HeroCarousel slides={slides} /> : null
}
