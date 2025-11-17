"use server";

import { getServerSession } from "next-auth";
import { parseNeoaiEpicUrl } from "../../utils";
import { redirect } from "next/navigation";
import { NEOAI_GRAPHQL_URL } from "../common/constants";
import { Epic, GraphQLEpicResponse, mapGraphQLResponseToEpic } from "../common/entities/epic";
import { EPIC_QUERY, MUTATE_EPIC_DESCRIPTION } from "../epic/epic_query";

export async function fetchEpic(url: string): Promise<Epic | null> {
  const session = await getServerSession();
  if (!session) {
    redirect('/api/auth/signout');
  }

  const { accessToken } = session;
  
  const { groupId, epicIid } = parseNeoaiEpicUrl(url);

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  
  try {
    const response = await fetch(NEOAI_GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: EPIC_QUERY,
        variables: {
          "groupFullPath": groupId,
          "workItemIID": epicIid
        }
      })
    })
    
    const graphqlEpic: GraphQLEpicResponse = await response.json();
    console.log('graphqlEpic', JSON.stringify(graphqlEpic));
    return mapGraphQLResponseToEpic(graphqlEpic);
  } catch (error) {
    console.error('Error fetching epic:', error);
    if ((error as Error).message?.includes('NeoAi API error')) {
      redirect('/api/auth/signout');
    }
  }

  return null;
}

export async function saveEpic(id: string, description: string) {
  const session = await getServerSession();
  if (!session) {
    redirect('/api/auth/signout');
  }

  const { accessToken } = session;

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  
  try {
    const response = await fetch(NEOAI_GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: MUTATE_EPIC_DESCRIPTION,
        variables: {
          "description": description,
          "workItemId": id
        }
      })
    })

    if (response.status !== 200) {
      const data = await response.json();
      console.error('NeoAi API error:', data);
      throw new Error(`NeoAi API error: ${data.message}`);
    }
  } catch (error) {
    console.error('Error saving epic:', error);
    throw(error);
  }
}
