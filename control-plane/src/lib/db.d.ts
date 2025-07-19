import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface EmailVerificationTokens {
  created_at: Generated<Timestamp>;
  email: string;
  expires_at: Timestamp;
  id: string;
  user_id: number;
}

export interface PasswordResetTokens {
  created_at: Generated<Timestamp>;
  email: string;
  expires_at: Timestamp;
  id: string;
  user_id: number;
}

export interface AccountDeletionTokens {
  created_at: Generated<Timestamp>;
  email: string;
  expires_at: Timestamp;
  id: string;
  user_id: number;
}

export interface HomeDirectorySizeHistory {
  id: Generated<number>;
  recorded_at: Generated<Timestamp>;
  size_bytes: number;
  user_id: number | null;
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
  email_verified_at: Timestamp | null;
  home_directory_size_bytes: Generated<number | null>;
  home_directory_size_bytes_updated_at: Timestamp | null;
  id: Generated<number>;
  login_name: string;
  password_hash: string;
  site_rendered_at: Timestamp | null;
  site_updated_at: Timestamp | null;
}

export interface DB {
  account_deletion_tokens: AccountDeletionTokens;
  email_verification_tokens: EmailVerificationTokens;
  home_directory_size_history: HomeDirectorySizeHistory;
  password_reset_tokens: PasswordResetTokens;
  sessions: Sessions;
  users: Users;
}
