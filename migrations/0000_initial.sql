CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`revision` integer NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `history_revision` ON `history` (`schedule_id`,`revision`);--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`class_name` text NOT NULL,
	`year` integer NOT NULL,
	`term` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`revision` integer NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `schedule_scope` ON `schedules` (`class_id`,`year`,`term`);--> statement-breakpoint
CREATE TABLE `login_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`attempts` integer NOT NULL
);

--> statement-breakpoint
CREATE TRIGGER audit_insert AFTER INSERT ON schedules BEGIN INSERT INTO history VALUES (lower(hex(randomblob(16))),NEW.id,NEW.revision,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'admin',NEW.data); END;
--> statement-breakpoint
CREATE TRIGGER audit_update AFTER UPDATE ON schedules BEGIN INSERT INTO history VALUES (lower(hex(randomblob(16))),NEW.id,NEW.revision,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'admin',NEW.data); END;
