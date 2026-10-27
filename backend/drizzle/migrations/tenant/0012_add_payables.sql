CREATE TABLE `bank_account` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'checking' NOT NULL,
	`bank_name` text,
	`agency` text,
	`account_number` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `bank_account_name_idx` ON `bank_account` (`name`);--> statement-breakpoint
CREATE TABLE `expense_category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expense_category_name_unique` ON `expense_category` (`name`);--> statement-breakpoint
CREATE TABLE `payable` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`due_date` text NOT NULL,
	`paid_date` text,
	`payment_method` text,
	`payee_id` text,
	`category_id` text,
	`bank_account_id` text,
	`notes` text,
	`origin` text DEFAULT 'manual' NOT NULL,
	`stock_movement_id` text,
	`installment_number` integer DEFAULT 1 NOT NULL,
	`installment_count` integer DEFAULT 1 NOT NULL,
	`group_id` text,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`payee_id`) REFERENCES `payee`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `expense_category`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`bank_account_id`) REFERENCES `bank_account`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`stock_movement_id`) REFERENCES `stock_movement`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `payable_due_date_idx` ON `payable` (`due_date`);--> statement-breakpoint
CREATE INDEX `payable_paid_date_idx` ON `payable` (`paid_date`);--> statement-breakpoint
CREATE INDEX `payable_payee_idx` ON `payable` (`payee_id`);--> statement-breakpoint
CREATE INDEX `payable_bank_account_idx` ON `payable` (`bank_account_id`);--> statement-breakpoint
CREATE INDEX `payable_group_idx` ON `payable` (`group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payable_stock_movement_installment_idx` ON `payable` (`stock_movement_id`,`installment_number`);--> statement-breakpoint
CREATE TABLE `payee` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'supplier' NOT NULL,
	`document` text,
	`phone` text,
	`email` text,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `payee_name_idx` ON `payee` (`name`);