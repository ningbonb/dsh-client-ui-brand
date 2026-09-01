import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { BrandConfig } from './config.ts'

type BrandMarkProps = HeroBrandMarkOwnerProps & SidebarBrandMarkOwnerProps

/** Render one configured image centered inside its host-owned square. */
function BrandImageMark({ alt, className, size, src }: BrandMarkProps & { alt: string; src: string }) {
  return (
    <span
      className={className}
      style={{ alignItems: 'center', display: 'inline-flex', height: size, justifyContent: 'center', width: size }}
    >
      <img
        alt={alt}
        src={src}
        style={{ display: 'block', height: size, objectFit: 'contain', width: size }}
      />
    </span>
  )
}

/** Original, dependency-free default mark for Brand New Agent. */
export function DefaultAgentMark({ size, className }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#4D6BFE" height="64" rx="16" width="64" />
      <g transform="translate(0 7)">
        <path d="M20 31.5C20 24.6 25.4 19 32 19s12 5.6 12 12.5V41c0 2.2-1.8 4-4 4H24c-2.2 0-4-1.8-4-4v-9.5Z" fill="#FFFFFF" />
        <path d="M32 10v9M17 26l5 2M47 26l-5 2" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="4" />
        <circle cx="32" cy="8" fill="#FFFFFF" r="3" />
        <circle cx="27" cy="32" fill="#4D6BFE" r="3" />
        <circle cx="37" cy="32" fill="#4D6BFE" r="3" />
        <path d="M27 39h10" stroke="#4D6BFE" strokeLinecap="round" strokeWidth="3" />
      </g>
    </svg>
  )
}

/** Make the product mark while preserving every host-owned size and class. */
export function createBrandMark(brand: BrandConfig) {
  return function BrandMark({ size, className }: BrandMarkProps) {
    if (brand.logoHref === undefined) return <DefaultAgentMark size={size} className={className} />
    return <BrandImageMark alt={brand.logoAlt} className={className} size={size} src={brand.logoHref} />
  }
}

/** Make the product name occupant for the sidebar's independently sized name seat. */
export function createBrandName(brand: BrandConfig) {
  return function BrandName() {
    return <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brand.productName}</span>
  }
}
