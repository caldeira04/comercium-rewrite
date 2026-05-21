PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	`subscription_status_id` text,
	`subscription_expire_date` text,
	`is_active` integer DEFAULT true,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_tenant`("name", "slug", "legal_name", "document", "email", "phone", "zipcode", "street", "state", "district", "city", "number", "country", "logo_url", "primary_color", "timezone", "currency", "plan_id", "subscription_status_id", "subscription_expire_date", "is_active", "id", "created_at", "updated_at", "deleted_at") SELECT "name", "slug", "legal_name", "document", "email", "phone", "zipcode", "street", "state", "district", "city", "number", "country", "logo_url", "primary_color", "timezone", "currency", "plan_id", "subscription_status_id", "subscription_expire_date", "is_active", "id", "created_at", "updated_at", "deleted_at" FROM `tenant`;--> statement-breakpoint
DROP TABLE `tenant`;--> statement-breakpoint
ALTER TABLE `__new_tenant` RENAME TO `tenant`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_slug_unique` ON `tenant` (`slug`);