import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '../../components/ErrorBoundary'

// Mock the ErrorRecovery component since it might not exist yet
vi.mock('../../components/ErrorRecovery', () => ({
  default: ({ error, onRetry, onReset, context, canRecover }: any) => (
    <div data-testid="error-recovery">
      <h2>Error Recovery</h2>
      <p data-testid="error-message">{error.message}</p>
      <p data-testid="error-context">{context}</p>
      {canRecover && (
        <div>
          <button onClick={onRetry}>Retry</button>
          <button onClick={onReset}>Reset</button>
        </div>
      )}
    </div>
  )
}))

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div data-testid="no-error">No error occurred</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child-component">Child content</div>
      </ErrorBoundary>
    )
    
    expect(screen.getByTestId('child-component')).toBeInTheDocument()
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('catches and displays errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByTestId('error-recovery')).toBeInTheDocument()
    expect(screen.getByTestId('error-message')).toHaveTextContent('Test error')
    expect(screen.queryByTestId('child-component')).not.toBeInTheDocument()
  })

  it('passes context to error recovery', () => {
    render(
      <ErrorBoundary context="test-context">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByTestId('error-context')).toHaveTextContent('test-context')
  })

  it('uses default context when none provided', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByTestId('error-context')).toHaveTextContent('application')
  })

  it('handles retry functionality', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    
    render(
      <ErrorBoundary onRetry={onRetry}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    const retryButton = screen.getByText('Retry')
    await user.click(retryButton)
    
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('handles reset functionality', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    
    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    const resetButton = screen.getByText('Reset')
    await user.click(resetButton)
    
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('uses custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom error UI</div>
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.getByText('Custom error UI')).toBeInTheDocument()
    expect(screen.queryByTestId('error-recovery')).not.toBeInTheDocument()
  })

  it('recovers from error state when retry is called', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    // Error should be displayed
    expect(screen.getByTestId('error-recovery')).toBeInTheDocument()
    
    // Simulate retry - rerender with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    // After retry, should show normal content
    expect(screen.getByTestId('no-error')).toBeInTheDocument()
    expect(screen.queryByTestId('error-recovery')).not.toBeInTheDocument()
  })

  it('clears error state on retry', async () => {
    const user = userEvent.setup()
    let shouldThrow = true
    
    const TestComponent = () => (
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    )
    
    const { rerender } = render(<TestComponent />)
    
    // Error should be displayed
    expect(screen.getByTestId('error-recovery')).toBeInTheDocument()
    
    // Click retry button
    shouldThrow = false
    const retryButton = screen.getByText('Retry')
    await user.click(retryButton)
    
    // Re-render with no error
    rerender(<TestComponent />)
    
    // Should now show normal content
    expect(screen.queryByTestId('error-recovery')).not.toBeInTheDocument()
  })

  it('maintains error boundary behavior across multiple errors', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    // No error initially
    expect(screen.getByTestId('no-error')).toBeInTheDocument()
    
    // Trigger error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    // Error should be caught
    expect(screen.getByTestId('error-recovery')).toBeInTheDocument()
    
    // Trigger different error
    rerender(
      <ErrorBoundary>
        <div>{(() => { throw new Error('Different error'); })()}</div>
      </ErrorBoundary>
    )
    
    // Should still show error recovery
    expect(screen.getByTestId('error-recovery')).toBeInTheDocument()
  })
})