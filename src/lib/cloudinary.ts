export const optimizeCloudinaryUrl = (url: string, width = 900) => {
  if (!url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`)
}

/** Favicon quadrado otimizado (aba do navegador). */
export const faviconCloudinaryUrl = (url: string, size = 64) => {
  if (!url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/f_png,q_auto,c_fill,w_${size},h_${size}/`)
}
