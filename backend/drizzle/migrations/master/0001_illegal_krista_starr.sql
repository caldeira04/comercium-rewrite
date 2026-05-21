DROP INDEX `tenant_users_login_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_users_tenant_id_login_unique` ON `tenant_users` (`tenant_id`,`login`);--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_slug_unique` ON `tenant` (`slug`);