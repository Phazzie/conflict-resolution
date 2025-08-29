/**
 * Performance Monitoring Utilities
 * 
 * Tracks Core Web Vitals and application performance metrics
 * for deployment readiness validation.
 */

import React from 'react'
import { appConfig } from '@/config/env'

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  fcp: number | null // First Contentful Paint
  ttfb: number | null // Time to First Byte
  
  // Application metrics
  domContentLoaded: number | null
  loadComplete: number | null
  navigationStart: number | null
  
  // Bundle and resource metrics
  jsHeapSizeLimit: number | null
  totalJSHeapSize: number | null
  usedJSHeapSize: number | null
  
  // Custom metrics
  sessionInitTime: number | null
  aiResponseTime: number | null
  componentRenderTime: Record<string, number>
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    domContentLoaded: null,
    loadComplete: null,
    navigationStart: null,
    jsHeapSizeLimit: null,
    totalJSHeapSize: null,
    usedJSHeapSize: null,
    sessionInitTime: null,
    aiResponseTime: null,
    componentRenderTime: {}
  }
  
  private observers: PerformanceObserver[] = []
  private isMonitoring = false

  /**
   * Initialize performance monitoring
   */
  init(): void {
    if (this.isMonitoring || typeof window === 'undefined') return
    
    this.isMonitoring = true
    this.setupWebVitalsObservers()
    this.trackNavigationTiming()
    this.trackMemoryUsage()
    
    if (appConfig.VITE_APP_ENVIRONMENT === 'development') {
      console.info('Performance monitoring initialized')
    }
  }

  /**
   * Set up observers for Core Web Vitals
   */
  private setupWebVitalsObservers(): void {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          this.metrics.lcp = lastEntry.startTime
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.push(lcpObserver)
      } catch (e) {
        // LCP not supported
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          entries.forEach((entry: any) => {
            if (entry.name === 'first-input') {
              this.metrics.fid = entry.processingStart - entry.startTime
            }
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
        this.observers.push(fidObserver)
      } catch (e) {
        // FID not supported
      }

      // Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((entryList) => {
          let clsValue = 0
          entryList.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          })
          this.metrics.cls = clsValue
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.push(clsObserver)
      } catch (e) {
        // CLS not supported
      }

      // First Contentful Paint
      try {
        const fcpObserver = new PerformanceObserver((entryList) => {
          entryList.getEntries().forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.fcp = entry.startTime
            }
          })
        })
        fcpObserver.observe({ entryTypes: ['paint'] })
        this.observers.push(fcpObserver)
      } catch (e) {
        // FCP not supported
      }
    }
  }

  /**
   * Track navigation timing
   */
  private trackNavigationTiming(): void {
    if (typeof window !== 'undefined' && window.performance && window.performance.timing) {
      const timing = window.performance.timing
      
      this.metrics.navigationStart = timing.navigationStart
      this.metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart
      this.metrics.loadComplete = timing.loadEventEnd - timing.navigationStart
      this.metrics.ttfb = timing.responseStart - timing.navigationStart
    }
  }

  /**
   * Track memory usage
   */
  private trackMemoryUsage(): void {
    if (typeof window !== 'undefined' && (window.performance as any).memory) {
      const memory = (window.performance as any).memory
      this.metrics.jsHeapSizeLimit = memory.jsHeapSizeLimit
      this.metrics.totalJSHeapSize = memory.totalJSHeapSize
      this.metrics.usedJSHeapSize = memory.usedJSHeapSize
    }
  }

  /**
   * Start timing a specific operation
   */
  startTiming(label: string): () => number {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      
      if (label.startsWith('component:')) {
        this.metrics.componentRenderTime[label] = duration
      } else if (label === 'session-init') {
        this.metrics.sessionInitTime = duration
      } else if (label === 'ai-response') {
        this.metrics.aiResponseTime = duration
      }
      
      return duration
    }
  }

  /**
   * Mark a specific milestone
   */
  mark(name: string): void {
    if (typeof window !== 'undefined' && window.performance && window.performance.mark) {
      window.performance.mark(name)
    }
  }

  /**
   * Measure between two marks
   */
  measure(name: string, startMark?: string, endMark?: string): number | null {
    if (typeof window !== 'undefined' && window.performance && window.performance.measure) {
      try {
        window.performance.measure(name, startMark, endMark)
        const entries = window.performance.getEntriesByName(name, 'measure')
        return entries.length > 0 ? entries[entries.length - 1].duration : null
      } catch (e) {
        return null
      }
    }
    return null
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    // Update memory usage if available
    this.trackMemoryUsage()
    
    return { ...this.metrics }
  }

  /**
   * Check if metrics meet deployment thresholds
   */
  validateDeploymentReadiness(): {
    isReady: boolean
    issues: string[]
    warnings: string[]
  } {
    const issues: string[] = []
    const warnings: string[] = []
    const metrics = this.getMetrics()

    // Core Web Vitals thresholds (from deployment checklist)
    if (metrics.lcp !== null && metrics.lcp > 2500) {
      issues.push(`LCP too slow: ${metrics.lcp}ms (should be < 2500ms)`)
    }

    if (metrics.fid !== null && metrics.fid > 100) {
      issues.push(`FID too slow: ${metrics.fid}ms (should be < 100ms)`)
    }

    if (metrics.cls !== null && metrics.cls > 0.1) {
      issues.push(`CLS too high: ${metrics.cls} (should be < 0.1)`)
    }

    if (metrics.fcp !== null && metrics.fcp > 1800) {
      warnings.push(`FCP could be faster: ${metrics.fcp}ms (target < 1800ms)`)
    }

    if (metrics.ttfb !== null && metrics.ttfb > 800) {
      warnings.push(`TTFB could be faster: ${metrics.ttfb}ms (target < 800ms)`)
    }

    // Memory usage checks
    if (metrics.usedJSHeapSize !== null && metrics.jsHeapSizeLimit !== null) {
      const memoryUsageRatio = metrics.usedJSHeapSize / metrics.jsHeapSizeLimit
      if (memoryUsageRatio > 0.8) {
        issues.push(`High memory usage: ${Math.round(memoryUsageRatio * 100)}%`)
      } else if (memoryUsageRatio > 0.6) {
        warnings.push(`Moderate memory usage: ${Math.round(memoryUsageRatio * 100)}%`)
      }
    }

    // Component render times
    Object.entries(metrics.componentRenderTime).forEach(([component, time]) => {
      if (time > 100) {
        warnings.push(`Slow component render: ${component} took ${Math.round(time)}ms`)
      }
    })

    // Session initialization time
    if (metrics.sessionInitTime !== null && metrics.sessionInitTime > 3000) {
      issues.push(`Session initialization too slow: ${metrics.sessionInitTime}ms`)
    }

    // AI response time
    if (metrics.aiResponseTime !== null && metrics.aiResponseTime > 5000) {
      warnings.push(`AI responses slow: ${metrics.aiResponseTime}ms average`)
    }

    return {
      isReady: issues.length === 0,
      issues,
      warnings
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics()
    const validation = this.validateDeploymentReadiness()
    
    const report = `
# Performance Report

## Core Web Vitals
- **LCP (Largest Contentful Paint)**: ${metrics.lcp ? `${Math.round(metrics.lcp)}ms` : 'Not measured'}
- **FID (First Input Delay)**: ${metrics.fid ? `${Math.round(metrics.fid)}ms` : 'Not measured'}
- **CLS (Cumulative Layout Shift)**: ${metrics.cls ? metrics.cls.toFixed(3) : 'Not measured'}
- **FCP (First Contentful Paint)**: ${metrics.fcp ? `${Math.round(metrics.fcp)}ms` : 'Not measured'}
- **TTFB (Time to First Byte)**: ${metrics.ttfb ? `${Math.round(metrics.ttfb)}ms` : 'Not measured'}

## Load Performance
- **DOM Content Loaded**: ${metrics.domContentLoaded ? `${Math.round(metrics.domContentLoaded)}ms` : 'Not measured'}
- **Load Complete**: ${metrics.loadComplete ? `${Math.round(metrics.loadComplete)}ms` : 'Not measured'}

## Memory Usage
- **Used JS Heap**: ${metrics.usedJSHeapSize ? `${Math.round(metrics.usedJSHeapSize / 1024 / 1024)}MB` : 'Not available'}
- **Total JS Heap**: ${metrics.totalJSHeapSize ? `${Math.round(metrics.totalJSHeapSize / 1024 / 1024)}MB` : 'Not available'}
- **JS Heap Limit**: ${metrics.jsHeapSizeLimit ? `${Math.round(metrics.jsHeapSizeLimit / 1024 / 1024)}MB` : 'Not available'}

## Application Performance
- **Session Init Time**: ${metrics.sessionInitTime ? `${Math.round(metrics.sessionInitTime)}ms` : 'Not measured'}
- **AI Response Time**: ${metrics.aiResponseTime ? `${Math.round(metrics.aiResponseTime)}ms` : 'Not measured'}

## Component Render Times
${Object.entries(metrics.componentRenderTime)
  .map(([component, time]) => `- **${component}**: ${Math.round(time)}ms`)
  .join('\n') || 'None recorded'}

## Deployment Readiness: ${validation.isReady ? '✅ READY' : '❌ NOT READY'}

### Issues (must fix):
${validation.issues.map(issue => `- ${issue}`).join('\n') || 'None'}

### Warnings (should address):
${validation.warnings.map(warning => `- ${warning}`).join('\n') || 'None'}

Generated at: ${new Date().toISOString()}
    `.trim()

    return report
  }

  /**
   * Log performance metrics to console (development only)
   */
  logMetrics(): void {
    if (appConfig.VITE_APP_ENVIRONMENT === 'development' && appConfig.VITE_DEV_SHOW_WARNINGS) {
      console.group('Performance Metrics')
      console.table(this.getMetrics())
      console.log(this.generateReport())
      console.groupEnd()
    }
  }

  /**
   * Clean up observers
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.isMonitoring = false
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now()
  
  return () => {
    const duration = performance.now() - startTime
    performanceMonitor.startTiming(`component:${componentName}`)()
    return duration
  }
}

// Higher-order component for performance tracking
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const endTiming = performanceMonitor.startTiming(`component:${componentName}`)
    
    React.useEffect(() => {
      return () => {
        endTiming()
      }
    }, [endTiming])
    
    return React.createElement(Component, props)
  }
}

// Initialize performance monitoring when module is imported
if (typeof window !== 'undefined') {
  performanceMonitor.init()
}