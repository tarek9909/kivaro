UPDATE system_settings
SET setting_value = 'store',
    value_type = 'string',
    description = 'Global URL prefix for store workspaces'
WHERE store_id IS NULL
  AND setting_key = 'platform.store_url_prefix';

INSERT INTO system_settings (store_id, setting_key, setting_value, value_type, description)
SELECT NULL, 'platform.store_url_prefix', 'store', 'string', 'Global URL prefix for store workspaces'
WHERE NOT EXISTS (
  SELECT 1
  FROM system_settings
  WHERE store_id IS NULL
    AND setting_key = 'platform.store_url_prefix'
);
