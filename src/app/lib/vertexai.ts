const PROJECT_ID = "tkhandelwal-7239f9f8"
const LOCATION = "us-central1"
const MODEL_ID = "text-embedding-005"
const TASK = "RETRIEVAL_QUERY"


import { PredictionServiceClient } from '@google-cloud/aiplatform/build/src/v1';
import { protos } from '@google-cloud/aiplatform';


type Value = protos.google.protobuf.IValue;

interface EmbeddingOptions {
  project?: string;
  location?: string;
  model?: string;
  task?: string;
  dimensionality?: number;
  apiEndpoint?: string;
}

export async function getTextEmbeddings(
  texts: string | string[],
  options: EmbeddingOptions = {}
): Promise<number[]> {
  const {
    project = PROJECT_ID,
    location = LOCATION,
    model = MODEL_ID,
    task = TASK,
    dimensionality = 768,
    apiEndpoint = 'us-central1-aiplatform.googleapis.com',
  } = options;

  const serviceAccountJson = JSON.parse(process.env.SERVICE_ACCOUNT_JSON as string);

  if (!project || !location || !model || !task) {
    throw new Error('Missing required configuration parameters');
  }

  const clientOptions = { 
    apiEndpoint,
    credentials: serviceAccountJson
  };
  const endpoint = `projects/${project}/locations/${location}/publishers/google/models/${model}`;

  const client = new PredictionServiceClient(clientOptions);

  const instances: Value[] = Array.isArray(texts)
    ? texts.map(text => ({ 
        structValue: { 
          fields: {
            content: { stringValue: text },
            task_type: { stringValue: task }
          }
        }
      }))
    : [{ 
        structValue: { 
          fields: {
            content: { stringValue: texts },
            task_type: { stringValue: task }
          }
        }
      }];

  const parameters: Value = dimensionality > 0 
    ? { structValue: { fields: { outputDimensionality: { numberValue: dimensionality } } } }
    : {};

  try {
    const [response] = await client.predict({
      endpoint,
      instances,
      parameters,
    });

    if (!response.predictions || response.predictions.length === 0) {
      throw new Error('No predictions returned from the API');
    }

    const embeddings = response.predictions.map((prediction) => {
      const embeddingsField = prediction?.structValue?.fields?.embeddings;
      const valuesField = embeddingsField?.structValue?.fields?.values;
      return valuesField?.listValue?.values?.map((v) => v.numberValue ?? 0) ?? [];
    });

    return embeddings[0];
  } catch (error) {
    console.error('Error getting text embeddings:', error);
    throw error;
  }
}
