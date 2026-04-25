CREATE TABLE `elektronik` (
	`id` integer PRIMARY KEY NOT NULL,
	`short_id` text UNIQUE,
	`user_id` integer NOT NULL,
	`nama` text NOT NULL,
	`tipe` text,
	`lokasi` text,
	`tahun_beli` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `elektronik_service_items` (
	`id` integer PRIMARY KEY NOT NULL,
	`elektronik_id` integer NOT NULL,
	`nama` text NOT NULL,
	`interval_type` text,
	`interval_value` integer,
	`last_date` text,
	FOREIGN KEY (`elektronik_id`) REFERENCES `elektronik`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `elektronik_service_history` (
	`id` integer PRIMARY KEY NOT NULL,
	`elektronik_id` integer NOT NULL,
	`service_date` text NOT NULL,
	`service_item_ids` text NOT NULL,
	`total_cost` integer,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`elektronik_id`) REFERENCES `elektronik`(`id`) ON UPDATE no action ON DELETE no action
);
