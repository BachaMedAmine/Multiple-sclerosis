import { Controller, Get, Query } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { Activity } from './schema/activity.schema';

@Controller('activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // Endpoint to get the latest 4 activities
  @Get()
async getActivities(
): Promise<any[]> {
  return this.activityService.getActivities();
}
}
