import { Root, Bundle, Dependency, Presentation } from './type'
import metadataJson from '../public/sampleQuestionnaire_V2.json'

// Normalize entry codes in dependencies
const normalizeEntryCodes = (dependencies: Dependency[]): void => {
  dependencies.forEach(dependency => {
    if (dependency.overlays?.entry_code?.attribute_entry_codes) {
      dependency.overlays.entry_code.attribute_entry_codes = Object.fromEntries(
        Object.entries(
          dependency.overlays.entry_code.attribute_entry_codes
        ).map(([key, value]) => [key, value || []])
      )
    }
  })
}

// Normalize entry codes in the JSON input file
normalizeEntryCodes(metadataJson.oca_bundle.dependencies)

// Convert JSON file to a typed Root object
const metadata: Root = metadataJson as Root

// Find a bundle or dependency by `capture_base`
const findBundleByCaptureBase = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[]
): Bundle | Dependency | null => {
  if (bundle.capture_base.d === captureBase) {
    return bundle
  }
  const dependency = dependencies.find(
    dep => dep.capture_base.d === captureBase
  )
  if (dependency) {
    return dependency
  }

  // Handle cases where the capture_base points to a "d" reference (indirect linking via "refs")
  const referenceDependency = dependencies.find(dep => dep.d === captureBase)
  if (referenceDependency) {
    return referenceDependency
  }

  return null
}

// Parse parent-child relationships
const parseRelationships = (
  bundle: Bundle,
  dependencies: Dependency[]
): Record<string, any> => {
  const relationships: Record<string, any> = {}
  const refsSeen: Set<string> = new Set()

  const addRelationships = (captureBase: string, parentRef: string | null) => {
    if (refsSeen.has(captureBase)) {
      return // Skip already processed IDs
    }
    refsSeen.add(captureBase)

    const entity = findBundleByCaptureBase(captureBase, bundle, dependencies)
    if (!entity) {
      console.warn(`Entity not found for capture_base: ${captureBase}`)
      return
    }

    // Extract `refs` attributes from capture_base
    const childRefs = Object.values(
      entity.capture_base.attributes || {}
    ).flatMap(attr => {
      if (typeof attr === 'string' && attr.startsWith('refs:')) {
        const refId = attr.replace('refs:', '')
        const refEntity = dependencies.find(dep => dep.d === refId)
        return refEntity ? refEntity.capture_base.d : []
      }
      return []
    })

    // Ensure children are processed and relationships are updated
    relationships[captureBase] = {
      id: captureBase,
      isParent: childRefs.length > 0,
      parent: parentRef,
      children: childRefs,
      fields: Object.keys(entity.capture_base.attributes || {})
    }

    childRefs.forEach(childRef => {
      addRelationships(childRef, captureBase) // Pass the current entity as the parent of its children
    })
  }

  // Iterate through all potential parents in the bundle and dependencies
  [bundle, ...dependencies].forEach(entity => {
    if (entity.capture_base && entity.capture_base.d) {
      addRelationships(entity.capture_base.d, null);
    }
  });
  
  return relationships
}

// Extract labels, options, and types for all languages using `capture_base`
const getLabelsOptionsAndTypes = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[]
): {
  labels: Record<string, Record<string, string>>
  options: Record<string, Record<string, string[]>>
  types: Record<string, any>
} => {
  const entity = findBundleByCaptureBase(captureBase, bundle, dependencies)

  if (!entity) {
    return { labels: {}, options: {}, types: {} }
  }

  const labels: Record<string, Record<string, string>> = {}
  const options: Record<string, Record<string, string[]>> = {}
  const types: Record<string, any> = {}

  // Collect labels for all languages
  ;(entity.overlays?.label || []).forEach((labelOverlay: any) => {
    const lang = labelOverlay.language
    labels[lang] = labelOverlay.attribute_labels || {}
  })

  // Collect options for all languages
  ;(entity.overlays?.entry || []).forEach((entryOverlay: any) => {
    const lang = entryOverlay.language
    options[lang] = Object.fromEntries(
      Object.entries(entryOverlay.attribute_entries || {}).map(
        ([key, value]) => [
          key,
          Object.values(value as { [key: string]: string })
        ]
      )
    )
  })

  // Collect types for all fields
  const attributes = entity.capture_base.attributes || {}
  const formats = entity.overlays?.format?.attribute_formats || {}
  const entryCodes = entity.overlays?.entry_code?.attribute_entry_codes || {}

  for (const [key, value] of Object.entries(attributes)) {
    const baseType = Array.isArray(value) ? value[0] : value // Use array type if applicable
    const format = formats[key] || null // Assign format if available, otherwise null
    const hasEntryCodes = key in entryCodes // Check if the field has entry codes

    let uiType = 'textarea' // Default UI type
    let orientation = null // Default orientation
    let fieldValue = '' // Default value

    if (hasEntryCodes) {
      uiType =
        entryCodes[key] && entryCodes[key].length > 3 ? 'dropdown' : 'radio'
      orientation = uiType === 'radio' ? 'vertical' : null // Vertical orientation for radio buttons
    } else {
      switch (baseType) {
        case 'Text':
          uiType = format
            ? format.includes('^[A-Z]')
              ? 'select'
              : 'textarea'
            : 'textarea'
          break
        case 'DateTime':
          uiType = 'DateTime'
          break
        case 'Numeric':
          uiType = 'number'
          break
        case 'Boolean':
          uiType = 'radio'
          orientation = 'horizontal' // Example orientation for boolean fields
          break
        default:
          if (baseType.startsWith('refs:')) {
            uiType = 'reference'
          }
          break
      }
    }

    types[key] = {
      type: uiType,
      orientation: orientation,
      value: fieldValue
    }
  }

  return { labels, options, types }
}

