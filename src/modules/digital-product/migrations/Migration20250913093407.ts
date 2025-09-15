import { Migration } from '@mikro-orm/migrations';

export class Migration20250913093407 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "digital_product_media" drop constraint if exists "digital_product_media_type_check";`);

    this.addSql(`alter table if exists "digital_product" add column if not exists "creator_name" text null, add column if not exists "copyright_year" integer null, add column if not exists "work_type" text check ("work_type" in ('music', 'artwork', 'photography', 'writing', 'video')) null, add column if not exists "registration_number" text null, add column if not exists "territories" jsonb null, add column if not exists "rights_holder_email" text null;`);

    this.addSql(`alter table if exists "digital_product_media" add constraint "digital_product_media_type_check" check("type" in ('main', 'preview', 'license_certificate', 'contract_template', 'usage_guidelines'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "digital_product_media" drop constraint if exists "digital_product_media_type_check";`);

    this.addSql(`alter table if exists "digital_product" drop column if exists "creator_name", drop column if exists "copyright_year", drop column if exists "work_type", drop column if exists "registration_number", drop column if exists "territories", drop column if exists "rights_holder_email";`);

    this.addSql(`alter table if exists "digital_product_media" add constraint "digital_product_media_type_check" check("type" in ('main', 'preview'));`);
  }

}
