import type { SVGProps } from 'react'

// A small set of line icons drawn for this site (24px grid, 2px stroke), so no icon library is needed.
const paths = {
  search: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  pause: <path d="M9 5v14m6-14v14" />,
  play: <path d="M7 4.5v15L19 12 7 4.5Z" />,
  arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
  arrowUp: <path d="M12 19V5m-6 6 6-6 6 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  phone: (
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  ),
  mail: <path d="M4 6h16v12H4zM4 7l8 6 8-6" />,
  mapPin: (
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
  ),
  calendar: <path d="M4 6h16v14H4zM4 10h16M8 3v4m8-4v4" />,
  document: <path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6m-6 4h6" />,
  scales: (
    <path d="M12 4v16m-6 0h12M5 8h14M5 8l-3 6a3 3 0 0 0 6 0L5 8Zm14 0-3 6a3 3 0 0 0 6 0l-3-6Z" />
  ),
  licence: <path d="M4 5h16v11H4zM8 9h8m-8 3h5m3 4 1.5 5 1.5-1.5L20 21l1-5" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  question: (
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.5-11.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14m0 3v.01" />
  ),
  megaphone: <path d="M3 10v4h3l8 4V6L6 10H3Zm14-1a4 4 0 0 1 0 6M7 14l1 6h3l-1-5" />,
  register: (
    <path d="M10 6h10M10 12h10M10 18h10M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17" />
  ),
  download: <path d="M12 4v11m-5-5 5 5 5-5M5 20h14" />,
  eye: (
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
  ),
  external: <path d="M14 4h6v6m0-6-9 9M18 14v6H4V6h6" />,
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2" />,
  // Social networks, outline versions of each brand mark in the same stroke style (D-057).
  linkedin: (
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6ZM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
  ),
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2Z" />,
  instagram: (
    <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.5-1.5h.01" />
  ),
  x: <path d="M4 4l11.7 16H20L8.3 4H4Zm0 16 6.8-6.8m2.4-2.4L20 4" />,
  tiktok: (
    <path d="M21 8v4a10 10 0 0 1-5-2v4.5a6.5 6.5 0 1 1-8-6.3v4.3a2.5 2.5 0 1 0 4 2V3h4a6 6 0 0 0 5 5Z" />
  ),
  // Offered in the site settings' social links (D-093); not used until OGSERC has a channel.
  youtube: (
    <path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17ZM10 15l5-3-5-3z" />
  ),
} as const

export type IconName = keyof typeof paths

type IconProps = SVGProps<SVGSVGElement> & { name: IconName }

/** Decorative by default (aria-hidden). Give the surrounding control a text label. */
export function Icon({ name, className = 'size-5', ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}
