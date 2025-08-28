import { SessionData } from '@/types/session'

/**
 * Lightweight ML Service wrapper
 * Uses Web Workers to prevent blocking the main thread
 * Replaces the heavy machineLearning.ts service
 */
class MLServiceWrapper {
  private static instance: MLServiceWrapper
  private worker: Worker | null = null
  private pendingOperations = new Map<string, { resolve: Function, reject: Function }>()
  private messageId = 0
  
  static getInstance(): MLServiceWrapper {
    if (!MLServiceWrapper.instance) {
      MLServiceWrapper.instance = new MLServiceWrapper()
    }
    return MLServiceWrapper.instance
  }
  
  constructor() {
    this.initializeWorker()
  }
  
  private initializeWorker(): void {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported, falling back to main thread')
      return
    }
    
    try {
      // Create worker from the TypeScript file (Vite will handle the bundling)
      this.worker = new Worker(
        new URL('../workers/mlWorker.ts', import.meta.url),
        { type: 'module' }
      )
      
      this.worker.onmessage = (event) => {
        const { id, type, result, error, progress } = event.data
        const operation = this.pendingOperations.get(id)
        
        if (operation) {
          switch (type) {
            case 'success':
              operation.resolve(result)
              this.pendingOperations.delete(id)
              break
            case 'error':
              operation.reject(new Error(error))
              this.pendingOperations.delete(id)
              break
            case 'progress':
              // Could emit progress events if needed
              console.log(`ML operation ${id} progress: ${progress}%`)
              break
          }
        }
      }
      
      this.worker.onerror = (error) => {
        console.error('ML Worker error:', error)
        this.fallbackToMainThread()
      }
      
      // Don't auto-optimize every 5 minutes anymore
      // Instead, optimize on demand or during idle time
      this.scheduleIdleOptimization()
      
    } catch (error) {
      console.warn('Failed to create ML Worker, falling back to main thread:', error)
      this.fallbackToMainThread()
    }
  }
  
  private async sendWorkerMessage(type: string, payload: any): Promise<any> {
    if (!this.worker) {
      return this.fallbackOperation(type, payload)
    }
    
    const id = `ml_${++this.messageId}`
    
    return new Promise((resolve, reject) => {
      this.pendingOperations.set(id, { resolve, reject })
      
      this.worker!.postMessage({ id, type, payload })
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingOperations.has(id)) {
          this.pendingOperations.delete(id)
          reject(new Error('ML operation timeout'))
        }
      }, 30000)
    })
  }
  
  private scheduleIdleOptimization(): void {
    // Use requestIdleCallback if available, otherwise setTimeout with low priority
    if ('requestIdleCallback' in window) {
      const optimizeWhenIdle = () => {
        requestIdleCallback((deadline) => {
          if (deadline.timeRemaining() > 1000) { // Only if we have >1s idle time
            this.optimizeModel().catch(console.error)
          }
          
          // Schedule next optimization check in 10 minutes
          setTimeout(optimizeWhenIdle, 10 * 60 * 1000)
        })
      }
      optimizeWhenIdle()
    }
  }
  
  async predictPatterns(text: string): Promise<any> {
    try {
      const model = await this.getModel()
      const result = await this.sendWorkerMessage('predict', { model, text })
      return result?.patterns || []
    } catch (error) {
      console.error('Pattern prediction failed:', error)
      return this.fallbackPatternPrediction(text)
    }
  }
  
  async learnFromSessionOutcome(sessionData: SessionData, outcome: 'resolved' | 'stalemate' | 'abandoned'): Promise<void> {
    try {
      const model = await this.getModel()
      const example = this.createTrainingExample(sessionData, outcome)
      
      await this.sendWorkerMessage('train', { model, example })
      console.log('ML model updated with session outcome:', outcome)
    } catch (error) {
      console.error('Failed to learn from session outcome:', error)
    }
  }
  
  async optimizeModel(): Promise<void> {
    try {
      const model = await this.getModel()
      const optimizedModel = await this.sendWorkerMessage('optimize', model)
      
      await this.saveModel(optimizedModel)
      console.log('ML model optimized, accuracy:', optimizedModel.accuracy)
    } catch (error) {
      console.error('Model optimization failed:', error)
    }
  }
  
  private async getModel(): Promise<any> {
    // Get model from secure storage
    const stored = localStorage.getItem('mixitfixit-ml-model')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return this.getDefaultModel()
      }
    }
    return this.getDefaultModel()
  }
  
  private async saveModel(model: any): Promise<void> {
    try {
      localStorage.setItem('mixitfixit-ml-model', JSON.stringify(model))
    } catch (error) {
      console.error('Failed to save ML model:', error)
    }
  }
  
  private getDefaultModel(): any {
    return {
      id: 'mixitfixit-ml-v1',
      version: 1,
      accuracy: 0.65,
      trainingData: [],
      weights: {},
      lastUpdated: Date.now()
    }
  }
  
  private createTrainingExample(sessionData: SessionData, outcome: string): any {
    return {
      text: sessionData.messages.map(m => m.content).join(' '),
      outcome,
      timestamp: Date.now(),
      context: {
        phase: sessionData.phase,
        messageCount: sessionData.messages.length,
        hasResolution: !!sessionData.finalResolution
      }
    }
  }
  
  private fallbackToMainThread(): void {
    console.warn('ML operations falling back to main thread')
    this.worker = null
  }
  
  private async fallbackOperation(type: string, payload: any): Promise<any> {
    // Simple fallback operations that won't block the UI
    switch (type) {
      case 'predict':
        return this.fallbackPatternPrediction(payload.text)
      case 'optimize':
        return payload // No optimization in fallback
      default:
        return {}
    }
  }
  
  private fallbackPatternPrediction(text: string): any {
    const patterns = []
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('you always') || lowerText.includes('you never')) {
      patterns.push({
        pattern: 'blame-shifting',
        confidence: 0.7,
        reasoning: 'Detected absolutist language'
      })
    }
    
    return { patterns }
  }
  
  // Compatibility methods for the existing interface
  async evaluateModel(): Promise<any> {
    try {
      return await this.sendWorkerMessage('evaluate', {})
    } catch {
      return { accuracy: 0.65, loss: 0.35 }
    }
  }
  
  async getTrainingProgress(): Promise<any> {
    const model = await this.getModel()
    return {
      trainingExamples: model.trainingData?.length || 0,
      accuracy: model.accuracy || 0.65,
      lastUpdated: model.lastUpdated || Date.now()
    }
  }
  
  cleanup(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.pendingOperations.clear()
  }
}

// Export the service
export const machineLearningService = MLServiceWrapper.getInstance()

// Clean up worker when page unloads
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    machineLearningService.cleanup()
  })
}