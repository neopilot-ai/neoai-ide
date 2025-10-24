"use server";

import { getServerSession } from "next-auth";
import { NEOAI_BASE_URL } from "./constants";
import { NeoAiUser } from "./entities/user";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { GroupMembership } from "./entities/group";

export async function getCurrentUserWithToken(accessToken: string): Promise<NeoAiUser> {
  const userResponse = await fetch(`${NEOAI_BASE_URL}/user`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch current user');
  }

  const user: NeoAiUser = await userResponse.json()
  return user
}

export async function getCurrentUser(): Promise<NeoAiUser> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Invalid session');
  }

  const { accessToken } = session;

  if (!accessToken) {
    throw new Error('Access token not found');
  }
  
  return await getCurrentUserWithToken(accessToken);
}

const NEOAI_ORG_GROUP_ID = 9970;

export async function checkGroupMembership(accessToken: string, userId: number): Promise<boolean> {
  try {
    const response = await fetch(`${NEOAI_BASE_URL}/groups/${NEOAI_ORG_GROUP_ID}/members/${userId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('Checking group membership response:', response.ok, 'user', userId);

    if (!response.ok) {
      return false;
    }

    const membership: GroupMembership = await response.json();

    if (membership.state === 'active' && membership.membership_state === 'active') {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error checking group membership:', error);
    return false;
  }
}