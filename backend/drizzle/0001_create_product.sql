ALTER TABLE `subscription-status` RENAME TO `subscription_status`;--> statement-breakpoint
ALTER TABLE `tenant-users` RENAME TO `tenant_users`;--> statement-breakpoint
ALTER TABLE `tenant_users` RENAME COLUMN "tenant-id" TO "tenant_id";--> statement-breakpoint
ALTER TABLE `tenant` RENAME COLUMN "legal-name" TO "legal_name";--> statement-breakpoint
ALTER TABLE `tenant` RENAME COLUMN "logo-url" TO "logo_url";--> statement-breakpoint
ALTER TABLE `tenant` RENAME COLUMN "primary-color" TO "primary_color";--> statement-breakpoint
ALTER TABLE `tenant` RENAME COLUMN "plan-id" TO "plan_id";--> statement-breakpoint
ALTER TABLE `tenant` RENAME COLUMN "subscription-status-id" TO "subscription_status_id";--> statement-breakpoint
ALTER TABLE `tenant` RENAME COLUMN "subscription-expire-date" TO "subscription_expire_date";--> statement-breakpoint
ALTER TABLE `tenant` RENAME COLUMN "is-active" TO "is_active";--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tenant_users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`login` text NOT NULL,
	`password` text NOT NULL,
	`created-at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`updated-at` text DEFAULT (CURRENT TIMESTAMP) NOT NULL,
	`deleted-at` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_tenant_users`("id", "tenant_id", "login", "password", "created-at", "updated-at", "deleted-at") SELECT "id", "tenant_id", "login", "password", "created-at", "updated-at", "deleted-at" FROM `tenant_users`;--> statement-breakpoint
DROP TABLE `tenant_users`;--> statement-breakpoint
ALTER TABLE `__new_tenant_users` RENAME TO `tenant_users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_users_login_unique` ON `tenant_users` (`login`);