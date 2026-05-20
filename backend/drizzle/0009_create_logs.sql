PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_log` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_type` text,
	`reference_id` text,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_log`("id", "reference_type", "reference_id", "created_by_user_id", "updated_by_user_id", "deleted_by_user_id", "created_at", "updated_at", "deleted_at") SELECT "id", "reference_type", "reference_id", "created_by_user_id", "updated_by_user_id", "deleted_by_user_id", "created_at", "updated_at", "deleted_at" FROM `log`;--> statement-breakpoint
DROP TABLE `log`;--> statement-breakpoint
ALTER TABLE `__new_log` RENAME TO `log`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_tenant` (
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`legal_name` text,
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
	`logo_url` text,
	`primary_color` text,
	`timezone` text DEFAULT 'America/Sao_Paulo' NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`plan_id` text,
	`subscription_status_id` text NOT NULL,
	`subscription_expire_date` text,
	`is_active` integer DEFAULT true,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_tenant`("name", "slug", "legal_name", "document", "email", "phone", "zipcode", "street", "state", "district", "city", "number", "country", "logo_url", "primary_color", "timezone", "currency", "plan_id", "subscription_status_id", "subscription_expire_date", "is_active", "id", "created_at", "updated_at", "deleted_at") SELECT "name", "slug", "legal_name", "document", "email", "phone", "zipcode", "street", "state", "district", "city", "number", "country", "logo_url", "primary_color", "timezone", "currency", "plan_id", "subscription_status_id", "subscription_expire_date", "is_active", "id", "created_at", "updated_at", "deleted_at" FROM `tenant`;--> statement-breakpoint
DROP TABLE `tenant`;--> statement-breakpoint
ALTER TABLE `__new_tenant` RENAME TO `tenant`;--> statement-breakpoint
CREATE TABLE `__new_tenant_users` (
	`tenant_id` text NOT NULL,
	`login` text NOT NULL,
	`password` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_tenant_users`("tenant_id", "login", "password", "id", "created_at", "updated_at", "deleted_at") SELECT "tenant_id", "login", "password", "id", "created_at", "updated_at", "deleted_at" FROM `tenant_users`;--> statement-breakpoint
DROP TABLE `tenant_users`;--> statement-breakpoint
ALTER TABLE `__new_tenant_users` RENAME TO `tenant_users`;--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_users_login_unique` ON `tenant_users` (`login`);--> statement-breakpoint
CREATE TABLE `__new_cash` (
	`id` text PRIMARY KEY NOT NULL,
	`opening_amount` integer DEFAULT 0 NOT NULL,
	`expected_closing_amount` integer,
	`actual_closing_amount` integer,
	`closed_at` text,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_cash`("id", "opening_amount", "expected_closing_amount", "actual_closing_amount", "closed_at", "created_by_user_id", "updated_by_user_id", "deleted_by_user_id", "created_at", "updated_at", "deleted_at") SELECT "id", "opening_amount", "expected_closing_amount", "actual_closing_amount", "closed_at", "created_by_user_id", "updated_by_user_id", "deleted_by_user_id", "created_at", "updated_at", "deleted_at" FROM `cash`;--> statement-breakpoint
DROP TABLE `cash`;--> statement-breakpoint
ALTER TABLE `__new_cash` RENAME TO `cash`;--> statement-breakpoint
CREATE TABLE `__new_cash_movement` (
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
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`cash_id`) REFERENCES `cash`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_cash_movement`("id", "cash_id", "nature", "type", "amount", "description", "reference_type", "reference_id", "created_by_user_id", "updated_by_user_id", "deleted_by_user_id", "created_at", "updated_at", "deleted_at") SELECT "id", "cash_id", "nature", "type", "amount", "description", "reference_type", "reference_id", "created_by_user_id", "updated_by_user_id", "deleted_by_user_id", "created_at", "updated_at", "deleted_at" FROM `cash_movement`;--> statement-breakpoint
DROP TABLE `cash_movement`;--> statement-breakpoint
ALTER TABLE `__new_cash_movement` RENAME TO `cash_movement`;--> statement-breakpoint
CREATE TABLE `__new_sale` (
	`id` text PRIMARY KEY NOT NULL,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`client_id` integer NOT NULL,
	`settled_at` text,
	`cancelled_at` text,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_sale`("id", "total_amount", "client_id", "settled_at", "cancelled_at", "created_by_user_id", "updated_by_user_id", "deleted_by_user_id", "created_at", "updated_at", "deleted_at") SELECT "id", "total_amount", "client_id", "settled_at", "cancelled_at", "created_by_user_id", "updated_by_user_id", "deleted_by_user_id", "created_at", "updated_at", "deleted_at" FROM `sale`;--> statement-breakpoint
DROP TABLE `sale`;--> statement-breakpoint
ALTER TABLE `__new_sale` RENAME TO `sale`;--> statement-breakpoint
CREATE TABLE `__new_sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`total_price` integer NOT NULL,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`id`) REFERENCES `sale`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_sale_items`("id", "product_id", "quantity", "unit_price", "total_price", "created_by_user_id", "updated_by_user_id", "deleted_by_user_id", "created_at", "updated_at", "deleted_at") SELECT "id", "product_id", "quantity", "unit_price", "total_price", "created_by_user_id", "updated_by_user_id", "deleted_by_user_id", "created_at", "updated_at", "deleted_at" FROM `sale_items`;--> statement-breakpoint
DROP TABLE `sale_items`;--> statement-breakpoint
ALTER TABLE `__new_sale_items` RENAME TO `sale_items`;