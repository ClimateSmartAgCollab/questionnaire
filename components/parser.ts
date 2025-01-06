import { Root, Bundle, Dependency, Presentation } from './type';
import metadataJson from '../public/sampleQuestionnaire_V2.json';

// Normalize entry codes in dependencies
const normalizeEntryCodes = (dependencies: Dependency[]): void => {
  dependencies.forEach((dependency) => {
    if (dependency.overlays?.entry_code?.attribute_entry_codes) {
      dependency.overlays.entry_code.attribute_entry_codes = Object.fromEntries(
        Object.entries(dependency.overlays.entry_code.attribute_entry_codes).map(([key, value]) => [
          key,
          value || [],
        ])
      );
    }
  });
};

// Normalize entry codes in the JSON input file
normalizeEntryCodes(metadataJson.oca_bundle.dependencies);

// Convert JSON file to a typed Root object
const metadata: Root = metadataJson as Root;

// Find a bundle or dependency by `capture_base`
const findBundleByCaptureBase = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[]
): Bundle | Dependency | null => {
  if (bundle.capture_base.d === captureBase) {
    return bundle;
  }
  const dependency = dependencies.find((dep) => dep.capture_base.d === captureBase);
  if (dependency) {
    return dependency;
  }

  //todo: This can be a potential bug! Optimize this code
  // Handle cases where the capture_base points to a "d" reference (indirect linking via "refs")
  const referenceDependency = dependencies.find((dep) => dep.d === captureBase);
  if (referenceDependency) {
    return referenceDependency;
  }

  return null;
};

// Extract interaction types for each field
const getInteractionTypes = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[]
): Record<string, any> => {
  const entity = findBundleByCaptureBase(captureBase, bundle, dependencies);

  if (!entity || !metadata.extensions?.form) {
    return {};
  }

  // Extract the interaction object for the current captureBase
  const interactions = metadata.extensions?.form.find(
    (form) => form.capture_base === captureBase
  )?.interaction?.[0]?.arguments || {};

  return interactions;
};



// Parse parent-child relationships
const parseRelationships = (
  bundle: Bundle,
  dependencies: Dependency[],
  presentation: Presentation
): Record<string, any> => {
  const relationships: Record<string, any> = {};
  const refsSeen: Set<string> = new Set();

  const addRelationships = (captureBase: string, parentRef: string | null) => {
    if (refsSeen.has(captureBase)) {
      return; // Skip already processed IDs
    }
    refsSeen.add(captureBase);

    const entity = findBundleByCaptureBase(captureBase, bundle, dependencies);
    if (!entity) {
      console.warn(`Entity not found for capture_base: ${captureBase}`);
      return;
    }

    // Extract `refs` attributes from capture_base
    const childRefs = Object.values(entity.capture_base.attributes || {}).flatMap((attr) => {
      if (typeof attr === 'string' && attr.startsWith('refs:')) {
        const refId = attr.replace('refs:', '');
        const refEntity = dependencies.find((dep) => dep.d === refId);
        return refEntity ? refEntity.capture_base.d : [];
      }
      return [];
    });

    // Ensure children are processed and relationships are updated
    relationships[captureBase] = {
      id: captureBase,
      isParent: childRefs.length > 0,
      parent: parentRef,
      children: childRefs,
      fields: Object.keys(entity.capture_base.attributes || {}),
    };

    childRefs.forEach((childRef) => {
      addRelationships(childRef, captureBase); // Pass the current entity as the parent of its children
    });
  };

  // Start parsing relationships from the presentation capture_base
  addRelationships(presentation.capture_base, null);

  return relationships;
};




