CREATE TABLE `sale` (
	`id` text PRIMARY KEY NOT NULL,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`client_id` integer NOT NULL,
	`settled_at` text,
	`cancelled_at` text,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` text NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`total_price` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`id`) REFERENCES `sale`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE restrict
);
