CREATE TABLE `stock_movement` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` integer NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reason` text,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE restrict
);
