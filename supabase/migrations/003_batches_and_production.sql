-- ════════════════════════════════════════════════════════════════════════
-- 003 — BATCH-LEVEL EXPIRY TRACKING (FIFO) + PRODUCTION RUNS
-- Foundation for two Phase-2 features. Schema lands now to avoid painful
-- migrations later. Phase 1 only lightly touches the UI (see app code).
-- ════════════════════════════════════════════════════════════════════════

-- ── INGREDIENT BATCHES ──────────────────────────────────────────────────
-- Each delivery line creates one batch. This is the physical unit of stock
-- tracking. Unlike stock_movements (append-only), quantity_remaining here is
-- mutable current state: it is decremented as stock is consumed (FIFO) and
-- zeroed when a batch is written off.
CREATE TABLE ingredient_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,

  -- Quantity tracking
  quantity_received numeric(12,4) NOT NULL,
  quantity_remaining numeric(12,4) NOT NULL,
  unit text NOT NULL,

  -- Cost snapshot at time of delivery
  unit_cost numeric(12,4) NOT NULL,

  -- Expiry
  received_date date NOT NULL DEFAULT current_date,
  expiry_date date,

  -- Status
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'depleted', 'expired', 'written_off')),

  -- Links back to the stock movement that created this batch
  created_from_movement_id uuid REFERENCES stock_movements(id),

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for FIFO consumption queries (oldest active batch first).
CREATE INDEX idx_batches_fifo
  ON ingredient_batches(tenant_id, ingredient_id, received_date ASC)
  WHERE status = 'active';

-- Index for expiry alert queries.
CREATE INDEX idx_batches_expiry
  ON ingredient_batches(tenant_id, expiry_date)
  WHERE status = 'active' AND expiry_date IS NOT NULL;

-- ── STOCK_MOVEMENTS extensions ──────────────────────────────────────────
-- Every consumption movement records which batch it drew from + that batch's
-- expiry. stock_movements remains append-only.
ALTER TABLE stock_movements
  ADD COLUMN batch_id uuid REFERENCES ingredient_batches(id),
  ADD COLUMN expiry_date date;

-- Extend movement_type with the new event kinds. Drop + recreate the check.
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type IN (
    'delivery',           -- stock received from supplier (creates a batch)
    'count',              -- manual stock count (sets absolute level)
    'waste',              -- recorded waste/spoilage
    'adjustment',         -- manual correction
    'sale',               -- deducted by POS sale (Phase 3)
    'production_input',   -- raw ingredient consumed in a production run
    'production_output',  -- finished good created by a production run
    'expiry_writeoff'     -- automatic write-off when batch expires
  ));

-- ── INGREDIENTS extensions (produced goods) ─────────────────────────────
-- Finished goods (nuggets, stocks, sauces, …) live in the ingredient catalog
-- with is_produced = true. Their stock comes from production runs, not
-- deliveries, and they can be used in recipes like any other ingredient.
ALTER TABLE ingredients
  ADD COLUMN is_produced boolean NOT NULL DEFAULT false,
  ADD COLUMN default_shelf_life_days integer,
  ADD COLUMN storage_location text;

-- Example — frozen nuggets:
--   is_produced = true
--   default_shelf_life_days = 180
--   storage_location = 'Freezer'

-- ── PRODUCTION RUNS ─────────────────────────────────────────────────────
-- The manufacturing event: raw ingredients go in, a finished good comes out.
CREATE TABLE production_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- What was produced
  output_ingredient_id uuid NOT NULL REFERENCES ingredients(id),
  output_quantity numeric(12,4) NOT NULL,
  output_unit text NOT NULL,

  -- Expiry of this production batch.
  -- Default: produced_at + output_ingredient.default_shelf_life_days
  output_batch_expiry date,

  -- Calculated from inputs: SUM(input_qty * input_unit_cost) / output_quantity
  output_unit_cost numeric(12,4),

  -- Yield tracking.
  -- theoretical_yield comes from the recipe (if any).
  -- actual_yield = output_quantity / total_input_quantity.
  theoretical_yield_percent numeric(5,4),
  actual_yield_percent numeric(5,4),

  -- Recipe used as the production template (optional — runs can be ad-hoc).
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,

  -- Metadata
  produced_by uuid REFERENCES auth.users(id),
  storage_location text,
  notes text,
  produced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Raw ingredients consumed in a production run. A single logical input may
-- draw from multiple FIFO batches — in that case there is one row per source
-- batch.
CREATE TABLE production_run_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_run_id uuid NOT NULL
    REFERENCES production_runs(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id),

  quantity_used numeric(12,4) NOT NULL,
  unit text NOT NULL,

  -- Which batch was consumed (FIFO — oldest first).
  source_batch_id uuid REFERENCES ingredient_batches(id),

  -- Snapshot of unit cost at time of production (NOT the current cost_per_unit).
  unit_cost_at_time numeric(12,4) NOT NULL
);

-- ── INDEXES ─────────────────────────────────────────────────────────────
CREATE INDEX idx_production_runs_tenant
  ON production_runs(tenant_id, produced_at DESC);

CREATE INDEX idx_production_inputs_run
  ON production_run_inputs(production_run_id);

-- ── RLS for the new tables ──────────────────────────────────────────────
-- Defined here (not in 002) so migrations apply strictly in order. Relies on
-- the current_tenant_id() / current_user_role() helpers from 002.
ALTER TABLE ingredient_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_run_inputs ENABLE ROW LEVEL SECURITY;

-- Batches: all tenant members read, owners+managers write/update.
CREATE POLICY "tenant_read" ON ingredient_batches
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY "tenant_write" ON ingredient_batches
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id()
    AND current_user_role() IN ('owner', 'manager'));
CREATE POLICY "tenant_update" ON ingredient_batches
  FOR UPDATE USING (tenant_id = current_tenant_id()
    AND current_user_role() IN ('owner', 'manager'));

-- Production runs: same as batches.
CREATE POLICY "tenant_read" ON production_runs
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY "tenant_write" ON production_runs
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id()
    AND current_user_role() IN ('owner', 'manager'));

-- Production inputs: inherit tenant scope from the parent run.
CREATE POLICY "tenant_all" ON production_run_inputs
  FOR ALL USING (
    production_run_id IN (
      SELECT id FROM production_runs
      WHERE tenant_id = current_tenant_id()
    )
  );
