import { Root, Bundle, Dependency, Presentation } from './type'
// import metadataJson from '../public/getting_to_know_single_level_presentation.json'
// import metadataJson from '../public/sampleQuestionnaire_V2.json'
// import metadataJson from '../public/multi_level_package_presentation.json'
// import metadataJson from '../public/OpenAIRE_OCA_package.json'
import metadataJson from '../public/test.json'

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

normalizeEntryCodes(metadataJson.oca_bundle.dependencies)

const metadata: Root = metadataJson as Root

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

  const referenceDependency = dependencies.find(dep => dep.d === captureBase)
  if (referenceDependency) {
    return referenceDependency
  }

  return null
}

const getInteractionTypes = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[]
): Record<string, any> => {
  const entity = findBundleByCaptureBase(captureBase, bundle, dependencies)

  if (!entity || !metadata.extensions?.form) {
    return {}
  }

  const interactions =
    metadata.extensions?.form.find(form => form.capture_base === captureBase)
      ?.interaction?.[0]?.arguments || {}

  return interactions
}

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

    const childRefs: string[] = []
    const refMap: Record<string, string> = {}

    Object.entries(entity.capture_base.attributes || {}).forEach(
      ([attrKey, attrValue]) => {
        if (typeof attrValue === 'string' && attrValue.startsWith('refs:')) {
          const refId = attrValue.replace('refs:', '')

          const refEntity = dependencies.find(dep => dep.d === refId)
          if (refEntity) {
            childRefs.push(refEntity.capture_base.d)
            refMap[attrKey] = refEntity.capture_base.d
          }
        }
      }
    )

    relationships[captureBase] = {
      id: captureBase,
      isParent: childRefs.length > 0,
      parent: parentRef,
      children: childRefs,
      fields: Object.keys(entity.capture_base.attributes || {}),
      refsMap: refMap
    }

    childRefs.forEach(childRef => {
      addRelationships(childRef, captureBase)
    })
  }

  addRelationships(presentation.capture_base, null)

  return relationships
}

const getLabelsOptionsAndTypes = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[]
): {
  labels: Record<string, Record<string, string>>
  options: Record<string, Record<string, string[]>>
  types: Record<string, any>
  cardinalityRules: Record<string, any>
  conformance: Record<string, any>
  entryCodes: Record<string, any>
  characterEncoding: Record<string, any>
  format: Record<string, any>
} => {
  const entity = findBundleByCaptureBase(captureBase, bundle, dependencies)

  if (!entity) {
    return {
      labels: {},
      options: {},
      types: {},
      cardinalityRules: {},
      conformance: {},
      entryCodes: {},
      characterEncoding: {},
      format: {}
    }
  }

  const labels: Record<string, Record<string, string>> = {}
  const options: Record<string, Record<string, string[]>> = {}
  const types: Record<string, any> = {}
  const cardinalityRules: Record<string, any> = {}
  const conformance: Record<string, any> = {}
  const entryCodes: Record<string, string[] | undefined> = {}
  const characterEncoding: Record<string, any> = {}
  const format: Record<string, any> = {}

  ;(entity.overlays?.label || []).forEach((labelOverlay: any) => {
    const lang = labelOverlay.language
    labels[lang] = labelOverlay.attribute_labels || {}
  })
  ;(entity.overlays?.entry || []).forEach((entryOverlay: any) => {
    const lang = entryOverlay.language
    options[lang] = entryOverlay.attribute_entries || {}
  })

  if (entity.overlays?.cardinality) {
    const cardinalityOverlay = entity.overlays.cardinality
    Object.entries(cardinalityOverlay.attribute_cardinality).forEach(
      ([key, range]) => {
        const parts = range.split('-')
        const min = parts[0] && !isNaN(Number(parts[0])) ? Number(parts[0]) : 0
        const max =
          parts[1] && !isNaN(Number(parts[1]))
            ? Number(parts[1])
            : 999999999999999999
        cardinalityRules[key] = { min, max }
      }
    )
  }

  const interaction =
    metadata.extensions?.form.find(form => form.capture_base === captureBase)
      ?.interaction?.[0]?.arguments || {}
  Object.keys(interaction).forEach(key => {
    types[key] = interaction[key]
  })

  // Collect conformance
  if (entity.overlays?.conformance?.attribute_conformance) {
    const conformanceOverlay = entity.overlays.conformance.attribute_conformance
    Object.entries(conformanceOverlay).forEach(([fieldId, confValue]) => {
      conformance[fieldId] = confValue
    })
  }

  // Collect entry codes
  if (entity.overlays?.entry_code) {
    const entryCodeOverlay = entity.overlays.entry_code
    Object.entries(entryCodeOverlay.attribute_entry_codes).forEach(
      ([fieldId, codes]) => {
        entryCodes[fieldId] = codes
      }
    )
  }

  // Collect character encoding
  if (entity.overlays?.character_encoding?.attribute_character_encoding) {
    const encodingOverlay =
      entity.overlays.character_encoding.attribute_character_encoding
    Object.entries(encodingOverlay).forEach(([fieldId, encValue]) => {
      characterEncoding[fieldId] = encValue
    })
  }

  // Collect format
  if (entity.overlays?.format?.attribute_formats) {
    const formatOverlay = entity.overlays.format.attribute_formats
    Object.entries(formatOverlay).forEach(([fieldId, fmtValue]) => {
      format[fieldId] = fmtValue
    })
  }

  return {
    labels,
    options,
    types,
    cardinalityRules,
    conformance,
    entryCodes,
    characterEncoding,
    format
  }
}

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

