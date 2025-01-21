export interface Root {
  d: string;
  type: string;
  oca_bundle: OcaBundle;
  extensions?: Extensions;
  pages?: Page[];
  sections?: Section[];
  steps?: Step[];
  fields?: Field[];
}

export interface OcaBundle {
  v: string;
  bundle: Bundle;
  dependencies: Dependency[];
}

export interface Bundle {
  v: string;
  d: string;
  capture_base: CaptureBase;
  overlays: Overlays;
}

export interface CaptureBase {
  d: string;
  type: string;
  attributes: Record<string, any>;
  classification: string;
  flagged_attributes: any[];
}

export interface Overlays {
  cardinality?: Cardinality;
  character_encoding?: CharacterEncoding;
  conformance?: Conformance;
  entry?: Entry[];
  entry_code?: EntryCode;
  label?: Label[];
  meta?: Meta[];
  information?: Information[];
  format?: Format;
}

export interface Cardinality {
  d: string;
  capture_base: string;
  type: string;
  attribute_cardinality: Record<string, string>;
}

export interface CharacterEncoding {
  d: string;
  capture_base: string;
  type: string;
  attribute_character_encoding: Record<string, string | undefined>;
}

export interface Conformance {
  d: string;
  capture_base: string;
  type: string;
  attribute_conformance: Record<string, string | undefined>;
}

export interface Entry {
  d: string;
  capture_base: string;
  type: string;
  language: string;
  attribute_entries: Record<string, Record<string, string>>;
}

export interface EntryCode {
  d: string;
  capture_base: string;
  type: string;
  attribute_entry_codes: Record<string, string[] | undefined>;
}

export interface Label {
  d: string;
  capture_base: string;
  type: string;
  language: string;
  attribute_categories: any[];
  attribute_labels: Record<string, string>;
  category_labels: Record<string, string>;
}

export interface Meta {
  d: string;
  capture_base: string;
  type: string;
  language: string;
  description: string;
  name: string;
}

export interface Information {
  d: string;
  capture_base: string;
  type: string;
  language: string;
  attribute_information: Record<string, string>;
}

export interface Format {
  d: string;
  capture_base: string;
  type: string;
  attribute_formats: Record<string, string | undefined>;
}

export interface Dependency {
  v: string;
  d: string;
  capture_base: CaptureBase;
  overlays: Overlays;
}

export interface Extensions {
  example?: ExampleOverlay[];
  form: Presentation[];
}

export interface ExampleOverlay {
  d: string;
  capture_base: string;
  overlays: Example[];
}

export interface Example {
  d: string;
  capture_base: string;
  language: string;
  type: string;
  attribute_examples: Record<string, any>;
}

export interface Presentation {
  d: string;
  type: string;
  capture_base: string;
  language: string[];
  pages: Page[];
  page_order: string[];
  page_labels: Record<string, Record<string, string>>;
  interaction: Interaction[];
}

export interface Page {
  named_section: string;
  attribute_order: (string | AttributeOrder)[];
}

export interface AttributeOrder {
  named_section: string;
  attribute_order: string[];
}

export interface Interaction {
  arguments: Arguments;
}

export interface Arguments {
  [key: string]: ArgumentType;
}

export interface ArgumentType {
  type: string | string[] | Reference;
  orientation?: string;
  value?: string;
  ref?: string;
}

export interface Reference {
  type: string;
  ref: string;
}


export interface Field {
  id: string
  labels: Record<string, Record<string, string>> // Multilingual labels
  options: Record<string, Record<string, string[]>> // Multilingual options
  type: string
  orientation?: 'vertical' | 'horizontal'
  value?: string
  ref?: string
  validation: {
    conformance: 'M' | 'O'
    format?: string
    entryCodes?: string[]
    characterEncoding?: string
    cardinality?: string
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
  sections: Section[]
  captureBase: string
}

export interface Step {
  id: string
  names: Record<string, string>
  descriptions: Record<string, string>
  parent?: string | null
  pages: Page_parsed[]
  children?: Step[] // used by the buildStepTree if you want a hierarchical nav
}