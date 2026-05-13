-- Add new fields to coupon_templates: subtitle, image, notice
alter table coupon_templates
  add column if not exists subtitle text,
  add column if not exists image_url text,
  add column if not exists notice text;
