CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`login_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL,
	`site_updated_at` integer,
	`discoverable` integer DEFAULT 0 NOT NULL,
	`site_rendered_at` integer
);
