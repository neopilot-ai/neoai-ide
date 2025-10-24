export interface InsightsBlob {
  project: string;
  path: string;
  ref: string;
  contents: string;
  analysis?: BlobAnalysis;
}


export interface BlobAnalysis {
  explanation: string;
  code_flow: string;
  functions: string;
  classes: string;
  dependencies: string;
  security: string;
  performance_improvements: string;
  data_dictionary: string;
}