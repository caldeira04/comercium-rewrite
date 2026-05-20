CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	FOREIGN KEY (`tenant_user_id`) REFERENCES `tenant_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_hash_unique` ON `session` (`token_hash`);--> statement-breakpoint
CREATE TABLE `tenant_users` (
	`tenant_id` text NOT NULL,
	`login` text NOT NULL,
	`password` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_users_login_unique` ON `tenant_users` (`login`);--> statement-breakpoint
CREATE TABLE `subscription_status` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tenant` (
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`legal_name` text,
	`document` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`zipcode` text,
	`street` text,
	`state` text,
	`district` text,
	`city` text,
	`number` text,
	`country` text,
	`logo_url` text,
	`primary_color` text,
	`timezone` text DEFAULT 'America/Sao_Paulo' NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`plan_id` text,
	`subscription_status_id` text NOT NULL,
	`subscription_expire_date` text,
	`is_active` integer DEFAULT true,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text
);
