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

export interface HomeDirectoryExports {
  id: Generated<number>;
  user_id: number;
  status: Generated<string>;
  r2_key: string | null;
  size_bytes: number | null;
  download_expires_at: Timestamp | null;
  error_message: string | null;
  created_at: Generated<Timestamp>;
  started_at: Timestamp | null;
  completed_at: Timestamp | null;
}

export interface HomeDirectorySizeHistory {
  id: Generated<number>;
  recorded_at: Generated<Timestamp>;
  size_bytes: number;
  user_id: number | null;
}

export interface Pageviews {
  id: Generated<number>;
  user_id: number;
  timestamp: Generated<Timestamp>;
  path: Generated<string>;
  ip: string;
  referrer: string | null;
  user_agent: string | null;
}

export interface PageviewDailyStats {
  user_id: number;
  date: ColumnType<Date, Date | string, Date | string>;
  views: Generated<number>;
  unique_visitors: Generated<number>;
}

export interface EditDailyStats {
  user_id: number;
  date: ColumnType<Date, Date | string, Date | string>;
  edit_count: Generated<number>;
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
  last_activity_sent_at: Timestamp | null;
  login_name: string;
  password_hash: string;
  site_rendered_at: Timestamp | null;
  site_updated_at: Timestamp | null;
}

export interface UserKeys {
  user_id: number;
  key_type: string;
  private_key: unknown;
  public_key: unknown;
  created_at: Generated<Timestamp>;
}

export interface Followers {
  id: Generated<number>;
  user_id: number;
  actor_iri: string;
  inbox_iri: string;
  shared_inbox_iri: string | null;
  created_at: Generated<Timestamp>;
}

export interface Activities {
  id: string;
  user_id: number;
  type: string;
  payload: unknown;
  created_at: Generated<Timestamp>;
}

export interface DB {
  account_deletion_tokens: AccountDeletionTokens;
  activities: Activities;
  edit_daily_stats: EditDailyStats;
  email_verification_tokens: EmailVerificationTokens;
  followers: Followers;
  home_directory_exports: HomeDirectoryExports;
  home_directory_size_history: HomeDirectorySizeHistory;
  pageview_daily_stats: PageviewDailyStats;
  pageviews: Pageviews;
  password_reset_tokens: PasswordResetTokens;
  sessions: Sessions;
  user_keys: UserKeys;
  users: Users;
}
