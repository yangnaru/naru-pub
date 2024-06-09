"use server";

import path from "path";

export async function getUserHomeDirectory(loginName: string) {
  return path.join(process.env.USER_HOME_DIRECTORY!, loginName);
}
