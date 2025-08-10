-- Migration 001: Initial Schema
-- Run this script to create the initial database structure

\echo 'Creating initial database schema...'

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create all tables as defined in schema.sql
\i ../schema.sql

\echo 'Initial schema created successfully!'
\echo 'Next steps:'
\echo '1. Create a database user for the application'
\echo '2. Grant necessary permissions'
\echo '3. Update connection strings in environment variables'

-- Create application user (run as superuser)
-- CREATE USER clothesapp_user WITH ENCRYPTED PASSWORD 'your_secure_password';
-- GRANT CONNECT ON DATABASE clothesapp TO clothesapp_user;
-- GRANT USAGE ON SCHEMA public TO clothesapp_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clothesapp_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clothesapp_user;