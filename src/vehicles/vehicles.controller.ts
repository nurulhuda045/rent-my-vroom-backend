import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new vehicle (Merchant only)' })
  @ApiResponse({ status: 201, description: 'Vehicle created successfully' })
  @ApiResponse({ status: 403, description: 'Merchant access required' })
  async create(@GetUser('id') merchantId: number, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(merchantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles (optionally filter by availability dates)' })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter vehicles available from this date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter vehicles available until this date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Vehicles retrieved successfully' })
  async findAll(
    @Query('isAvailable') isAvailable?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = isAvailable !== undefined ? { isAvailable: isAvailable === 'true' } : undefined;
    const dateRange = startDate
      ? { startDate, endDate: endDate || undefined }
      : undefined;
    return this.vehiclesService.findAll(filters, dateRange);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my vehicles (Merchant only)' })
  @ApiResponse({ status: 200, description: 'Vehicles retrieved successfully' })
  async findMyVehicles(@GetUser('id') merchantId: number) {
    return this.vehiclesService.findMyVehicles(merchantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiResponse({ status: 200, description: 'Vehicle retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vehicle (Merchant only)' })
  @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'You can only update your own vehicles',
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') merchantId: number,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, merchantId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete vehicle (Merchant only)' })
  @ApiResponse({ status: 200, description: 'Vehicle deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'You can only delete your own vehicles',
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async remove(@Param('id', ParseIntPipe) id: number, @GetUser('id') merchantId: number) {
    return this.vehiclesService.remove(id, merchantId);
  }
}
