-- Fix board-covers storage policy to allow authenticated users to upload during board creation
-- The previous policy required the board to exist, but during board creation, the board doesn't exist yet
-- File path structure is: userId/boards/timestamp.jpg

-- Drop the restrictive board-covers policies
DROP POLICY IF EXISTS "Board owners can upload board covers" ON storage.objects;
DROP POLICY IF EXISTS "Board owners can update board covers" ON storage.objects;
DROP POLICY IF EXISTS "Board owners can delete board covers" ON storage.objects;

-- Create new policies that allow authenticated users to upload board covers
-- File path structure: userId/boards/timestamp.jpg
CREATE POLICY "Authenticated users can upload board covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'board-covers' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own board covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'board-covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own board covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'board-covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
); 