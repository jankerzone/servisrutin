ALTER TABLE `kendaraan` ADD COLUMN `short_id` text;
--> statement-breakpoint
UPDATE `kendaraan` SET `short_id` = lower(hex(randomblob(4))) WHERE `short_id` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `kendaraan_short_id_unique` ON `kendaraan` (`short_id`);