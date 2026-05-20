CREATE TABLE `cash` (
	`id` text PRIMARY KEY NOT NULL,
	`opening_amount` integer DEFAULT 0 NOT NULL,
	`expected_closing_amount` integer,
	`actual_closing_amount` integer,
	`closed_at` text,
	`created_by_user_id` text NOT NULL,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `tenant_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `tenant_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deleted_by_user_id`) REFERENCES `tenant_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cash_movement` (
	`id` text PRIMARY KEY NOT NULL,
	`cash_id` text NOT NULL,
	`nature` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`created_by_user_id` text NOT NULL,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`cash_id`) REFERENCES `cash`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `tenant_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `tenant_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deleted_by_user_id`) REFERENCES `tenant_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `stock_movement` ADD `created_by_user_id` text NOT NULL REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `stock_movement` ADD `updated_by_user_id` text REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `stock_movement` ADD `deleted_by_user_id` text REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `client` ADD `created_by_user_id` text NOT NULL REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `client` ADD `updated_by_user_id` text REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `client` ADD `deleted_by_user_id` text REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `sale` ADD `created_by_user_id` text NOT NULL REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `sale` ADD `updated_by_user_id` text REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `sale` ADD `deleted_by_user_id` text REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `sale_items` ADD `created_by_user_id` text NOT NULL REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `sale_items` ADD `updated_by_user_id` text REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `sale_items` ADD `deleted_by_user_id` text REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `product` ADD `created_by_user_id` text NOT NULL REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `product` ADD `updated_by_user_id` text REFERENCES tenant_users(id);--> statement-breakpoint
ALTER TABLE `product` ADD `deleted_by_user_id` text REFERENCES tenant_users(id);