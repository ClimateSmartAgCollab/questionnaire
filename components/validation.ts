import { fields } from '@hookform/resolvers/ajv/src/__tests__/__fixtures__/data.js'
import { parseJsonToFormStructure } from './parser'

const fields = parseJsonToFormStructure()

function validateField(field: Field, userInput: string) {
    const { conformance, format, entryCodes, characterEncoding } = field.validationRules
  
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
    return true
  }
  