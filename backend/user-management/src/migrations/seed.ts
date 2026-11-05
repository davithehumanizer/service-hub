import { NestFactory } from '@nestjs/core';
import { RoleSeederService } from 'src/roles/role-seeder.service';
import { SeedModule } from './seed.module';

/**
 * Seeds roles and permissions on demand.
 *
 * The same seeding now also runs on every start of user-management, in
 * {@link RoleSeederService}, which is what makes a declared permission
 * actually exist. This script is kept for running it against a database
 * without restarting the service.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedModule);

  await app.get(RoleSeederService).seed();

  console.log('✅ Roles and permissions seeded successfully');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
