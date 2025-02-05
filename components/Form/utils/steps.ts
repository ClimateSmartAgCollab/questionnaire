// src/utils/steps.ts
import { Step, Field } from '../../type'
import { isValid__UTF8 } from '../hooks/useDynamicForm'

export function buildStepTree(steps: Step[]): Step[] {
  const stepMap: Record<string, Step> = {}
  const rootSteps: Step[] = []

  steps.forEach(step => {
    stepMap[step.id] = { ...step, children: [] }
  })

  steps.forEach(step => {
    step.pages.forEach(page => {
      page.sections.forEach(section => {
        section.fields
          .filter(field => field.type === 'reference' && field.ref)
          .forEach(field => {
            const child = stepMap[field.ref!]
            if (child) stepMap[step.id].children!.push(child)
          })
      })
    })
  })

  steps.forEach(step => {
    const isReferenced = steps.some(s =>
      s.pages.some(page =>
        page.sections.some(section =>
          section.fields.some(f => f.ref === step.id)
        )
      )
    )
    if (!isReferenced) {
      rootSteps.push(stepMap[step.id])
    }
  })

  return rootSteps
}

// Determine Which Steps Are "Parents" and Which Are "Children"
//    - Parent steps = NOT referenced by anyone (root steps).
//    - Child steps  = referenced by another step's 'reference' field.
export function getParentSteps(steps: Step[]): Step[] {
  const rootStepIds = new Set<string>(steps.map(s => s.id))

  steps.forEach(step => {
    step.pages.forEach(page => {
      page.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.type === 'reference' && field.ref) {
            rootStepIds.delete(field.ref)
          }
        })
      })
    })
  })

  return steps.filter(step => rootStepIds.has(step.id))
}

export function getReferencingStep(
  childId: string,
  steps: Step[]
): Step | undefined {
  return steps.find(step =>
    step.pages.some(page =>
      page.sections.some(section =>
        section.fields.some(field => field.ref === childId)
      )
    )
  )
}

export function validateField(
  field: Field,
  userInput: string | string[],
  language: string
): string | null {
  const { conformance, format, entryCodes, characterEncoding } =
    field.validation

    console.log("input", userInput)

  if (conformance === 'M' && !userInput) {
    return 'This field is required.'
  }

  if (typeof userInput === 'string') {
    if (format && !new RegExp(format).test(userInput)) {
      return `Please match the format: ${format}`
    }
    if (
      entryCodes &&
      entryCodes.length > 0 &&
      !entryCodes.includes(userInput)
    ) {
      return `Value must be one of: ${entryCodes.join(', ')}`
    }
    if (characterEncoding === 'utf-8') {
      if (!isValid__UTF8(userInput)) {
        return 'Invalid UTF-8 characters detected.'
      }
    }
    if (field.options[language] && field.options[language][field.id]) {
      const allowed = field.options[language][field.id]
      if (allowed.length > 0 && !allowed.includes(userInput)) {
        return `Value must be one of these: ${allowed.join(', ')}`
      }
    }
  } else if (
    Array.isArray(userInput) &&
    userInput.every(item => typeof item === 'string')
  ) {
    for (const item of userInput) {
      if (format && !new RegExp(format).test(item)) {
        return `Each item must match the format: ${format}`
      }
      if (entryCodes && entryCodes.length > 0 && !entryCodes.includes(item)) {
        return `Each item must be one of: ${entryCodes.join(', ')}`
      }
      if (characterEncoding === 'utf-8') {
        if (!isValid__UTF8(item)) {
          return 'Invalid UTF-8 characters detected in one or more items.'
        }
      }
      if (field.options[language] && field.options[language][field.id]) {
        const allowed = field.options[language][field.id]
        if (allowed.length > 0 && !allowed.includes(item)) {
          return `Each item must be one of these: ${allowed.join(', ')}`
        }
      }
    }
  }
  return null
}
