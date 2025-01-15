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
export const findBundleByCaptureBase = (
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

// Extract interaction types for each field
const getInteractionTypes = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[]
): Record<string, any> => {
  const entity = findBundleByCaptureBase(captureBase, bundle, dependencies)

  if (!entity || !metadata.extensions?.form) {
    return {}
  }

  // Extract the interaction object for the current captureBase
  const interactions =
    metadata.extensions?.form.find(form => form.capture_base === captureBase)
      ?.interaction?.[0]?.arguments || {}

  return interactions
}

// Parse parent-child relationships
const parseRelationships = (
  bundle: Bundle,
  dependencies: Dependency[],
  presentation: Presentation
): Record<string, any> => {
  const relationships: Record<string, any> = {}
  const refsSeen: Set<string> = new Set()

  const addRelationships = (captureBase: string, parentRef: string | null) => {
    
    // Avoid re-processing the same capture base
    if (refsSeen.has(captureBase)) return
    refsSeen.add(captureBase)

    const entity = findBundleByCaptureBase(captureBase, bundle, dependencies)
    if (!entity) {
      console.warn(`Entity not found for capture_base: ${captureBase}`)
      return
    }

    
    // 'childRefs' will collect all capture_bases that this entity references
    const childRefs: string[] = []

    // For example, you might store references as "refs:SOME_ID" in attributes
    // Adjust this logic to match your data
    Object.values(entity.capture_base.attributes || {}).forEach(attr => {
      if (typeof attr === 'string' && attr.startsWith('refs:')) {
        // Extract the reference ID and find the matching dependency
        const refId = attr.replace('refs:', '')
        const refEntity = dependencies.find(dep => dep.d === refId)
        if (refEntity) {
          childRefs.push(refEntity.capture_base.d)
        }
      }
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

  // Start parsing relationships from the presentation capture_base
  addRelationships(presentation.capture_base, null)

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
  const interaction =
    metadata.extensions?.form.find(form => form.capture_base === captureBase)
      ?.interaction?.[0]?.arguments || {}
  Object.keys(interaction).forEach(key => {
    types[key] = interaction[key]
  })

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

// Parse pages and sections from the presentation
const parsePresentation = (
  presentation: Presentation,
  labels: Record<string, Record<string, string>>,
  fields: any[]
) => {
  const getAllLabels = (labels: Record<string, Record<string, string>>, key: string) => {
    const result: Record<string, string> = {};
    Object.keys(labels).forEach(lang => {
      result[lang] = labels[lang]?.[key] || '';
    });
    return result;
  };

  const pages = presentation.page_order.map(pageKey => {
    const page = presentation.pages.find(p => p.named_section === pageKey);
    if (!page) return null;

    const sections = (page.attribute_order || []).map(sectionOrField => {
      if (typeof sectionOrField === 'string') {
        return {
          sectionKey: sectionOrField,
          sectionLabel: {}, // No label for standalone fields
          fields: fields.filter(f => f.id === sectionOrField)
        };
      } else if (typeof sectionOrField === 'object') {
        return {
          sectionKey: sectionOrField.named_section,
          sectionLabel: getAllLabels(presentation.page_labels, sectionOrField.named_section),
          fields: sectionOrField.attribute_order
            .map(fId => fields.find(f => f.id === fId))
            .filter(Boolean)
        };
      }
    });

    return {
      pageKey,
      pageLabel: getAllLabels(presentation.page_labels, pageKey),
      sections: sections.filter(Boolean),
      captureBase: presentation.capture_base
    };
  });

  return pages.filter(Boolean);
};


// Main parser function to convert JSON into form structure
export const parseJsonToFormStructure = (): any[] => {
  const { bundle, dependencies } = metadata.oca_bundle
  const presentations = metadata.extensions?.form

  if (!presentations || presentations.length === 0) {
    console.warn('No presentations found in the OCA package.')
    return []
  }

  const allSteps: Record<string, any> = {} // Use an object for deduplication

  presentations.forEach(presentation => {
    const relationships = parseRelationships(bundle, dependencies, presentation)

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
        const cardinality =
          bundle.overlays?.cardinality?.attribute_cardinality?.[fieldId]

        // Construct field-specific labels and options
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
          ref: null, // Initialize ref
          validation: {
            conformance,
            entryCodes,
            characterEncoding,
            format,
            cardinality // Include more rules if needed
          }
        }

        // Assign references for `reference` type fields
        if (field.type === 'reference') {
          // if your parseRelationships returned multiple children, decide which childRef to pick
          // For example, let's say you pick the first child from relationship.children:
          if (relationship.children.length > 0) {
            field.ref = relationship.children[0]
          }
        }

        return field
      })

      // Array to store unique presentations
      const uniquePresentations: Record<string, any>[] = []

      // console.log('parsePresentation presentation:\n', presentation)

      const pages = parsePresentation(presentation, labels, fields)

      // Extract unique capture_base values and push the associated presentation to the array
      const uniqueCaptureBases = new Set() // To track unique capture_base

      pages.forEach(page => {
        const captureBase = page?.captureBase || ''

        if (!uniqueCaptureBases.has(captureBase)) {
          uniqueCaptureBases.add(captureBase)
          uniquePresentations.push({
            captureBase,
            names,
            descriptions,
            parent: relationship.parent,
            pages: [page] // Initialize with the current page
          })
        } else {
          // If captureBase already exists, merge the pages with the existing presentation
          const existingPresentation = uniquePresentations.find(
            presentation => presentation.captureBase === captureBase
          )
          if (existingPresentation) {
            existingPresentation.pages.push(page)
          }
        }
      })

      // Add unique presentations to allSteps
      uniquePresentations.forEach(presentation => {
        const { captureBase, names, descriptions, parent, pages } = presentation

        if (!allSteps[captureBase]) {
          allSteps[captureBase] = {
            id: captureBase,
            names,
            descriptions,
            parent: relationship.parent || null,
            pages
          }
        } else {
          // Merge unique pages into the existing allSteps entry
          const existingPages = allSteps[captureBase].pages.map((page: any) => page.id)
          const newPages = pages.filter(
            (page: any) => !existingPages.includes(page.id)
          )
          allSteps[captureBase].pages = [
            ...allSteps[captureBase].pages,
            ...newPages
          ]
        }
      })
    })
  })

  // Convert steps object to an array
  return Object.values(allSteps)
}
