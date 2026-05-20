CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	FOREIGN KEY (`tenant_user_id`) REFERENCES `tenant_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_hash_unique` ON `session` (`token_hash`);