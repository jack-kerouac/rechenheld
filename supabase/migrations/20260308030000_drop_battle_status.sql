ALTER TABLE battles DROP COLUMN status;
DROP POLICY "Anyone can update battles" ON battles;
