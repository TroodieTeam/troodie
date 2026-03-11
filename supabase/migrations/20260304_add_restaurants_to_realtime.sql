-- Add restaurants table to Supabase realtime publication
-- so RestaurantContext can subscribe to owner_id changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;
