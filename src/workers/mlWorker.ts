/**
 * Machine Learning Worker
 * Handles computationally intensive ML operations in a separate thread
 * to prevent blocking the main UI thread
 */

// Import types for the worker
interface MLModel {
  accuracy: number
  lastOptimized?: number
  optimizationTime?: number
  trainingData?: any[]
}

interface TrainingExample {
  input: string
  expectedOutput: string
  pattern?: string
}

interface PredictionResult {
  patterns: Array<{
    pattern: string
    confidence: number
    reasoning: string
  }>
}

interface MLWorkerMessage {
  id: string
  type: 'optimize' | 'train' | 'predict' | 'evaluate'
  payload: {
    model?: MLModel
    example?: TrainingExample
    text?: string
  }
}

interface MLWorkerResponse {
  id: string
  type: 'success' | 'error' | 'progress'
  result?: MLModel | PredictionResult | { accuracy: number; loss: number }
  error?: string
  progress?: number
}

// Simplified ML operations for the worker
class MLWorkerService {
  private model: MLModel | null = null
  
  async optimizeModel(modelData: MLModel): Promise<MLModel> {
    // Simulate heavy ML computation
    const startTime = Date.now()
    let progress = 0
    
    // Send progress updates
    const progressInterval = setInterval(() => {
      progress += Math.random() * 20
      if (progress < 90) {
        self.postMessage({
          id: 'current',
          type: 'progress',
          progress: Math.min(progress, 90)
        } as MLWorkerResponse)
      }
    }, 100)
    
    // Simulate optimization work
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    clearInterval(progressInterval)
    
    // Return optimized model
    const optimizedModel: MLModel = {
      ...modelData,
      accuracy: Math.min(modelData.accuracy + Math.random() * 0.1, 0.95),
      lastOptimized: Date.now(),
      optimizationTime: Date.now() - startTime
    }
    
    return optimizedModel
  }
  
  async trainOnExample(modelData: MLModel, example: TrainingExample): Promise<MLModel> {
    // Simulate training computation
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return {
      ...modelData,
      trainingData: [...(modelData.trainingData || []), example],
      accuracy: Math.min(modelData.accuracy + 0.001, 0.95)
    }
  }
  
  async predictPattern(modelData: MLModel, text: string): Promise<PredictionResult> {
    // Simple pattern prediction logic
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const patterns = []
    const lowerText = text.toLowerCase()
    
    // Basic pattern detection
    if (lowerText.includes('you always') || lowerText.includes('you never')) {
      patterns.push({
        pattern: 'blame-shifting',
        confidence: 0.8,
        reasoning: 'Detected absolutist language patterns'
      })
    }
    
    if (lowerText.includes('never said') || lowerText.includes('making things up')) {
      patterns.push({
        pattern: 'gaslighting',
        confidence: 0.75,
        reasoning: 'Detected reality-questioning language'
      })
    }
    
    return { patterns }
  }
}

const mlWorker = new MLWorkerService()

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<MLWorkerMessage>) => {
  const { id, type, payload } = event.data
  
  try {
    let result
    
    switch (type) {
      case 'optimize':
        if (!payload.model) throw new Error('Model data required for optimization')
        result = await mlWorker.optimizeModel(payload.model)
        break
      case 'train':
        if (!payload.model || !payload.example) throw new Error('Model and example required for training')
        result = await mlWorker.trainOnExample(payload.model, payload.example)
        break
      case 'predict':
        if (!payload.model || !payload.text) throw new Error('Model and text required for prediction')
        result = await mlWorker.predictPattern(payload.model, payload.text)
        break
      case 'evaluate':
        // Simulate model evaluation
        result = { accuracy: 0.85, loss: 0.15 }
        break
      default:
        throw new Error(`Unknown worker message type: ${type}`)
    }
    
    self.postMessage({
      id,
      type: 'success',
      result
    } as MLWorkerResponse)
    
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as MLWorkerResponse)
  }
})

// Export for TypeScript
export {}