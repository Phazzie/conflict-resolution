/**
 * Mobile-first responsive utilities and hooks for MixitFixit
 */

import { useState, useEffect } from 'react'

export interface BreakpointState {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLarge: boolean
  width: number
  height: number
}

const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
  large: 1536
}

/**
 * Hook for responsive breakpoint detection
 */
export function useBreakpoint(): BreakpointState {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  })

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    isMobile: windowSize.width < breakpoints.mobile,
    isTablet: windowSize.width >= breakpoints.mobile && windowSize.width < breakpoints.tablet,
    isDesktop: windowSize.width >= breakpoints.tablet && windowSize.width < breakpoints.desktop,
    isLarge: windowSize.width >= breakpoints.large,
    width: windowSize.width,
    height: windowSize.height
  }
}

/**
 * Hook for detecting mobile touch capabilities
 */
export function useTouchDetection() {
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      )
    }

    checkTouch()
    window.addEventListener('touchstart', checkTouch, { once: true })
    
    return () => {
      window.removeEventListener('touchstart', checkTouch)
    }
  }, [])

  return isTouchDevice
}

/**
 * Hook for optimizing content based on screen size
 */
export function useResponsiveContent() {
  const { isMobile, isTablet } = useBreakpoint()
  
  return {
    // Text lengths
    maxIssueLength: isMobile ? 300 : 500,
    maxStatementLength: isMobile ? 500 : 800,
    maxMessageLength: isMobile ? 500 : 1000,
    
    // UI Elements
    showFullLabels: !isMobile,
    useCompactLayout: isMobile || isTablet,
    showProgressText: !isMobile,
    
    // Interaction optimizations
    buttonSize: isMobile ? 'lg' : 'default',
    inputPadding: isMobile ? 'p-4' : 'p-3',
    cardSpacing: isMobile ? 'space-y-4' : 'space-y-6'
  }
}

/**
 * Hook for keyboard handling on mobile
 */
export function useMobileKeyboard() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const { isMobile } = useBreakpoint()

  useEffect(() => {
    if (!isMobile) return

    let initialViewportHeight = window.visualViewport?.height || window.innerHeight
    
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height
        const heightDifference = initialViewportHeight - currentHeight
        
        // If the viewport height decreased by more than 150px, assume keyboard is open
        setIsKeyboardOpen(heightDifference > 150)
      }
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange)
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange)
      }
    } else {
      // Fallback for older browsers
      const handleWindowResize = () => {
        const currentHeight = window.innerHeight
        const heightDifference = initialViewportHeight - currentHeight
        setIsKeyboardOpen(heightDifference > 150)
      }

      window.addEventListener('resize', handleWindowResize)
      return () => window.removeEventListener('resize', handleWindowResize)
    }
  }, [isMobile])

  return { isKeyboardOpen, isMobile }
}

/**
 * Responsive class generator
 */
export function getResponsiveClasses(base: string, mobile?: string, tablet?: string, desktop?: string) {
  const classes = [base]
  
  if (mobile) classes.push(`sm:${mobile}`)
  if (tablet) classes.push(`md:${tablet}`)
  if (desktop) classes.push(`lg:${desktop}`)
  
  return classes.join(' ')
}

/**
 * Mobile-optimized text area configurations
 */
export function getMobileTextareaProps(isMobile: boolean) {
  return {
    className: getResponsiveClasses(
      'min-h-32', // Base mobile height
      'min-h-40', // Small screens
      'min-h-48'  // Medium and up
    ),
    placeholder: isMobile 
      ? 'Tap to start typing...' 
      : 'Click to start typing...',
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'sentences',
    spellCheck: true
  }
}

/**
 * Touch-optimized button configurations
 */
export function getTouchButtonProps(isTouchDevice: boolean) {
  return {
    className: isTouchDevice 
      ? 'min-h-12 min-w-12 touch-manipulation' 
      : '',
    style: isTouchDevice 
      ? { WebkitTapHighlightColor: 'transparent' } 
      : {}
  }
}

/**
 * Safe area insets for mobile devices (iOS notch, etc.)
 */
export function getSafeAreaClasses() {
  return {
    paddingTop: 'pt-safe-top',
    paddingBottom: 'pb-safe-bottom',
    paddingLeft: 'pl-safe-left',
    paddingRight: 'pr-safe-right',
    marginTop: 'mt-safe-top',
    marginBottom: 'mb-safe-bottom'
  }
}

/**
 * Performance optimization for mobile scrolling
 */
export function getScrollOptimization() {
  return {
    className: 'overscroll-contain scroll-smooth',
    style: {
      WebkitOverflowScrolling: 'touch',
      scrollBehavior: 'smooth'
    }
  }
}