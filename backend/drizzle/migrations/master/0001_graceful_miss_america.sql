CREATE TABLE `admin_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_user_id` text,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`tenant_id` text,
	`metadata` text,
	`result` text DEFAULT 'success' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `admin_session` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_session_token_hash_unique` ON `admin_session` (`token_hash`);--> statement-breakpoint
CREATE TABLE `admin_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`login` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_user_login_unique` ON `admin_user` (`login`);--> statement-breakpoint
CREATE TABLE `announcement` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`scope` text DEFAULT 'global' NOT NULL,
	`tenant_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`created_by_admin_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `feature_flag` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`description` text,
	`scope` text DEFAULT 'global' NOT NULL,
	`tenant_id` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_flag_key_scope_tenant_unique` ON `feature_flag` (`key`,`scope`,`tenant_id`);--> statement-breakpoint
CREATE TABLE `system_error` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text,
	`method` text,
	`path` text,
	`status_code` integer,
	`error_code` text,
	`message` text,
	`stack` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `session` ADD `impersonated_by_admin_id` text;--> statement-breakpoint
ALTER TABLE `tenant_users` ADD `is_active` integer DEFAULT true NOT NULL;