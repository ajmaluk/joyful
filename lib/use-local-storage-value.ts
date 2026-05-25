"use client";

import { useEffect, useState } from 'react'

export function useLocalStorageValue(key: string) {
  const [value, setValue] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    try {
      const storedValue = localStorage.getItem(key)
      if (storedValue !== null) {
        setValue(storedValue)
      }
    } catch (e) {
      console.warn('Failed to read localStorage', key, e)
    }
    setIsInitialized(true)
  }, [key])

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(key, value)
      } catch (e) {
        console.warn('Failed to write localStorage', key, e)
      }
    }
  }, [key, value, isInitialized])

  return [value, setValue] as const
}
