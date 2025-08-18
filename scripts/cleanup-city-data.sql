-- City Data Cleanup Script for Troodie Database
-- Run this script to fix city data quality issues

-- 1. Fix Charlotte duplicate (CHARLOTTE -> Charlotte)
UPDATE restaurants 
SET city = 'Charlotte' 
WHERE city = 'CHARLOTTE';

-- 2. Fix Brooklyn Pickle restaurant with incorrect location parsing
-- The address "1021 Morehead Medical Dr Bldg 2, Fl 3rd Charlotte, NC 28204" was incorrectly parsed
UPDATE restaurants 
SET 
  city = 'Charlotte',
  state = 'NC',
  zip_code = '28204'
WHERE id = 'b911c488-13d6-4147-9ec2-22605649a8d9' 
  OR city = 'Bldg 2';

-- 3. Standardize all city names to proper case (optional)
-- This ensures consistent formatting
UPDATE restaurants
SET city = INITCAP(city)
WHERE city IS NOT NULL;

-- 4. Verify the cleanup
SELECT city, COUNT(*) as restaurant_count 
FROM restaurants 
WHERE city IS NOT NULL 
GROUP BY city 
ORDER BY restaurant_count DESC, city;

-- 5. Add a check constraint to prevent invalid city names (optional)
-- This prevents address components from being stored as cities
-- ALTER TABLE restaurants 
-- ADD CONSTRAINT check_valid_city 
-- CHECK (city !~ '^(Bldg|Building|Suite|Apt|Unit|Floor)');