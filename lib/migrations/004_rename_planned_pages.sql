-- One-time data migration: rename planned pages to canonical HHVC names.
-- After this runs, the normalizePlannedPage runtime shim in persistence.js can be removed.
-- Safe to re-run: WHERE clauses only match old names.

UPDATE planned_pages SET name = 'Healthy housing and pests',                                        page_type = 'Topic',       user_type = 'General public'           WHERE name = 'Get help with pests, mold, and trash';
UPDATE planned_pages SET name = 'Prevent pests and health problems',                                page_type = 'Information', user_type = 'General public'           WHERE name = 'Help with pests and bugs';
UPDATE planned_pages SET name = 'Reduce indoor moisture and prevent mold (not leaks)',              page_type = 'Information', user_type = 'Resident / tenant'        WHERE name = 'Help with mold and water';
UPDATE planned_pages SET name = 'Report garbage or dirty conditions',                               page_type = 'Transaction', user_type = 'Resident / tenant'        WHERE name = 'Help with trash and messes';
UPDATE planned_pages SET name = 'Report overgrown plants or weeds that attract pests',              page_type = 'Transaction', user_type = 'General public'           WHERE name = 'Help with plants and weeds';
UPDATE planned_pages SET name = 'Pay your healthy housing fee for buildings with 3 or more units', page_type = 'Transaction', user_type = 'Property owner / landlord' WHERE name = 'Pay your annual building fee';
UPDATE planned_pages SET name = 'Tools, fees, and help',                                            page_type = 'Information', user_type = 'Property owner / landlord' WHERE name = 'Fee deadlines and late costs';
UPDATE planned_pages SET name = 'What owners need to do after getting a notice of violation',       page_type = 'Information', user_type = 'Property owner / landlord' WHERE name = 'Fixing a violation';
UPDATE planned_pages SET name = 'About the healthy housing program and inspections',                page_type = 'Information', user_type = 'Property owner / landlord' WHERE name = 'Owner rules for buildings with 3+ units';
UPDATE planned_pages SET name = 'Prevent mosquitoes by removing standing water',                   page_type = 'Information', user_type = 'General public'           WHERE name = 'Learn how to stop mosquitoes';
UPDATE planned_pages SET name = 'Request a mosquito education workshop for students',               page_type = 'Transaction', user_type = 'General public'           WHERE name = 'Mosquito classes for schools';
UPDATE planned_pages SET name = 'Report a dead bird for West Nile Virus testing',                   page_type = 'Transaction', user_type = 'General public'           WHERE name = 'Report a dead bird';
UPDATE planned_pages SET name = 'Contact healthy housing and vector control',                       page_type = 'Information', user_type = 'General public'           WHERE name = 'Contact HHVC';
