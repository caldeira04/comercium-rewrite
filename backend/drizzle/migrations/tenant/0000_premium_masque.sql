CREATE TABLE `cash` (
	`id` text PRIMARY KEY NOT NULL,
	`opening_amount` integer DEFAULT 0 NOT NULL,
	`expected_closing_amount` integer,
	`actual_closing_amount` integer,
	`closed_at` text,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `cash_movement` (
	`id` text PRIMARY KEY NOT NULL,
	`cash_id` text NOT NULL,
	`nature` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`description` text,
	`reference_type` text,
	`reference_id` text,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`cash_id`) REFERENCES `cash`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `product` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`gtin` text,
	`sell_price` integer NOT NULL,
	`buy_price` integer NOT NULL,
	`product_settings_id` integer,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`product_settings_id`) REFERENCES `product_settings`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `product_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL
);
--> statement-breakpoint
CREATE TABLE `client` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`document` text,
	`email` text,
	`phone` text,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `stock_movement` (
	`product_id` integer NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reason` text,
	`reference_type` text,
	`reference_id` text,
	`id` text PRIMARY KEY NOT NULL,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `log` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_type` text,
	`reference_id` text,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `sale` (
	`id` text PRIMARY KEY NOT NULL,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`client_id` integer NOT NULL,
	`settled_at` text,
	`cancelled_at` text,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`sale_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`total_price` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`sale_id`) REFERENCES `sale`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE restrict
);
