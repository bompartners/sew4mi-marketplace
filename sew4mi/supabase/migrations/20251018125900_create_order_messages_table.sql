-- Create Order Messages Table for Chat Feature
-- Story 3.4: Real-time order messaging between customer and tailor

-- Create order_messages table for order chat communication
CREATE TABLE IF NOT EXISTS public.order_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    sender_type TEXT NOT NULL CHECK (sender_type IN ('CUSTOMER', 'TAILOR')),
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('TEXT', 'IMAGE', 'VOICE', 'SYSTEM')) DEFAULT 'TEXT',
    media_url TEXT,
    is_internal BOOLEAN DEFAULT FALSE, -- For internal notes (future admin feature)
    read_by UUID[] DEFAULT '{}', -- Array of user IDs who have read the message
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON public.order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_sender_id ON public.order_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_sent_at ON public.order_messages(sent_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_messages_updated_at
    BEFORE UPDATE ON public.order_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for order_messages

-- Enable RLS
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Customers can view messages for their orders
CREATE POLICY "Customers can view own order messages"
ON public.order_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_messages.order_id
        AND orders.customer_id = auth.uid()
    )
);

-- Tailors can view messages for orders assigned to them
CREATE POLICY "Tailors can view assigned order messages"
ON public.order_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        JOIN public.tailor_profiles ON tailor_profiles.id = orders.tailor_id
        WHERE orders.id = order_messages.order_id
        AND tailor_profiles.user_id = auth.uid()
    )
);

-- Customers can send messages to their orders
CREATE POLICY "Customers can send messages to own orders"
ON public.order_messages FOR INSERT
WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_messages.order_id
        AND orders.customer_id = auth.uid()
    )
);

-- Tailors can send messages to assigned orders
CREATE POLICY "Tailors can send messages to assigned orders"
ON public.order_messages FOR INSERT
WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.orders
        JOIN public.tailor_profiles ON tailor_profiles.id = orders.tailor_id
        WHERE orders.id = order_messages.order_id
        AND tailor_profiles.user_id = auth.uid()
    )
);

-- Users can update their own messages (for read receipts)
CREATE POLICY "Users can update message read status"
ON public.order_messages FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_messages.order_id
        AND (
            orders.customer_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.tailor_profiles
                WHERE tailor_profiles.id = orders.tailor_id
                AND tailor_profiles.user_id = auth.uid()
            )
        )
    )
);

-- Create a function to automatically mark messages as delivered
CREATE OR REPLACE FUNCTION public.mark_message_as_delivered()
RETURNS TRIGGER AS $$
BEGIN
    NEW.delivered_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_message_delivered
    BEFORE INSERT ON public.order_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.mark_message_as_delivered();

COMMENT ON TABLE public.order_messages IS 'Stores chat messages between customers and tailors for orders';
COMMENT ON COLUMN public.order_messages.read_by IS 'Array of user IDs who have read the message';
COMMENT ON COLUMN public.order_messages.is_internal IS 'Reserved for future admin internal notes feature';

