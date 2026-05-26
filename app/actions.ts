'use client'

export async function hideBanner() {
  try {
    document.cookie = 'banner-hidden=true; path=/; max-age=2592000; SameSite=Lax'
  } catch {
    // Cookies may not be available in all static contexts
  }
}
