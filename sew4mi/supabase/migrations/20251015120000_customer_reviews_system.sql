-- Migration: Customer Reviews and Ratings System (Story 4.5)
-- Description: Extends reviews table with moderation, creates related tables for photos/votes/responses,
-- and adds triggers for automatic rating calculations

-- ========================================
-- 1. Extend reviews table with new fields
-- ========================================

-- Add fit rating category (other categories already exist: quality, communication, timeliness)
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS rating_fit INTEGER CHECK (rating_fit >= 1 AND rating_fit <= 5);

-- Add moderation fields
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_status') THEN
    CREATE TYPE moderation_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');
  END IF;
END $$;

ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS moderation_status moderation_status DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS unhelpful_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

-- Add overall rating (calculated from 4 categories)
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS overall_rating DECIMAL(3,2);

-- Update existing reviews with overall rating calculation
UPDATE public.reviews
SET overall_rating = (
  COALESCE(rating_fit, 0) + 
  COALESCE(quality_rating, 0) + 
  COALESCE(communication_rating, 0) + 
  COALESCE(timeliness_rating, 0)
) / 4.0
WHERE overall_rating IS NULL;

-- ========================================
-- 2. Create review_photos table
-- ========================================

CREATE TABLE IF NOT EXISTS public.review_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  medium_url TEXT,
  optimized_url TEXT,
  caption TEXT,
  consent_given BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger function to enforce max 5 photos per review
CREATE OR REPLACE FUNCTION check_review_photos_limit()
RETURNS TRIGGER AS $$
DECLARE
  photo_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO photo_count
  FROM public.review_photos
  WHERE review_id = NEW.review_id;
  
  IF photo_count >= 5 THEN
    RAISE EXCEPTION 'Cannot add more than 5 photos per review';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_review_photos_limit ON public.review_photos;

CREATE TRIGGER trigger_check_review_photos_limit
BEFORE INSERT ON public.review_photos
FOR EACH ROW
EXECUTE FUNCTION check_review_photos_limit();

-- ========================================
-- 3. Create review_votes table
-- ========================================

CREATE TABLE IF NOT EXISTS public.review_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('HELPFUL', 'UNHELPFUL')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id) -- One vote per user per review
);

-- ========================================
-- 4. Create review_responses table
-- ========================================

CREATE TABLE IF NOT EXISTS public.review_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID UNIQUE NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  tailor_id UUID NOT NULL REFERENCES public.tailor_profiles(id),
  response_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 5. Extend tailor_profiles for category ratings
-- ========================================

ALTER TABLE public.tailor_profiles
ADD COLUMN IF NOT EXISTS rating_fit_avg DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS rating_quality_avg DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS rating_communication_avg DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS rating_timeliness_avg DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- ========================================
-- 6. Create function to calculate tailor ratings
-- ========================================

CREATE OR REPLACE FUNCTION update_tailor_ratings()
RETURNS TRIGGER AS $$
DECLARE
  v_tailor_id UUID;
BEGIN
  -- Determine which tailor_id to update based on trigger operation
  IF TG_OP = 'DELETE' THEN
    v_tailor_id := OLD.tailor_id;
  ELSE
    v_tailor_id := NEW.tailor_id;
  END IF;

  -- Update tailor profile with new calculated ratings
  UPDATE public.tailor_profiles
  SET
    rating = (
      SELECT ROUND(AVG(overall_rating), 2)
      FROM public.reviews
      WHERE tailor_id = v_tailor_id
        AND moderation_status = 'APPROVED'
        AND is_hidden = false
    ),
    rating_fit_avg = (
      SELECT ROUND(AVG(rating_fit), 2)
      FROM public.reviews
      WHERE tailor_id = v_tailor_id
        AND moderation_status = 'APPROVED'
        AND is_hidden = false
        AND rating_fit IS NOT NULL
    ),
    rating_quality_avg = (
      SELECT ROUND(AVG(quality_rating), 2)
      FROM public.reviews
      WHERE tailor_id = v_tailor_id
        AND moderation_status = 'APPROVED'
        AND is_hidden = false
        AND quality_rating IS NOT NULL
    ),
    rating_communication_avg = (
      SELECT ROUND(AVG(communication_rating), 2)
      FROM public.reviews
      WHERE tailor_id = v_tailor_id
        AND moderation_status = 'APPROVED'
        AND is_hidden = false
        AND communication_rating IS NOT NULL
    ),
    rating_timeliness_avg = (
      SELECT ROUND(AVG(timeliness_rating), 2)
      FROM public.reviews
      WHERE tailor_id = v_tailor_id
        AND moderation_status = 'APPROVED'
        AND is_hidden = false
        AND timeliness_rating IS NOT NULL
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE tailor_id = v_tailor_id
        AND moderation_status = 'APPROVED'
        AND is_hidden = false
    ),
    updated_at = NOW()
  WHERE id = v_tailor_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. Create trigger for automatic rating updates
-- ========================================

DROP TRIGGER IF EXISTS trigger_update_tailor_ratings ON public.reviews;

CREATE TRIGGER trigger_update_tailor_ratings
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_tailor_ratings();

-- ========================================
-- 8. Create function to update review vote counts
-- ========================================

CREATE OR REPLACE FUNCTION update_review_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_review_id UUID;
  v_helpful_count INTEGER;
  v_unhelpful_count INTEGER;