// Extract labels, options, and types using `capture_base`
const getLabelsOptionsAndTypes = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[]
): { labels: Record<string, string>; options: Record<string, string[]>; types: Record<string, any> } => {
  const entity = findBundleByCaptureBase(captureBase, bundle, dependencies);

  if (!entity) {
    return { labels: {}, options: {}, types: {} };
  }

  // Use English labels (eng) for rendering
  const labels = entity.overlays?.label?.find((label: any) => label.language === 'eng')?.attribute_labels || {};

  // Normalize options (entry codes) and consider entry_code_order
  const entryOverlay = entity.overlays?.entry?.find((entry: any) => entry.language === 'eng');
  const options = entryOverlay?.attribute_entries
    ? Object.fromEntries(
        Object.entries(entryOverlay.attribute_entries).map(
          ([key, value]) => [key, Object.values(value)] // Use values (labels) instead of keys (codes)
        )
      )
    : {};

  // Reorder options based on entry_code_order if it exists
  const interaction = getInteractionTypes(captureBase, bundle, dependencies);
  Object.keys(options).forEach((key) => {
    if (interaction[key]?.entry_code_order) {
      options[key] = interaction[key].entry_code_order.map(
        (entry: string) => options[key].find((opt: string) => opt === entry) || entry
      );
    }
  });

  return { labels, options, types: interaction };
};

// Extract metadata (name and description) for each step
const getStepMeta = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[]
): { stepName: string; description: string } => {
  const entity = findBundleByCaptureBase(captureBase, bundle, dependencies);

  if (!entity) {
    return { stepName: 'Unnamed Step', description: '' };
  }

  const meta = entity.overlays?.meta?.find((meta: any) => meta.language === 'eng');
  const stepName = meta?.name || 'Unnamed Step';
  const description = meta?.description || '';

  return { stepName, description };
};

// Main parser function to convert JSON into form structure
export const parseJsonToFormStructure = (): any[] => {
  const { bundle, dependencies } = metadata.oca_bundle;
  const presentations = metadata.extensions?.form;

  if (!presentations || presentations.length === 0) {
    console.warn('No presentations found in the OCA package.');
    return [];
  }

  const allSteps: any[] = [];

  presentations.forEach((presentation) => {
    const relationships = parseRelationships(bundle, dependencies, presentation);

    Object.entries(relationships).forEach(([captureBase, relationship]) => {
      const { labels, options, types } = getLabelsOptionsAndTypes(captureBase, bundle, dependencies);
      const { stepName, description } = getStepMeta(captureBase, bundle, dependencies);

      const fields = Object.keys(labels).map((fieldId) => {
        const conformance = bundle.overlays?.conformance?.attribute_conformance?.[fieldId];
        const entryCodes = bundle.overlays?.entry_code?.attribute_entry_codes?.[fieldId];
        const characterEncoding = bundle.overlays?.character_encoding?.attribute_character_encoding?.[fieldId];
        const format = bundle.overlays?.format?.attribute_formats?.[fieldId];

        let field = {
          id: fieldId,
          label: labels[fieldId],
          type: types[fieldId]?.type || (options[fieldId] ? 'enum' : 'textarea'),
          options: options[fieldId] || [],
          ref: relationship.children[0] || null,
          orientation: types[fieldId]?.orientation || null,
          value: types[fieldId]?.value || null,
        };

        // Check conformance
        if (conformance === 'M' && !field.value) {
          console.warn(`Mandatory field missing: ${fieldId}`);
          field.value = ''; // Default value for missing mandatory fields
        }

        // Validate entry codes
        if (entryCodes && !entryCodes.includes(field.value)) {
          console.warn(`Entry code mismatch for field ${fieldId}: ${field.value}`);
          field.value = entryCodes[0]; // Default to the first valid entry code
        }

        // Validate character encoding
        if (characterEncoding && !new RegExp(characterEncoding).test(field.value)) {
          console.warn(`Character encoding mismatch for field ${fieldId}: ${field.value}`);
          field.value = ''; // Clear value if encoding doesn't match
        }

        // Validate format
        if (format && !new RegExp(format).test(field.value)) {
          console.warn(`Format mismatch for field ${fieldId}: ${field.value}`);
          field.value = ''; // Clear value if format doesn't match
        }

        return field;
      });

      allSteps.push({
        id: captureBase,
        name: stepName,
        description,
        parent: relationship.parent,
        fields,
      });
    });
  });

  // Deduplicate steps by ID
  const uniqueSteps = allSteps.filter(
    (step, index, self) => index === self.findIndex((s) => s.id === step.id)
  );

  return uniqueSteps;
};
