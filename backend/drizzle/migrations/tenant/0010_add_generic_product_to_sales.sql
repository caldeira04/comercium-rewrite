INSERT OR IGNORE INTO product (
    id,
    name,
    gtin,
    sell_price,
    buy_price,
    product_settings_id,
    category_id,
    created_by_user_id,
    updated_by_user_id,
    deleted_by_user_id,
    created_at,
    updated_at,
    deleted_at
)
VALUES (
    0,
    'PRODUTO GENÉRICO',
    NULL,
    1,
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    NULL
);

UPDATE product
SET
    name = 'PRODUTO GENÉRICO',
    gtin = NULL,
    sell_price = 1,
    buy_price = 0,
    product_settings_id = NULL,
    category_id = NULL,
    deleted_by_user_id = NULL,
    updated_at = CURRENT_TIMESTAMP,
    deleted_at = NULL
WHERE id = 0;
