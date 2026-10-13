import type { SVGProps } from 'react'

// A small set of line icons drawn for this site (24px grid, 2px stroke), so no icon library is needed.
const paths = {
  search: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  pause: <path d="M9 5v14m6-14v14" />,
  play: <path d="M7 4.5v15L19 12 7 4.5Z" />,
  arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
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
