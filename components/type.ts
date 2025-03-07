import { string } from 'zod'

export interface Root {
  d: string
  type: string
  oca_bundle: OcaBundle
  extensions?: Extensions
  pages?: Page[]
  sections?: Section[]
  steps?: Step[]
  fields?: Field[]
}

export interface OcaBundle {
  v: string
  bundle: Bundle
  dependencies: Dependency[]
}

export interface Bundle {
  v: string
  d: string
  capture_base: CaptureBase
  overlays: Overlays
}

export interface CaptureBase {
  d: string
  type: string
  attributes: Record<string, any>
  classification: string
  flagged_attributes: any[]
}

export interface Overlays {
  cardinality?: Cardinality
  character_encoding?: CharacterEncoding
  conformance?: Conformance
  entry?: Entry[]
  entry_code?: EntryCode
  label?: Label[]
  meta?: Meta[]
  information?: Information[]
  format?: Format
}

export interface Cardinality {
  d: string
  capture_base: string
  type: string
  attribute_cardinality: Record<string, string>
}

export interface CharacterEncoding {
  d: string
  capture_base: string
  type: string
  attribute_character_encoding: Record<string, string | undefined>
}

export interface Conformance {
  d: string
  capture_base: string
  type: string
  attribute_conformance: Record<string, string | undefined>
}

export interface Entry {
  d: string
  capture_base: string
  type: string
  language: string
  attribute_entries: Record<string, Record<string, string>>
}

export interface EntryCode {
  d: string
  capture_base: string
  type: string
  attribute_entry_codes: Record<string, string[] | undefined>
}

export interface Label {
  d: string
  capture_base: string
  type: string
  language: string
  attribute_categories: any[]
  attribute_labels: Record<string, string>
  category_labels: Record<string, string>
}

export interface Meta {
  d: string
  capture_base: string
  type: string
  language: string
  description: string
  name: string
}

export interface Information {
  d: string
  capture_base: string
  type: string
  language: string
  attribute_information: Record<string, string>
}

export interface Format {
  d: string
  capture_base: string
  type: string
  attribute_formats: Record<string, string | undefined>
}

export interface Dependency {
  v: string
  d: string
  capture_base: CaptureBase
  overlays: Overlays
}

export interface Extensions {
  example?: ExampleOverlay[]
  form: Presentation[]
}

export interface ExampleOverlay {
  d: string
  capture_base: string
  overlays: Example[]
}

export interface Example {
  d: string
  capture_base: string
  language: string
  type: string
  attribute_examples: Record<string, any>
}

export interface Presentation {
  d: string
  type: string
  capture_base: string
  language: string[]
  pages: Page[]
  page_order: string[]
  page_labels: Record<string, Record<string, string>>
  sidebar_label: Record<string, Record<string, string>>
  subheading: Record<string, Record<string, string>>
  title?: Record<string, Record<string, string>>
  interaction: Interaction[]
}

export interface Page {
  named_section: string
  attribute_order: (string | AttributeOrder)[]
}

export interface AttributeOrder {
  named_section: string
  attribute_order: string[]
}

export interface Interaction {
  arguments: Arguments
}

export interface Arguments {
  [key: string]: ArgumentType
}

export interface ArgumentType {
  type: string | string[] | Reference
  orientation?: string
  value?: string
  ref?: string
}

export interface Reference {
  type: string
  ref: string
}

export interface Field {
  id: string
  labels: Record<string, Record<string, string>> 
  options: Record<string, Record<string, string[]>> 
  type: string
  orientation?: 'vertical' | 'horizontal'
  value?: string
  ref?: string
  placeholder?: Record<string, string>
  reference_button_text?: Record<string, string>
  showing_attribute?: string[]
  validation: {
    conformance: 'M' | 'O'
    format?: string
    entryCodes?: string[]
    characterEncoding?: string
    cardinality?: { min: number; max: number }
  }
}

export interface Section {
  sectionKey: string
  sectionLabel: Record<string, string>
  fields: Field[]
}

export interface Page_parsed {
  pageKey: string
  pageLabel: Record<string, string>
  subheading: Record<string, string>
  sidebar_label: Record<string, string>
  sections: Section[]
  captureBase: string
}

export interface Step {
  id: string
  names: Record<string, string>
  descriptions: Record<string, string>
  parent?: string | null
  pages: Page_parsed[]
  children?: Step[] 
  sidebar_label?: Record<string, string>
  title?: Record<string, string>
  subheading?: Record<string, string>
}



export interface ChildQuestion {
  id: string;
  label: string;
  type: string;
  answer: any;
}

export interface QuestionChild {
  childId: string;
  questions: ChildQuestion[];
}

export interface Question {
  id: string;
  label: string;
  type: string;
  answer: any;
  children?: QuestionChild[];
}

export interface Submission {
  data: {
    id: string;
    type: string;
    attributes: {
      doi: string;
      prefix: string;
      suffix: string;
      identifiers: any[];
      alternateIdentifiers: {
        alternateIdentifier: string;
        alternateIdentifierType: string;
      }[];
      creators: {
        name: string;
        nameType: string;
        affiliation: { name: string }[];
        nameIdentifiers: {
          schemeUri: string | null;
          nameIdentifier: string;
          nameIdentifierScheme: string;
        }[];
      }[];
      titles: {
        lang: string | null;
        title: string;
        titleType: string | null;
      }[];
      publisher: {
        name: string;
      };
      container: Record<string, any>;
      publicationYear: number;
      subjects: {
        subject: string;
        valueUri: string | null;
        schemeUri: string | null;
        subjectScheme: string | null;
      }[];
      contributors: {
        name: string;
        nameType: string;
        affiliation: { name: string }[];
        contributorType: string;
        nameIdentifiers: {
          schemeUri: string | null;
          nameIdentifier: string;
          nameIdentifierScheme: string;
        }[];
      }[];
      dates: { date: string; dateType: string }[];
      language: string | null;
      types: {
        ris: string;
        bibtex: string;
        citeproc: string;
        schemaOrg: string;
        resourceTypeGeneral: string;
      };
      relatedIdentifiers: {
        relatedIdentifier: string;
        relatedIdentifierType: string;
        relationType: string;
        relatedMetadataScheme: string;
        schemeType: string;
        schemeUri: string;
      }[];
      relatedItems: any[];
      sizes: string[];
      formats: string[];
      version: string;
      rightsList: {
        rights: string | null;
        rightsUri: string | null;
        schemeUri: string | null;
        rightsIdentifier: string | null;
        rightsIdentifierScheme: string | null;
      }[];
      descriptions: {
        lang: string | null;
        description: string;
        descriptionType: string;
      }[];
      geoLocations: any[];
      fundingReferences: any[];
      xml: string;
      url: string | null;
      contentUrl: string | null;
      metadataVersion: number;
      schemaVersion: string;
      source: string;
      isActive: boolean;
      state: string;
      reason: string | null;
      viewCount: number;
      viewsOverTime: any[];
      downloadCount: number;
      downloadsOverTime: any[];
      referenceCount: number;
      citationCount: number;
      citationsOverTime: any[];
      partCount: number;
      partOfCount: number;
      versions: { data: any[] };
      versionOf: { data: any[] };
      created: string | null;
      registered: string | null;
      published: string;
      updated: string;
    };
  };
}