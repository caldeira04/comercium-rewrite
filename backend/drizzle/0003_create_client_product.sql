CREATE TABLE `client` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`document` text,
	`email` text,
	`phone` text,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `product` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`gtin` text,
	`sell_price` integer NOT NULL,
	`buy_price` integer NOT NULL,
	`product_settings_id` integer,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`product_settings_id`) REFERENCES `product_settings`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `product_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL
);
