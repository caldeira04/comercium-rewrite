CREATE TABLE `payment` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`amount` integer NOT NULL,
	`payment_method` text NOT NULL,
	`status` text DEFAULT 'paid' NOT NULL,
	`paid_at` text,
	FOREIGN KEY (`sale_id`) REFERENCES `sale`(`id`) ON UPDATE no action ON DELETE cascade
);
