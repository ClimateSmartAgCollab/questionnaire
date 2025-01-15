// src/utils/steps.ts
import { Step, Field } from '../components/type'

// Build Step Tree Based on 'reference' Fields
export function buildStepTree(steps: Step[]): Step[] {
  const stepMap: Record<string, Step> = {}
  const rootSteps: Step[] = []

  // Initialize the map
  steps.forEach(step => {
    stepMap[step.id] = { ...step, children: [] }
  })

  // Populate children based on 'reference' fields
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

  // Identify root steps (ones not referenced by any other step)
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
  // Steps not referenced by anyone
  const rootStepIds = new Set<string>(steps.map(s => s.id))

  // Remove from rootStepIds any step that is referenced
  steps.forEach(step => {
    step.pages.forEach(page => {
      page.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.type === 'reference' && field.ref) {
            // This step is a child, so it's not a parent
            rootStepIds.delete(field.ref)
          }
        })
      })
    })
  })

  return steps.filter(step => rootStepIds.has(step.id))
}


// Find the step that references the given childId.
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


// validation for a field.

export function validateField(
  field: Field,
  userInput: string,
  language: string
): boolean {
  const { conformance, format, entryCodes, characterEncoding } =
    field.validation

  // Check if mandatory
  if (conformance === 'M' && !userInput) {
    return false
  }
  // Check format
  if (format && !new RegExp(format).test(userInput)) {
    return false
  }
  // Check entry codes
  if (entryCodes && entryCodes.length > 0 && !entryCodes.includes(userInput)) {
    return false
  }
  // Check character encoding
  if (characterEncoding && !new RegExp(characterEncoding).test(userInput)) {
    return false
  }
  // If enumerated options exist, ensure input is valid
  if (field.options[language] && field.options[language][field.id]) {
    const allowed = field.options[language][field.id]
    if (allowed.length > 0 && !allowed.includes(userInput)) {
      return false
    }
  }

  return true
}