BEGIN
  -- Determine review_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_review_id := OLD.review_id;
  ELSE
    v_review_id := NEW.review_id;
  END IF;

  -- Calculate vote counts
  SELECT
    COUNT(*) FILTER (WHERE vote_type = 'HELPFUL'),
    COUNT(*) FILTER (WHERE vote_type = 'UNHELPFUL')
  INTO v_helpful_count, v_unhelpful_count
  FROM public.review_votes
  WHERE review_id = v_review_id;

  -- Update review with new counts
  UPDATE public.reviews
  SET
    helpful_count = v_helpful_count,
    unhelpful_count = v_unhelpful_count,
    updated_at = NOW()
  WHERE id = v_review_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 9. Create trigger for vote count updates
-- ========================================

DROP TRIGGER IF EXISTS trigger_update_review_vote_counts ON public.review_votes;

CREATE TRIGGER trigger_update_review_vote_counts
AFTER INSERT OR UPDATE OR DELETE ON public.review_votes
FOR EACH ROW
EXECUTE FUNCTION update_review_vote_counts();

-- ========================================
-- 10. Create indexes for performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_reviews_tailor_id ON public.reviews(tailor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status ON public.reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_tailor_approved ON public.reviews(tailor_id, moderation_status) 
  WHERE moderation_status = 'APPROVED' AND is_hidden = false;

CREATE INDEX IF NOT EXISTS idx_review_photos_review_id ON public.review_photos(review_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_review_id ON public.review_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_user_id ON public.review_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_review_id ON public.review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_tailor_id ON public.review_responses(tailor_id);

-- ========================================
-- 11. Add RLS policies for reviews
-- ========================================

-- Enable RLS on all review tables
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;

-- Reviews: Anyone can read approved reviews
CREATE POLICY "Anyone can read approved reviews"
  ON public.reviews FOR SELECT
  USING (moderation_status = 'APPROVED' AND is_hidden = false);

-- Reviews: Authenticated users can read their own reviews
CREATE POLICY "Users can read their own reviews"
  ON public.reviews FOR SELECT
  USING (auth.uid() = customer_id);

-- Reviews: Tailors can read all reviews about them
CREATE POLICY "Tailors can read their reviews"
  ON public.reviews FOR SELECT
  USING (
    tailor_id IN (
      SELECT id FROM public.tailor_profiles WHERE user_id = auth.uid()
    )
  );

-- Reviews: Customers can create reviews for their orders
CREATE POLICY "Customers can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id
        AND customer_id = auth.uid()
        AND status = 'DELIVERED'
    )
  );

-- Reviews: Customers can update their own reviews (within 48 hours)
CREATE POLICY "Customers can update own reviews"
  ON public.reviews FOR UPDATE
  USING (
    auth.uid() = customer_id AND
    created_at > NOW() - INTERVAL '48 hours'
  )
  WITH CHECK (auth.uid() = customer_id);

-- Review Photos: Read access follows review access
CREATE POLICY "Review photos readable with review"
  ON public.review_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews
      WHERE id = review_id
        AND (moderation_status = 'APPROVED' AND is_hidden = false)
        OR customer_id = auth.uid()
    )
  );

-- Review Photos: Customers can add photos to their reviews (within 7 days)
CREATE POLICY "Customers can add review photos"
  ON public.review_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviews
      WHERE id = review_id
        AND customer_id = auth.uid()
        AND created_at > NOW() - INTERVAL '7 days'
    )
  );

-- Review Votes: Authenticated users can read all votes
CREATE POLICY "Users can read review votes"
  ON public.review_votes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Review Votes: Authenticated users can insert/update their own votes
CREATE POLICY "Users can manage their votes"
  ON public.review_votes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Review Responses: Anyone can read responses to approved reviews
CREATE POLICY "Anyone can read review responses"
  ON public.review_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews
      WHERE id = review_id
        AND moderation_status = 'APPROVED'
        AND is_hidden = false
    )
  );

-- Review Responses: Tailors can manage responses to their reviews
CREATE POLICY "Tailors can manage their responses"
  ON public.review_responses FOR ALL
  USING (
    tailor_id IN (
      SELECT id FROM public.tailor_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tailor_id IN (
      SELECT id FROM public.tailor_profiles WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- 12. Add comments for documentation
-- ========================================

COMMENT ON TABLE public.reviews IS 'Customer reviews with 4-category ratings (fit, quality, communication, timeliness)';
COMMENT ON TABLE public.review_photos IS 'Photos uploaded with customer reviews (max 5 per review)';
COMMENT ON TABLE public.review_votes IS 'Helpful/unhelpful votes on reviews (one per user per review)';
COMMENT ON TABLE public.review_responses IS 'Tailor responses to customer reviews (one per review)';

COMMENT ON COLUMN public.reviews.overall_rating IS 'Average of 4 category ratings (fit, quality, communication, timeliness)';
COMMENT ON COLUMN public.reviews.moderation_status IS 'Review moderation status: PENDING (default), APPROVED (visible), REJECTED (hidden), FLAGGED (needs review)';
COMMENT ON COLUMN public.reviews.is_hidden IS 'Customer can hide their review without deleting';

COMMENT ON FUNCTION update_tailor_ratings() IS 'Automatically recalculates tailor average ratings when reviews are added/updated/deleted';
COMMENT ON FUNCTION update_review_vote_counts() IS 'Automatically updates helpful/unhelpful counts when votes change';

