import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface Sessions {
  expires_at: Timestamp;
  id: string;
  user_id: number;
}

export interface Users {
  created_at: Generated<Timestamp>;
  email: string | null;
  id: Generated<number>;
  login_name: string;
  password_hash: string;
}

export interface DB {
  sessions: Sessions;
  users: Users;
}
