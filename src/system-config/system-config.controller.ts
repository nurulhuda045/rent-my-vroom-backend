import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { UpdateSystemConfigDto } from './dto/system-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('system-config')
@Controller('system-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class SystemConfigController {
  constructor(private systemConfigService: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system configurations (Admin only)' })
  @ApiResponse({ status: 200, description: 'Configurations retrieved successfully' })
  async getAll() {
    return this.systemConfigService.getAll();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a system configuration by key (Admin only)' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  async get(@Param('key') key: string) {
    const value = await this.systemConfigService.get(key);
    return { key, value };
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update a system configuration (Admin only)' })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  async update(@Param('key') key: string, @Body() dto: UpdateSystemConfigDto) {
    return this.systemConfigService.set(key, dto.value);
  }
}
