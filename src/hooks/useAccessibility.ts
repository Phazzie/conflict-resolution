import { useEffect, useRef } from 'react'

/**
 * Hook to manage focus for accessibility during phase transitions
 */
export function useFocusManagement(phase: string) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousPhase = useRef<string>('')

  useEffect(() => {
    // Only manage focus if phase actually changed
    if (previousPhase.current && previousPhase.current !== phase) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        // Focus on the main heading for the new phase
        if (headingRef.current) {
          headingRef.current.focus()
        } else {
          // Fallback: focus on first focusable element
          const firstFocusable = document.querySelector<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
          )
          if (firstFocusable) {
            firstFocusable.focus()
          }
        }
      }, 100)

      // Clean up timer
      return () => clearTimeout(timer)
    }
    
    previousPhase.current = phase
  }, [phase])

  return headingRef
}

/**
 * Hook to ensure accessible keyboard navigation within a component
 */
export function useKeyboardNavigation(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key to provide exit path
      if (event.key === 'Escape') {
        const resetButton = document.querySelector<HTMLButtonElement>('[aria-label="Reset current session"]')
        if (resetButton) {
          resetButton.focus()
        }
        return
      }

      // Handle arrow key navigation for grouped elements
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const focusableElements = container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
        
        if (focusableElements.length <= 1) return

        const currentIndex = Array.from(focusableElements).findIndex(el => el === document.activeElement)
        if (currentIndex === -1) return

        event.preventDefault()
        
        let nextIndex: number
        if (event.key === 'ArrowDown') {
          nextIndex = (currentIndex + 1) % focusableElements.length
        } else {
          nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1
        }
        
        focusableElements[nextIndex].focus()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [containerRef])
}

/**
 * Hook to announce important state changes to screen readers
 */
export function useScreenReaderAnnouncements() {
  const announcementRef = useRef<HTMLDivElement>(null)

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcementRef.current) return

    // Clear previous announcement
    announcementRef.current.textContent = ''
    
    // Set new announcement with a slight delay to ensure it's read
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = message
        announcementRef.current.setAttribute('aria-live', priority)
      }
    }, 100)

    // Clear announcement after it's been read
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = ''
      }
    }, 3000)
  }

  const AnnouncementDiv = () => (
    <div
      ref={announcementRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  )

  return { announce, AnnouncementDiv }
}

/**
 * Hook to manage skip links for better navigation
 */
export function useSkipLinks() {
  useEffect(() => {
    // Add skip link to the beginning of the document if it doesn't exist
    const existingSkipLink = document.querySelector('#skip-link')
    if (existingSkipLink) return

    const skipLink = document.createElement('a')
    skipLink.id = 'skip-link'
    skipLink.href = '#main-content'
    skipLink.textContent = 'Skip to main content'
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:text-foreground focus:px-4 focus:py-2 focus:rounded focus:border'
    
    // Insert at the very beginning of the body
    document.body.insertBefore(skipLink, document.body.firstChild)

    // Add the main content ID to the main element if it doesn't exist
    const mainElement = document.querySelector('main')
    if (mainElement && !mainElement.id) {
      mainElement.id = 'main-content'
    }

    return () => {
      const link = document.querySelector('#skip-link')
      if (link) {
        link.remove()
      }
    }
  }, [])
}