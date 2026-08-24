import { Controller, Get } from '@nestjs/common';
import { ShippingService } from './shipping.service';
@Controller('shipping-methods')
export class ShippingController { constructor(private readonly service: ShippingService) {} @Get() list() { return this.service.list(); } }
