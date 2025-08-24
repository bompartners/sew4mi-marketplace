-- Migration: Tailor Profiles Extension
-- Story: 3.1 - Expert Tailor Profiles

-- 1. Extend tailor_profiles table with additional fields
ALTER TABLE tailor_profiles
ADD COLUMN IF NOT EXISTS profile_photo TEXT,
ADD COLUMN IF NOT EXISTS portfolio_images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS average_response_hours NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS completed_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS on_time_delivery_rate NUMERIC(5,2) DEFAULT 100,
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS average_delivery_days INTEGER DEFAULT 7;

-- 2. Create tailor_reviews table for detailed customer reviews
CREATE TABLE IF NOT EXISTS tailor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id UUID NOT NULL REFERENCES tailor_profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  review_photos TEXT[] DEFAULT '{}',
  response_time INTEGER, -- Hours for response time tracking
  delivery_on_time BOOLEAN DEFAULT true,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(order_id, customer_id)
);

-- 3. Create tailor_availability table for calendar functionality
CREATE TABLE IF NOT EXISTS tailor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id UUID NOT NULL REFERENCES tailor_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('AVAILABLE', 'BUSY', 'BLOCKED')),
  capacity INTEGER NOT NULL DEFAULT 5,
  current_load INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tailor_id, date)
);

-- 4. Create garment_pricing table for pricing ranges
CREATE TABLE IF NOT EXISTS garment_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id UUID NOT NULL REFERENCES tailor_profiles(id) ON DELETE CASCADE,
  garment_type VARCHAR(100) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  max_price DECIMAL(10,2) NOT NULL,
  price_factors TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tailor_id, garment_type)
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tailor_reviews_tailor_id ON tailor_reviews(tailor_id);
CREATE INDEX IF NOT EXISTS idx_tailor_reviews_rating ON tailor_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_tailor_reviews_customer_id ON tailor_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_tailor_availability_tailor_date ON tailor_availability(tailor_id, date);
CREATE INDEX IF NOT EXISTS idx_tailor_availability_status ON tailor_availability(status);
CREATE INDEX IF NOT EXISTS idx_garment_pricing_tailor_id ON garment_pricing(tailor_id);
CREATE INDEX IF NOT EXISTS idx_garment_pricing_garment_type ON garment_pricing(garment_type);
CREATE INDEX IF NOT EXISTS idx_garment_pricing_active ON garment_pricing(is_active);

-- 6. Create RLS policies for tailor_reviews
ALTER TABLE tailor_reviews ENABLE ROW LEVEL SECURITY;

-- Customers can view all reviews
CREATE POLICY "Reviews are viewable by everyone" ON tailor_reviews
  FOR SELECT USING (true);

-- Customers can only create reviews for their completed orders
CREATE POLICY "Customers can create reviews for their orders" ON tailor_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = customer_id AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = tailor_reviews.order_id
      AND orders.customer_id = auth.uid()
      AND orders.status = 'COMPLETED'
    )
  );

-- Customers can update their own reviews
CREATE POLICY "Customers can update their own reviews" ON tailor_reviews
  FOR UPDATE USING (auth.uid() = customer_id);

-- Customers can delete their own reviews
CREATE POLICY "Customers can delete their own reviews" ON tailor_reviews
  FOR DELETE USING (auth.uid() = customer_id);

-- 7. Create RLS policies for tailor_availability
ALTER TABLE tailor_availability ENABLE ROW LEVEL SECURITY;

-- Everyone can view availability
CREATE POLICY "Availability is viewable by everyone" ON tailor_availability
  FOR SELECT USING (true);

-- Tailors can manage their own availability
CREATE POLICY "Tailors can manage their availability" ON tailor_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tailor_profiles
      WHERE tailor_profiles.id = tailor_availability.tailor_id
      AND tailor_profiles.user_id = auth.uid()
    )
  );

-- 8. Create RLS policies for garment_pricing
ALTER TABLE garment_pricing ENABLE ROW LEVEL SECURITY;

-- Everyone can view active pricing
CREATE POLICY "Active pricing is viewable by everyone" ON garment_pricing
  FOR SELECT USING (is_active = true);

-- Tailors can manage their own pricing
CREATE POLICY "Tailors can manage their pricing" ON garment_pricing
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tailor_profiles
      WHERE tailor_profiles.id = garment_pricing.tailor_id
      AND tailor_profiles.user_id = auth.uid()
    )
  );

