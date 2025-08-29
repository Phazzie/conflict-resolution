import { describe, it, expect, beforeEach, vi } from 'vitest'
import { couplesService } from '../../services/couples'
import { RelationshipGoal, CouplesPreferences, RelationshipMilestone } from '../../types/couples'

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key]
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {}
  })
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('CouplesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.store = {}
  })

  describe('Goal Management', () => {
    it('returns empty array when no goals exist', async () => {
      const goals = await couplesService.getGoals()
      expect(goals).toEqual([])
    })

    it('retrieves stored goals', async () => {
      const testGoals: RelationshipGoal[] = [
        {
          id: 'goal-1',
          title: 'Better Communication',
          description: 'Work on active listening skills',
          category: 'communication',
          priority: 'high',
          targetDate: Date.now() + 86400000,
          status: 'in-progress',
          createdAt: Date.now(),
          lastUpdated: Date.now(),
          milestones: []
        }
      ]
      
      mockLocalStorage.store['mixitfixit-couples-goals'] = JSON.stringify(testGoals)
      
      const goals = await couplesService.getGoals()
      expect(goals).toEqual(testGoals)
    })

    it('handles corrupted goal data gracefully', async () => {
      mockLocalStorage.store['mixitfixit-couples-goals'] = 'invalid-json'
      
      const goals = await couplesService.getGoals()
      expect(goals).toEqual([])
    })

    it('creates new goal with generated ID and timestamps', async () => {
      const goalData = {
        title: 'Weekly Date Nights',
        description: 'Schedule regular quality time together',
        category: 'quality-time' as const,
        priority: 'medium' as const,
        targetDate: Date.now() + 86400000,
        status: 'not-started' as const,
        milestones: []
      }

      const createdGoal = await couplesService.createGoal(goalData)

      expect(createdGoal.id).toBeDefined()
      expect(createdGoal.createdAt).toBeDefined()
      expect(createdGoal.lastUpdated).toBeDefined()
      expect(createdGoal.title).toBe(goalData.title)
    })

    it('saves goals to localStorage', async () => {
      const testGoals: RelationshipGoal[] = [
        {
          id: 'goal-1',
          title: 'Test Goal',
          description: 'Test Description',
          category: 'communication',
          priority: 'low',
          targetDate: Date.now(),
          status: 'completed',
          createdAt: Date.now(),
          lastUpdated: Date.now(),
          milestones: []
        }
      ]

      await couplesService.saveGoals(testGoals)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mixitfixit-couples-goals',
        JSON.stringify(testGoals)
      )
    })

    it('updates existing goal', async () => {
      const existingGoals = [
        {
          id: 'goal-1',
          title: 'Old Title',
          description: 'Old Description',
          category: 'communication' as const,
          priority: 'low' as const,
          targetDate: Date.now(),
          status: 'not-started' as const,
          createdAt: Date.now() - 86400000,
          lastUpdated: Date.now() - 86400000,
          milestones: []
        }
      ]

      mockLocalStorage.store['mixitfixit-couples-goals'] = JSON.stringify(existingGoals)

      const updates = {
        title: 'Updated Title',
        status: 'in-progress' as const
      }

      const updatedGoal = await couplesService.updateGoal('goal-1', updates)

      expect(updatedGoal.title).toBe('Updated Title')
      expect(updatedGoal.status).toBe('in-progress')
      expect(updatedGoal.lastUpdated).toBeGreaterThan(existingGoals[0].lastUpdated)
    })

    it('throws error when updating non-existent goal', async () => {
      await expect(
        couplesService.updateGoal('non-existent', { title: 'Updated' })
      ).rejects.toThrow('Goal not found')
    })

    it('deletes goal by ID', async () => {
      const existingGoals = [
        {
          id: 'goal-1',
          title: 'Goal to Delete',
          description: 'This will be deleted',
          category: 'communication' as const,
          priority: 'low' as const,
          targetDate: Date.now(),
          status: 'not-started' as const,
          createdAt: Date.now(),
          lastUpdated: Date.now(),
          milestones: []
        }
      ]

      mockLocalStorage.store['mixitfixit-couples-goals'] = JSON.stringify(existingGoals)

      await couplesService.deleteGoal('goal-1')

      const remainingGoals = await couplesService.getGoals()
      expect(remainingGoals).toEqual([])
    })
  })

  describe('Progress Tracking', () => {
    it('calculates goal progress correctly', async () => {
      const goalWithMilestones = {
        id: 'goal-1',
        title: 'Communication Goal',
        description: 'Improve our talks',
        category: 'communication' as const,
        priority: 'high' as const,
        targetDate: Date.now() + 86400000,
        status: 'in-progress' as const,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        milestones: [
          {
            id: 'milestone-1',
            title: 'Complete Session 1',
            completed: true,
            completedAt: Date.now() - 3600000,
            dueDate: Date.now() + 86400000
          },
          {
            id: 'milestone-2',
            title: 'Complete Session 2',
            completed: false,
            dueDate: Date.now() + 172800000
          }
        ]
      }

      mockLocalStorage.store['mixitfixit-couples-goals'] = JSON.stringify([goalWithMilestones])

      const progress = await couplesService.calculateGoalProgress('goal-1')

      expect(progress.completedMilestones).toBe(1)
      expect(progress.totalMilestones).toBe(2)
      expect(progress.percentageComplete).toBe(50)
    })

    it('returns zero progress for goal with no milestones', async () => {
      const goalWithoutMilestones = {
        id: 'goal-1',
        title: 'Simple Goal',
        description: 'No milestones',
        category: 'communication' as const,
        priority: 'low' as const,
        targetDate: Date.now(),
        status: 'not-started' as const,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        milestones: []
      }

      mockLocalStorage.store['mixitfixit-couples-goals'] = JSON.stringify([goalWithoutMilestones])

      const progress = await couplesService.calculateGoalProgress('goal-1')

      expect(progress.totalMilestones).toBe(0)
      expect(progress.percentageComplete).toBe(0)
    })
  })

  describe('Preferences Management', () => {
    it('returns default preferences when none exist', async () => {
      const preferences = await couplesService.getPreferences()
      
      expect(preferences.sessionFrequency).toBeDefined()
      expect(preferences.reminderSettings).toBeDefined()
      expect(preferences.privacyLevel).toBeDefined()
    })

    it('saves and retrieves preferences', async () => {
      const testPreferences: CouplesPreferences = {
        sessionFrequency: 'weekly',
        reminderSettings: {
          enabled: true,
          frequency: 'daily',
          timeOfDay: '19:00'
        },
        privacyLevel: 'high',
        aiPersonalityPreference: 'supportive',
        focusAreas: ['communication', 'intimacy'],
        goalCategories: ['communication', 'quality-time']
      }

      await couplesService.savePreferences(testPreferences)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mixitfixit-couples-preferences',
        JSON.stringify(testPreferences)
      )

      const retrievedPreferences = await couplesService.getPreferences()
      expect(retrievedPreferences).toEqual(testPreferences)
    })
  })

  describe('Milestone Management', () => {
    it('adds milestone to existing goal', async () => {
      const existingGoal = {
        id: 'goal-1',
        title: 'Test Goal',
        description: 'Test Description',
        category: 'communication' as const,
        priority: 'medium' as const,
        targetDate: Date.now(),
        status: 'in-progress' as const,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        milestones: []
      }

      mockLocalStorage.store['mixitfixit-couples-goals'] = JSON.stringify([existingGoal])

      const milestoneData = {
        title: 'First Milestone',
        dueDate: Date.now() + 86400000
      }

      const milestone = await couplesService.addMilestone('goal-1', milestoneData)

      expect(milestone.id).toBeDefined()
      expect(milestone.title).toBe('First Milestone')
      expect(milestone.completed).toBe(false)
    })

    it('completes milestone and updates timestamps', async () => {
      const goalWithMilestone = {
        id: 'goal-1',
        title: 'Test Goal',
        description: 'Test Description',
        category: 'communication' as const,
        priority: 'medium' as const,
        targetDate: Date.now(),
        status: 'in-progress' as const,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        milestones: [
          {
            id: 'milestone-1',
            title: 'Test Milestone',
            completed: false,
            dueDate: Date.now() + 86400000
          }
        ]
      }

      mockLocalStorage.store['mixitfixit-couples-goals'] = JSON.stringify([goalWithMilestone])

      const completedMilestone = await couplesService.completeMilestone('goal-1', 'milestone-1')

      expect(completedMilestone.completed).toBe(true)
      expect(completedMilestone.completedAt).toBeDefined()
    })

    it('throws error when completing non-existent milestone', async () => {
      const goalWithoutMilestone = {
        id: 'goal-1',
        title: 'Test Goal',
        description: 'Test Description',
        category: 'communication' as const,
        priority: 'medium' as const,
        targetDate: Date.now(),
        status: 'in-progress' as const,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        milestones: []
      }

      mockLocalStorage.store['mixitfixit-couples-goals'] = JSON.stringify([goalWithoutMilestone])

      await expect(
        couplesService.completeMilestone('goal-1', 'non-existent')
      ).rejects.toThrow('Milestone not found')
    })
  })

  describe('Analytics Generation', () => {
    it('generates comprehensive analytics', async () => {
      // Mock session history data
      const mockSessionHistory = [
        {
          id: 'session-1',
          timestamp: Date.now() - 86400000,
          outcome: 'resolved',
          duration: 1800000,
          conflictContext: 'relationship'
        },
        {
          id: 'session-2',
          timestamp: Date.now() - 172800000,
          outcome: 'stalemate',
          duration: 900000,
          conflictContext: 'relationship'
        }
      ]

      // Mock the session history service
      vi.doMock('../../services/sessionHistory', () => ({
        sessionHistoryService: {
          getAllSessions: vi.fn().mockResolvedValue(mockSessionHistory)
        }
      }))

      const analytics = await couplesService.generateAnalytics()

      expect(analytics.totalSessions).toBeDefined()
      expect(analytics.resolutionRate).toBeDefined()
      expect(analytics.averageSessionDuration).toBeDefined()
      expect(analytics.progressTrends).toBeDefined()
    })

    it('handles empty session history', async () => {
      vi.doMock('../../services/sessionHistory', () => ({
        sessionHistoryService: {
          getAllSessions: vi.fn().mockResolvedValue([])
        }
      }))

      const analytics = await couplesService.generateAnalytics()

      expect(analytics.totalSessions).toBe(0)
      expect(analytics.resolutionRate).toBe(0)
      expect(analytics.averageSessionDuration).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('handles localStorage errors gracefully', async () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded')
      })

      const testGoals: RelationshipGoal[] = [{
        id: 'goal-1',
        title: 'Test',
        description: 'Test',
        category: 'communication',
        priority: 'low',
        targetDate: Date.now(),
        status: 'not-started',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        milestones: []
      }]

      await expect(
        couplesService.saveGoals(testGoals)
      ).rejects.toThrow('Failed to save goals')
    })

    it('recovers from corrupted preference data', async () => {
      mockLocalStorage.store['mixitfixit-couples-preferences'] = 'corrupted-data'

      const preferences = await couplesService.getPreferences()
      
      // Should return default preferences
      expect(preferences.sessionFrequency).toBeDefined()
    })

    it('handles missing goals during update', async () => {
      // Empty goals storage
      await expect(
        couplesService.updateGoal('missing-goal', { title: 'Updated' })
      ).rejects.toThrow('Goal not found')
    })
  })

  describe('Data Validation', () => {
    it('validates goal data structure', async () => {
      const invalidGoalData = {
        title: '', // Invalid: empty title
        description: 'Valid description',
        category: 'invalid-category' as any,
        priority: 'super-high' as any,
        targetDate: 'invalid-date' as any,
        status: 'unknown-status' as any,
        milestones: []
      }

      await expect(
        couplesService.createGoal(invalidGoalData)
      ).rejects.toThrow()
    })

    it('validates milestone data', async () => {
      const existingGoal = {
        id: 'goal-1',
        title: 'Valid Goal',
        description: 'Valid Description',
        category: 'communication' as const,
        priority: 'medium' as const,
        targetDate: Date.now(),
        status: 'in-progress' as const,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        milestones: []
      }

      mockLocalStorage.store['mixitfixit-couples-goals'] = JSON.stringify([existingGoal])

      const invalidMilestone = {
        title: '', // Invalid: empty title
        dueDate: 'invalid-date' as any
      }

      await expect(
        couplesService.addMilestone('goal-1', invalidMilestone)
      ).rejects.toThrow()
    })
  })
})