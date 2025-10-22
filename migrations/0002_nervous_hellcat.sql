CREATE TABLE `service_history` (
	`id` integer PRIMARY KEY NOT NULL,
	`kendaraan_id` integer,
	`service_date` text NOT NULL,
	`odometer_km` integer NOT NULL,
	`service_item_ids` text NOT NULL,
	`total_cost` integer,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`kendaraan_id`) REFERENCES `kendaraan`(`id`) ON UPDATE no action ON DELETE no action
);