-- 9. Create function to update tailor statistics
CREATE OR REPLACE FUNCTION update_tailor_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update tailor profile statistics when a review is added
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE tailor_profiles
    SET 
      rating = (
        SELECT AVG(rating)::NUMERIC(3,2)
        FROM tailor_reviews
        WHERE tailor_id = NEW.tailor_id
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM tailor_reviews
        WHERE tailor_id = NEW.tailor_id
      ),
      average_response_hours = (
        SELECT AVG(response_time)::NUMERIC(5,2)
        FROM tailor_reviews
        WHERE tailor_id = NEW.tailor_id
        AND response_time IS NOT NULL
      ),
      on_time_delivery_rate = (
        SELECT (COUNT(CASE WHEN delivery_on_time = true THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100)::NUMERIC(5,2)
        FROM tailor_reviews
        WHERE tailor_id = NEW.tailor_id
      ),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.tailor_id;
  END IF;
  
  -- Update statistics when a review is deleted
  IF TG_OP = 'DELETE' THEN
    UPDATE tailor_profiles
    SET 
      rating = COALESCE((
        SELECT AVG(rating)::NUMERIC(3,2)
        FROM tailor_reviews
        WHERE tailor_id = OLD.tailor_id
      ), 0),
      total_reviews = (
        SELECT COUNT(*)
        FROM tailor_reviews
        WHERE tailor_id = OLD.tailor_id
      ),
      average_response_hours = (
        SELECT AVG(response_time)::NUMERIC(5,2)
        FROM tailor_reviews
        WHERE tailor_id = OLD.tailor_id
        AND response_time IS NOT NULL
      ),
      on_time_delivery_rate = COALESCE((
        SELECT (COUNT(CASE WHEN delivery_on_time = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100)::NUMERIC(5,2)
        FROM tailor_reviews
        WHERE tailor_id = OLD.tailor_id
      ), 100),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.tailor_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger for updating tailor statistics
CREATE TRIGGER update_tailor_statistics_trigger
AFTER INSERT OR UPDATE OR DELETE ON tailor_reviews
FOR EACH ROW
EXECUTE FUNCTION update_tailor_statistics();

-- 11. Create function to update order completion statistics
CREATE OR REPLACE FUNCTION update_order_completion_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completed orders count when order status changes to COMPLETED
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
    UPDATE tailor_profiles
    SET 
      completed_orders = completed_orders + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.tailor_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger for order completion statistics
CREATE TRIGGER update_order_completion_trigger
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION update_order_completion_statistics();

-- 13. Create function to auto-update availability based on orders
CREATE OR REPLACE FUNCTION update_availability_load()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current load when order is accepted
  IF NEW.status = 'ACCEPTED' AND OLD.status != 'ACCEPTED' THEN
    INSERT INTO tailor_availability (tailor_id, date, status, capacity, current_load)
    VALUES (
      NEW.tailor_id,
      DATE(NEW.delivery_date),
      'AVAILABLE',
      10,
      1
    )
    ON CONFLICT (tailor_id, date)
    DO UPDATE SET 
      current_load = tailor_availability.current_load + 1,
      status = CASE 
        WHEN tailor_availability.current_load + 1 >= tailor_availability.capacity THEN 'BUSY'
        ELSE tailor_availability.status
      END,
      updated_at = CURRENT_TIMESTAMP;
  END IF;
  
  -- Reduce load when order is completed or cancelled
  IF (NEW.status IN ('COMPLETED', 'CANCELLED')) AND 
     (OLD.status NOT IN ('COMPLETED', 'CANCELLED')) THEN
    UPDATE tailor_availability
    SET 
      current_load = GREATEST(0, current_load - 1),
      status = CASE 
        WHEN current_load - 1 < capacity THEN 'AVAILABLE'
        ELSE status
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE tailor_id = NEW.tailor_id
    AND date = DATE(NEW.delivery_date);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create trigger for availability load updates
CREATE TRIGGER update_availability_load_trigger
AFTER UPDATE OF status ON orders
FOR EACH ROW
WHEN (NEW.delivery_date IS NOT NULL)
EXECUTE FUNCTION update_availability_load();

-- 15. Add updated_at triggers for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tailor_reviews_updated_at
BEFORE UPDATE ON tailor_reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tailor_availability_updated_at
BEFORE UPDATE ON tailor_availability
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_garment_pricing_updated_at
BEFORE UPDATE ON garment_pricing
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 16. Grant permissions
GRANT ALL ON tailor_reviews TO authenticated;
GRANT ALL ON tailor_availability TO authenticated;
GRANT ALL ON garment_pricing TO authenticated;

-- 17. Add sample data for development (commented out for production)
-- INSERT INTO garment_pricing (tailor_id, garment_type, base_price, max_price, price_factors)
-- SELECT 
--   tp.id,
--   garment.type,
--   garment.base,
--   garment.max,
--   garment.factors
-- FROM tailor_profiles tp
-- CROSS JOIN (VALUES 
--   ('Shirt', 50.00, 150.00, ARRAY['fabric', 'complexity', 'urgency']),
--   ('Dress', 80.00, 300.00, ARRAY['fabric', 'design', 'embellishments']),
--   ('Suit', 200.00, 800.00, ARRAY['fabric', 'lining', 'customization']),
--   ('Kaba & Slit', 100.00, 400.00, ARRAY['fabric', 'embroidery', 'style']),
--   ('Trousers', 40.00, 120.00, ARRAY['fabric', 'style', 'urgency'])
-- ) AS garment(type, base, max, factors)
-- WHERE tp.verification_status = 'VERIFIED';