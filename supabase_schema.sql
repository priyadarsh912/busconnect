-- ─────────────────────────────────────────────────
-- BUSCONNECT — SUPABASE DATABASE SCHEMA
-- ─────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ─────────────────────────────────────────────────

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'driver', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    travel_date DATE NOT NULL,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    price DECIMAL(10, 2),
    passengers INTEGER DEFAULT 1,
    departure_time TEXT,
    seat_numbers TEXT[], -- Array of strings
    user_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. SEARCH HISTORY
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    trip_type TEXT DEFAULT 'intercity',
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. USER ROUTES (Frequent Routes)
CREATE TABLE IF NOT EXISTS public.user_routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    destination TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, source, destination)
);

-- 5. BUS LOCATIONS
CREATE TABLE IF NOT EXISTS public.bus_locations (
    bus_id TEXT PRIMARY KEY, -- Bus ID is usually a string (e.g. Plate Number)
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ─────────────────────────────────────────────────
-- SECURITY CONFIGURATION (Row Level Security)
-- ─────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_locations ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/edit only their own data
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Bookings: Users can see/create only their own bookings
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Search History: Users can manage their own history
CREATE POLICY "Users can manage own search history" ON public.search_history FOR ALL USING (auth.uid() = user_id);

-- User Routes: Users can manage their own routes
CREATE POLICY "Users can manage own routes" ON public.user_routes FOR ALL USING (auth.uid() = user_id);

-- Bus Locations: Everyone authenticated can see, only drivers/api can write
CREATE POLICY "Anyone can view bus locations" ON public.bus_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can update bus locations" ON public.bus_locations FOR ALL TO authenticated USING (true);
