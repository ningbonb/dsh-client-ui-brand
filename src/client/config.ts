/** Browser-safe brand configuration injected by the host plugin. All fields are optional. */
export interface BrandConfig {
  /** Product name rendered in the expanded sidebar. */
  productName?: string
  /** Same-origin, data, or HTTPS URL for the product mark when configured. */
  logoHref?: string
  /** Whether the host wrapped the mark in a square SVG canvas. */
  logoSquare?: boolean
  /** Accessible text for the product mark. */
  logoAlt?: string
}

/** Default product identity when the deployment did not provide an explicit name. */
export const DEFAULT_PRODUCT_NAME = 'Brand New Agent'

/** Validate and normalize metadata read from the initial document global. */
export function normalizeBrandConfig(config: BrandConfig): Required<Pick<BrandConfig, 'productName' | 'logoAlt'>> & Omit<BrandConfig, 'productName' | 'logoAlt'> {
  const productName = config.productName?.trim() || DEFAULT_PRODUCT_NAME
  const logoHref = config.logoHref?.trim()
  return {
    productName,
    ...(logoHref === undefined || logoHref.length === 0 ? {} : { logoHref }),
    ...(config.logoSquare === true ? { logoSquare: true } : {}),
    logoAlt: config.logoAlt?.trim() || productName,
  }
}
