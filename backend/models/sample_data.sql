-- Add sample assets for testing
INSERT INTO assets (name, type, department, status, installation_date, geometry) VALUES
('Main Road Bridge', 'Bridge', 'Public Works', 'Good', '2020-01-15', ST_SetSRID(ST_MakePoint(78.1198, 9.9252), 4326)),
('Central Water Pipeline', 'Water Pipeline', 'Water Supply', 'Good', '2019-06-20', ST_SetSRID(ST_MakePoint(78.1200, 9.9400), 4326)),
('Street Light Pole 101', 'Street Light', 'Electricity', 'Good', '2021-03-10', ST_SetSRID(ST_MakePoint(78.1150, 9.9100), 4326));

SELECT 'Sample assets created!' as message;
