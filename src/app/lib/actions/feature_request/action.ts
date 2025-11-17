"use server";
import clientPromise from "@/app/lib/mongodb";
import { getServerSession } from "next-auth";

const app = 'neoai-ide';

export interface FeatureRequest {
    type: 'feature' | 'bug';
    title: string;
    description: string;
}

export async function createFeatureRequest(request: FeatureRequest) {
  const client = await clientPromise;
  const db = client.db();
  const session = await getServerSession();
  if (!session) {
    return null
  }

  const { user } = session;
  
  const featureRequestCollection = db.collection('feature_requests');
  await featureRequestCollection.insertOne({
    app,
    ...request,
    timestamp: new Date(),
    name: user?.name,
    email: user?.email,
  });
}