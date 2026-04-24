-- Migration 042: Remove altcoin assets (MANA, FET, QNT, TAO)
-- Keep only BTC, ETH, USDC

DELETE FROM crypto_transactions
WHERE asset_id IN (
  SELECT id FROM crypto_assets WHERE symbol IN ('MANA', 'FET', 'QNT', 'TAO')
);

DELETE FROM crypto_price_history
WHERE symbol IN ('MANA', 'FET', 'QNT', 'TAO');

DELETE FROM crypto_assets
WHERE symbol IN ('MANA', 'FET', 'QNT', 'TAO');
