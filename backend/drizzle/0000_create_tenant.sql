CREATE TABLE `subscription-status` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tenant` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`legal-name` text,
	`document` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`zipcode` text,
	`street` text,
	`state` text,
	`district` text,
	`city` text,
	`number` text,
	`country` text,
	`logo-url` text,
	`primary-color` text,
	`timezone` text DEFAULT 'America/Sao_Paulo' NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`plan-id` text,
	`subscription-status-id` text NOT NULL,
	`subscription-expire-date` text,
	`is-active` integer DEFAULT true,
	`created-at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated-at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted-at` text
);
--> statement-breakpoint
CREATE TABLE `tenant-users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant-id` text NOT NULL,
	`login` text NOT NULL,
	`password` text NOT NULL,
	`created-at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated-at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted-at` text,
	FOREIGN KEY (`tenant-id`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant-users_login_unique` ON `tenant-users` (`login`);