import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryExpiryProcessor } from './inventory-expiry.processor';
@Module({imports:[DatabaseModule],controllers:[InventoryController],providers:[InventoryService,InventoryExpiryProcessor],exports:[InventoryService]})
export class InventoryModule{}
