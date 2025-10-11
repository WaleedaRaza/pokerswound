-- Fix seat status from 'SEATED' to 'occupied'
UPDATE room_seats 
SET status = 'occupied' 
WHERE status = 'SEATED';

