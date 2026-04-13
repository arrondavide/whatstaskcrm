-- Add search_vector column to records table
ALTER TABLE records ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_records_search ON records USING GIN(search_vector);

-- Function: auto-update search_vector from all JSONB text values
CREATE OR REPLACE FUNCTION update_record_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(array_to_string(
      ARRAY(SELECT value FROM jsonb_each_text(NEW.data) WHERE value IS NOT NULL),
      ' '
    ), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: runs before INSERT or UPDATE of data column
DROP TRIGGER IF EXISTS records_search_update ON records;
CREATE TRIGGER records_search_update
  BEFORE INSERT OR UPDATE OF data ON records
  FOR EACH ROW EXECUTE FUNCTION update_record_search_vector();

-- Function: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Triggers: auto-update updated_at on users and fields
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS fields_updated_at ON fields;
CREATE TRIGGER fields_updated_at BEFORE UPDATE ON fields FOR EACH ROW EXECUTE FUNCTION update_timestamp();
