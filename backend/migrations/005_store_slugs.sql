ALTER TABLE stores ADD COLUMN IF NOT EXISTS slug VARCHAR(120) NULL AFTER code;

UPDATE stores s
JOIN (
    SELECT id,
           base_slug,
           ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY id) AS slug_rank
    FROM (
        SELECT id,
               COALESCE(
                   NULLIF(TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(code, '[^A-Za-z0-9]+', '-'))), ''),
                   CONCAT('store-', id)
               ) AS base_slug
        FROM stores
    ) normalized
) slugs ON slugs.id = s.id
SET s.slug = CASE
    WHEN slugs.slug_rank = 1 THEN slugs.base_slug
    ELSE CONCAT(slugs.base_slug, '-', slugs.slug_rank)
END
WHERE s.slug IS NULL OR s.slug = '';

ALTER TABLE stores MODIFY slug VARCHAR(120) NOT NULL;
ALTER TABLE stores ADD UNIQUE KEY uq_stores_slug (slug);
