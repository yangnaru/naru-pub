import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface HomeDirectorySizeHistory {
  id: Generated<number>;
  user_id: number;
  size_bytes: number;
  recorded_at: Timestamp;
}

export interface Sessions {
  expires_at: Timestamp;
  id: string;
  user_id: number;
}

export interface Users {
  created_at: Generated<Timestamp>;
  discoverable: Generated<boolean>;
  email: string | null;
  id: Generated<number>;
  login_name: string;
  password_hash: string;
  site_rendered_at: Timestamp | null;
  site_updated_at: Timestamp | null;
  home_directory_size_bytes: number;
  home_directory_size_bytes_updated_at: Timestamp | null;
}

export interface DB {
  home_directory_size_history: HomeDirectorySizeHistory;
  sessions: Sessions;
  users: Users;
}
