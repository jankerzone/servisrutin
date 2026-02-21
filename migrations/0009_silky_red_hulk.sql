CREATE TABLE `tax_payments` (
	`id` integer PRIMARY KEY NOT NULL,
	`kendaraan_id` integer NOT NULL,
	`type` text NOT NULL,
	`paid_until` text NOT NULL,
	`paid_date` text NOT NULL,
	`cost` integer,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`kendaraan_id`) REFERENCES `kendaraan`(`id`) ON UPDATE no action ON DELETE no action
);
