PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sale` (
	`id` text PRIMARY KEY NOT NULL,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`client_id` integer,
	`settled_at` text,
	`cancelled_at` text,
	`cash_id` text NOT NULL,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cash_id`) REFERENCES `cash`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_sale`("id", "total_amount", "client_id", "settled_at", "cancelled_at", "cash_id", "created_by_user_id", "updated_by_user_id", "deleted_by_user_id", "created_at", "updated_at", "deleted_at") SELECT "id", "total_amount", "client_id", "settled_at", "cancelled_at", "cash_id", "created_by_user_id", "updated_by_user_id", "deleted_by_user_id", "created_at", "updated_at", "deleted_at" FROM `sale`;--> statement-breakpoint
DROP TABLE `sale`;--> statement-breakpoint
ALTER TABLE `__new_sale` RENAME TO `sale`;--> statement-breakpoint
PRAGMA foreign_keys=ON;