// Extract metadata (name and description) for each step
const getStepMeta = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[]
): { names: Record<string, string>; descriptions: Record<string, string> } => {
  const entity = findBundleByCaptureBase(captureBase, bundle, dependencies)

  if (!entity) {
    return { names: {}, descriptions: {} }
  }

  const meta = entity.overlays?.meta || []
  const names: Record<string, string> = {}
  const descriptions: Record<string, string> = {}

  meta.forEach((metaOverlay: any) => {
    names[metaOverlay.language] = metaOverlay.name || 'Unnamed Step'
    descriptions[metaOverlay.language] = metaOverlay.description || ''
  })

  return { names, descriptions }
}

// Main parser function to convert JSON into form structure
export const parseJsonToFormStructure = (): any[] => {
  const { bundle, dependencies } = metadata.oca_bundle

  const relationships = parseRelationships(bundle, dependencies)
  const allSteps: any[] = []

  Object.entries(relationships).forEach(([captureBase, relationship]) => {
    const { labels, options, types } = getLabelsOptionsAndTypes(
      captureBase,
      bundle,
      dependencies
    )
    const { names, descriptions } = getStepMeta(
      captureBase,
      bundle,
      dependencies
    )

    const fields = Object.keys(labels['eng'] || {}).map(fieldId => {
      const conformance =
        bundle.overlays?.conformance?.attribute_conformance?.[fieldId]
      const entryCodes =
        bundle.overlays?.entry_code?.attribute_entry_codes?.[fieldId]
      const characterEncoding =
        bundle.overlays?.character_encoding?.attribute_character_encoding?.[
          fieldId
        ]
      const format = bundle.overlays?.format?.attribute_formats?.[fieldId]

      // Filter labels and options for the specific fieldId
      const fieldLabels = Object.fromEntries(
        Object.entries(labels).map(([lang, langLabels]) => [
          lang,
          { [fieldId]: langLabels[fieldId] }
        ])
      )

      const fieldOptions = Object.fromEntries(
        Object.entries(options).map(([lang, langOptions]) => [
          lang,
          langOptions[fieldId] ? { [fieldId]: langOptions[fieldId] } : {}
        ])
      )
      let field = {
        id: fieldId,
        labels: fieldLabels,
        options: fieldOptions,
        type:
          types[fieldId]?.type ||
          (options['eng'][fieldId] ? 'enum' : 'textarea'),
        orientation: types[fieldId]?.orientation || null,
        value: types[fieldId]?.value || null,
        ref: null // Initialize ref
      }

      // Populate `ref` for reference fields
      if (field.type === 'reference' && relationship.children.length > 0) {
        field.ref = relationship.children[0] // Assign the first child as the reference
      }

      // Check conformance
      if (conformance === 'M' && !field.value) {
        console.warn(`Mandatory field missing: ${fieldId}`)
        field.value = '' // Default value for missing mandatory fields
      }

      // Validate entry codes
      if (entryCodes && !entryCodes.includes(field.value)) {
        console.warn(`Entry code mismatch for field ${fieldId}: ${field.value}`)
        field.value = entryCodes[0] // Default to the first valid entry code
      }

      // Validate character encoding
      if (
        characterEncoding &&
        !new RegExp(characterEncoding).test(field.value)
      ) {
        console.warn(
          `Character encoding mismatch for field ${fieldId}: ${field.value}`
        )
        field.value = '' // Clear value if encoding doesn't match
      }

      // Validate format
      if (format && !new RegExp(format).test(field.value)) {
        console.warn(`Format mismatch for field ${fieldId}: ${field.value}`)
        field.value = '' // Clear value if format doesn't match
      }

      return field
    })

    allSteps.push({
      id: captureBase,
      names,
      descriptions,
      parent: relationship.parent,
      fields
    })
  })

  // Deduplicate steps by ID
  const uniqueSteps = allSteps.filter(
    (step, index, self) => index === self.findIndex(s => s.id === step.id)
  )

  return uniqueSteps
}