// Helper: gets all labels from an overlay by page/section key
const getAllLabels = (
  labelsObj: Record<string, Record<string, string>> | undefined,
  key: string
) => {
  const result: Record<string, string> = {}
  if (!labelsObj) return result
  Object.keys(labelsObj).forEach(lang => {
    result[lang] = labelsObj[lang]?.[key] || ''
  })
  return result
}

const parsePresentation = (
  presentation: Presentation,
  labels: Record<string, Record<string, string>>,
  fields: any[]
) => {
  const pages = presentation.page_order.map(pageKey => {
    const page = presentation.pages.find(p => p.named_section === pageKey)
    if (!page) return null

    const sections = (page.attribute_order || []).map(sectionOrField => {
      if (typeof sectionOrField === 'string') {
        return {
          sectionKey: sectionOrField,
          sectionLabel: {}, // no overlay for a simple string
          fields: fields.filter(f => f.id === sectionOrField)
        }
      } else if (typeof sectionOrField === 'object') {
        return {
          sectionKey: sectionOrField.named_section,
          sectionLabel: getAllLabels(
            presentation.page_labels,
            sectionOrField.named_section
          ),
          fields: sectionOrField.attribute_order
            .map(fId => fields.find(f => f.id === fId))
            .filter(Boolean)
        }
      }
    })

    return {
      pageKey,
      pageLabel: getAllLabels(presentation.page_labels, pageKey),
      sidebar_label: getAllLabels(presentation.sidebar_label, pageKey),
      subheading: getAllLabels(presentation.subheading, pageKey),
      sections: sections.filter(Boolean),
      captureBase: presentation.capture_base
    }
  })

  return pages.filter(Boolean)
}

