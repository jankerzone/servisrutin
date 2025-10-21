CREATE TABLE `kendaraan` (
	`id` integer PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`tipe` text,
	`plat` text,
	`tahun` integer,
	`bulan_pajak` integer
);
--> statement-breakpoint
CREATE TABLE `service_items` (
	`id` integer PRIMARY KEY NOT NULL,
	`kendaraan_id` integer,
	`nama` text NOT NULL,
	`interval_type` text,
	`interval_value` integer,
	`last_km` integer,
	`last_date` text,
	FOREIGN KEY (`kendaraan_id`) REFERENCES `kendaraan`(`id`) ON UPDATE no action ON DELETE no action
);
