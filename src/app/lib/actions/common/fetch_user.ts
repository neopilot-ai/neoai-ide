"use server";

import { getServerSession } from "next-auth";
import { NeoAiUser } from "./entities/user";
import { getCurrentUserWithToken, checkGroupMembership } from "./fetch_user_utils";

export { getCurrentUserWithToken, checkGroupMembership } from "./fetch_user_utils";

export async function getCurrentUser(): Promise<NeoAiUser> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Invalid session');
  }

  const { accessToken } = session;

  if (!accessToken) {
    throw new Error('Access token not found');
  }
  
  return await getCurrentUserWithToken(accessToken);
}