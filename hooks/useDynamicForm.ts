// src/hooks/useDynamicForm.ts
import { useState, useMemo, useCallback } from 'react'
import { Step } from '../components/type'
import {
  buildStepTree,
  getParentSteps,
  getReferencingStep,
  validateField,
} from '../utils/steps'

/**
 * Custom hook encapsulating form logic:
 * - language
 * - currentStep
 * - visitedSteps
 * - formData
 * - navigation (onNavigate, goToNextParent, goToPreviousParent, finishHandler, etc.)
 */
export function useDynamicForm(parsedSteps: Step[]) {
  const [language, setLanguage] = useState('eng')
  const [currentStep, setCurrentStep] = useState(0)
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(
    new Set([parsedSteps[0]?.id])
  )
  const [formData, setFormData] = useState<Record<string, any>>({})

  // Build the step tree
  const stepTree = useMemo(() => buildStepTree(parsedSteps), [parsedSteps])
  // Get parent steps
  const parentSteps = useMemo(() => getParentSteps(parsedSteps), [parsedSteps])

  // Navigate by index in the parsedSteps array
  const onNavigate = useCallback(
    (index: number) => {
      setCurrentStep(index)
      setVisitedSteps(prev => {
        const updated = new Set(prev)
        updated.add(parsedSteps[index]?.id)
        return updated
      })
    },
    [parsedSteps]
  )

  // Go to next parent step
  const goToNextParent = useCallback(() => {
    const currentStepId = parsedSteps[currentStep]?.id
    const currentParentIndex = parentSteps.findIndex(
      step => step.id === currentStepId
    )
    if (currentParentIndex >= 0 && currentParentIndex < parentSteps.length - 1) {
      const nextParentId = parentSteps[currentParentIndex + 1]?.id
      const nextStepIndex = parsedSteps.findIndex(s => s.id === nextParentId)
      if (nextStepIndex >= 0) {
        onNavigate(nextStepIndex)
      }
    }
  }, [currentStep, parentSteps, parsedSteps, onNavigate])

  // Go to previous parent step
  const goToPreviousParent = useCallback(() => {
    const currentStepId = parsedSteps[currentStep]?.id
    const currentParentIndex = parentSteps.findIndex(
      step => step.id === currentStepId
    )
    if (currentParentIndex > 0) {
      const previousParentId = parentSteps[currentParentIndex - 1]?.id
      const previousStepIndex = parsedSteps.findIndex(
        s => s.id === previousParentId
      )
      if (previousStepIndex >= 0) onNavigate(previousStepIndex)
    }
  }, [currentStep, parentSteps, parsedSteps, onNavigate])

  // Finish handling for a child step
  const finishHandler = useCallback(() => {
    const stepObj = parsedSteps[currentStep]
    if (!stepObj) return

    const currentStepData: Record<string, any> = {}

    // Collect data from pages -> sections -> fields
    stepObj.pages.forEach(page => {
      page.sections.forEach(section => {
        section.fields.forEach(field => {
          let userInput = ''

          if (field.type === 'radio') {
            const selectedRadio = document.querySelector(
              `input[name="${field.id}"]:checked`
            ) as HTMLInputElement | null
            userInput = selectedRadio?.value || ''
          } else {
            const input = document.querySelector(`[name="${field.id}"]`) as
              | HTMLInputElement
              | HTMLTextAreaElement
              | null
            userInput = input?.value || ''
          }

          // Validate input
          const isValid = validateField(field, userInput, language)
          if (!isValid) {
            console.warn(`Validation failed for field ${field.id}`)
            // In production, you'd handle this more gracefully.
          }

          currentStepData[field.id] = userInput
        })
      })
    })

    // Update global form data
    setFormData(prevData => ({
      ...prevData,
      [stepObj.id]: currentStepData,
    }))

    // If there's a referencing step, go back to it
    const referencingStep = getReferencingStep(stepObj.id, parsedSteps)
    if (referencingStep) {
      const referencingStepIndex = parsedSteps.findIndex(
        s => s.id === referencingStep.id
      )
      setCurrentStep(referencingStepIndex)
    } else {
      // Otherwise, go to first step or some fallback
      setCurrentStep(0)
    }

    // (Optional) Log everything
    console.log('Updated Form Data:', {
      ...formData,
      [stepObj.id]: currentStepData,
    })
  }, [currentStep, parsedSteps, formData, language])

  // Cancel -> also go back to first step or do custom logic
  const cancelHandler = useCallback(() => {
    setCurrentStep(0)
  }, [])

  // Helper to check if a step is a "parent step"
  const isParentStep = (step: Step) => parentSteps.some(p => p.id === step.id)

  return {
    language,
    setLanguage,
    currentStep,
    setCurrentStep,
    visitedSteps,
    formData,
    setFormData,
    stepTree,
    parentSteps,
    onNavigate,
    goToNextParent,
    goToPreviousParent,
    finishHandler,
    cancelHandler,
    isParentStep,
  }
}
