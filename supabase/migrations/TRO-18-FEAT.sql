ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'like', 'comment', 'follow', 'achievement', 'restaurant_recommendation', 
  'board_invite', 'post_mention', 'milestone', 'system', 
  'restaurant_mention' -- <--- Added this type
));



-- Trigger logic -->


create extension if not exists pg_net;

create or replace function notify_owner_on_mention()
returns trigger
security definer
as $$
declare
  v_owner_id uuid;
  v_owner_token text;
  v_restaurant_name text;
  v_is_claimed boolean;
begin
  -- 1. Fetch info including 'is_claimed' status
  select owner_id, name, is_claimed into v_owner_id, v_restaurant_name, v_is_claimed
  from restaurants
  where id = new.restaurant_id;

  -- 2. STRICT CHECK: Stop if owner is missing OR is_claimed is false
  if v_owner_id is null or v_is_claimed is false then
    return new;
  end if;

  -- 3. Get active push token
  select token into v_owner_token
  from push_tokens
  where user_id = v_owner_id and is_active = true 
  order by updated_at desc limit 1;

  if v_owner_token is null then return new; end if;

  -- 4. Send to Expo via pg_net
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'to', v_owner_token,
      'title', 'New Mention!',
      'body', '@' || v_restaurant_name || ' was mentioned in a discussion.',
      'sound', 'default',
      'data', jsonb_build_object('url', '/community/post/' || new.comment_id)
    )
  );
  return new;
end;
$$ language plpgsql;

-- 3. Attach Trigger
drop trigger if exists on_mention_created on restaurant_mentions;
create trigger on_mention_created
after insert on restaurant_mentions
for each row execute function notify_owner_on_mention();