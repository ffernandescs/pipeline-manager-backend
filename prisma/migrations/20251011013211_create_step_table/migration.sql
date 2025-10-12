/*
  Warnings:

  - You are about to drop the column `steps` on the `pipeline` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `log` ADD COLUMN `stepId` VARCHAR(191) NULL,
    MODIFY `message` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `pipeline` DROP COLUMN `steps`,
    MODIFY `status` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Step` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `command` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL,
    `pipelineId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Step` ADD CONSTRAINT `Step_pipelineId_fkey` FOREIGN KEY (`pipelineId`) REFERENCES `Pipeline`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Log` ADD CONSTRAINT `Log_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `Step`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
