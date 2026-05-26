ALTER TABLE `payment` ADD `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL;--> statement-breakpoint
ALTER TABLE `payment` ADD `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL;--> statement-breakpoint
ALTER TABLE `payment` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `payment` ADD `created_by_user_id` text;--> statement-breakpoint
ALTER TABLE `payment` ADD `updated_by_user_id` text;--> statement-breakpoint
ALTER TABLE `payment` ADD `deleted_by_user_id` text;