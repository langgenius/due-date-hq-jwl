CREATE TABLE `mutation_lock` (
  `key` text PRIMARY KEY NOT NULL,
  `acquired_at` integer NOT NULL,
  `expires_at` integer NOT NULL
);
