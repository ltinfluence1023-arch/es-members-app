-- ============================================================
-- BJ ランキング対応: トリガーを blackjack タイプに対応させる
-- ============================================================
--
-- 背景:
--   apply_chip_transaction トリガーは to_user_id が設定されていれば
--   chip_balance += amount を無条件に実行する。
--   BJ ペイアウトは to_user_id でトリガー加算に頼っていたが、
--   blackjack type が chip_transactions_type_check に未登録だと
--   INSERT 失敗 → トリガー不発 → 残高もランキングも反映されない。
--
-- 対応方針:
--   BJ は残高管理を全て direct UPDATE で行い、chip_transactions は
--   「ランキング・履歴記録」専用とする。
--   トリガーが blackjack type の to_user_id で二重加算しないよう除外。
-- ============================================================

CREATE OR REPLACE FUNCTION apply_chip_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- blackjack は残高を direct UPDATE で管理するためトリガー対象外
  IF NEW.type = 'blackjack' THEN
    RETURN NEW;
  END IF;

  -- その他の type: to_user_id があれば加算
  IF NEW.to_user_id IS NOT NULL THEN
    UPDATE users SET chip_balance = chip_balance + NEW.amount WHERE id = NEW.to_user_id;
  END IF;

  -- transfer / admin: from_user_id からも減算
  IF NEW.from_user_id IS NOT NULL AND NEW.type IN ('transfer', 'admin') THEN
    UPDATE users SET chip_balance = chip_balance - NEW.amount WHERE id = NEW.from_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー再作成（関数を差し替えるだけで自動反映されるが念のため）
DROP TRIGGER IF EXISTS trg_apply_chip_transaction ON chip_transactions;
CREATE TRIGGER trg_apply_chip_transaction
  AFTER INSERT ON chip_transactions
  FOR EACH ROW EXECUTE FUNCTION apply_chip_transaction();