export const parseJsonToFormStructure = (): any[] => {
  const { bundle, dependencies } = metadata.oca_bundle
  const presentations = metadata.extensions?.form

  const mainCaptureBase = bundle.capture_base.d

  const presentationsSorted = (metadata.extensions?.form || []).sort((a, b) => {
    if (
      a.capture_base === mainCaptureBase &&
      b.capture_base !== mainCaptureBase
    ) {
      return -1
    }
    if (
      b.capture_base === mainCaptureBase &&
      a.capture_base !== mainCaptureBase
    ) {
      return 1
    }
    return 0
  })

  if (!presentationsSorted || presentationsSorted.length === 0) {
    console.warn('No presentations found in the OCA package.')
    return []
  }


  let mainTitle: Record<string, string> = { eng: '', fra: '' }
  const mainPresentation = presentationsSorted.find(
    pres => pres.capture_base === mainCaptureBase
  )
  if (mainPresentation && mainPresentation.title) {
    mainTitle = {
      eng: typeof mainPresentation.title.eng === 'string' ? mainPresentation.title.eng : '',
      fra: typeof mainPresentation.title.fra === 'string' ? mainPresentation.title.fra : ''
    }
  }
  
  const allSteps: Record<string, any> = {}
  presentationsSorted.forEach(presentation => {
    const relationships = parseRelationships(bundle, dependencies, presentation)

    Object.entries(relationships).forEach(([captureBase, relationship]) => {
      const {
        labels,
        options,
        types,
        cardinalityRules,
        conformance,
        entryCodes,
        characterEncoding,
        format
      } = getLabelsOptionsAndTypes(captureBase, bundle, dependencies)
      const { names, descriptions } = getStepMeta(
        captureBase,
        bundle,
        dependencies
      )

      const fields = Object.keys(labels['eng'] || {}).map(fieldId => {
        // Build labels per language for this field
        const fieldLabels = Object.fromEntries(
          Object.entries(labels).map(([lang, langLabels]) => [
            lang,
            { [fieldId]: langLabels[fieldId] }
          ])
        )

        const fieldOptions = Object.fromEntries(
          Object.entries(options).map(([lang, langOptions]) => [
            lang,
            langOptions[fieldId] || {}
          ])
        )

        let field: any = {
          id: fieldId,
          labels: fieldLabels,
          options: fieldOptions,
          type:
            types[fieldId]?.type ||
            (options['eng'][fieldId] ? 'enum' : 'textarea'),
          orientation: types[fieldId]?.orientation || null,
          value: types[fieldId]?.value || null,
          ref: null,
          validation: {
            conformance: conformance[fieldId],
            entryCodes: entryCodes[fieldId],
            characterEncoding: characterEncoding[fieldId],
            format: format[fieldId],
            cardinality: cardinalityRules[fieldId]
          }
        }

        if (types[fieldId]?.reference_button_text) {
          field.reference_button_text = types[fieldId].reference_button_text
        }
        if (types[fieldId]?.showing_attribute) {
          field.showing_attribute = types[fieldId].showing_attribute
        }
        if (types[fieldId]?.placeholder) {
          field.placeholder = types[fieldId].placeholder
        }

        if (field.type === 'reference') {
          const refMap = relationships[captureBase].refsMap
          if (refMap && refMap[fieldId]) {
            field.ref = refMap[fieldId]
          }
        }

        return field
      })

      const uniquePresentations: Record<string, any>[] = []

      // console.log('parsePresentation presentation:\n', presentation)

      const pages = parsePresentation(presentation, labels, fields)

      const uniqueCaptureBases = new Set()

      pages.forEach(page => {
        const capBase = page?.captureBase || ''
        if (!uniqueCaptureBases.has(capBase)) {
          uniqueCaptureBases.add(capBase)
          uniquePresentations.push({
            captureBase: capBase,
            names,
            descriptions,
            parent: relationship.parent,
            pages: [page]
          })
        } else {
          const existingPresentation = uniquePresentations.find(
            pres => pres.captureBase === capBase
          )
          if (existingPresentation) {
            existingPresentation.pages.push(page)
          }
        }
      })

      uniquePresentations.forEach(pres => {
        const { captureBase, names, descriptions, parent, pages } = pres
        if (!allSteps[captureBase]) {
          allSteps[captureBase] = {
            id: captureBase,
            title: captureBase === mainCaptureBase ? mainTitle : '',
            names,
            descriptions,
            parent: relationship.parent || null,
            pages
          }
        } else {
          const existingPages = allSteps[captureBase].pages.map(
            (page: any) => page.id
          )
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

  return Object.values(allSteps)
}
