"use server";

import fs from "fs";
import { cookies } from "next/headers";
import { lucia, validateRequest } from "../auth";
import { db } from "../database";
import { hash, verify } from "@node-rs/argon2";
import { redirect } from "next/navigation";
import { getUserHomeDirectory } from "../server-utils";
import path from "path";
import { DEFAULT_INDEX_HTML } from "../const";

async function prepareUserHomeDirectory(userName: string) {
  // Create user directory if it does not exist
  const userHomeDirectory = await getUserHomeDirectory(userName);
  if (!fs.existsSync(userHomeDirectory)) {
    fs.mkdirSync(userHomeDirectory);
  }

  // if index.html does not exist, create it
  const indexHtml = path.join(
    process.env.USER_HOME_DIRECTORY!,
    userName,
    "index.html"
  );
  if (!fs.existsSync(indexHtml)) {
    fs.writeFileSync(indexHtml, DEFAULT_INDEX_HTML);
  }
}

export async function signUp(login_name: string, password: string) {
  const password_hash = await hash(password);

  await prepareUserHomeDirectory(login_name);

  const user = await db
    .insertInto("users")
    .values({
      login_name: login_name.toLowerCase(),
      password_hash,
    })
    .returningAll()
    .execute();

  const session = await lucia.createSession(user[0].id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  redirect("/");
}

export async function login(login_name: string, password: string) {
  const { user } = await validateRequest();

  if (user) {
    return redirect("/");
  }

  const existingUser = await db
    .selectFrom("users")
    .selectAll()
    .where("login_name", "=", login_name)
    .executeTakeFirst();

  if (!existingUser) {
    return false;
  }

  const passwordVerified = await verify(existingUser.password_hash, password);

  if (!passwordVerified) {
    return false;
  }

  await prepareUserHomeDirectory(login_name);

  const session = await lucia.createSession(existingUser.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return true;
}

export async function logout() {
  const { session } = await validateRequest();
  if (!session) {
    return {
      error: "Unauthorized",
    };
  }

  await lucia.invalidateSession(session.id);

  const sessionCookie = lucia.createBlankSessionCookie();
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return redirect("/");
}

export async function deleteAccount() {
  const { user, session } = await validateRequest();
  if (!user) {
    return {
      error: "Unauthorized",
    };
  }

  // Delete user directory
  const userHomeDirectory = await getUserHomeDirectory(user.loginName);
  fs.rmSync(userHomeDirectory, { recursive: true });

  await db.deleteFrom("users").where("id", "=", user.id).execute();

  await lucia.invalidateSession(session.id);

  const sessionCookie = lucia.createBlankSessionCookie();
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return redirect("/");
}

export async function setDiscoverable(discoverable: boolean) {
  const { user } = await validateRequest();
  if (!user) {
    return false;
  }

  await db
    .updateTable("users")
    .set("discoverable", discoverable)
    .where("id", "=", user.id)
    .execute();

  return true;
}
