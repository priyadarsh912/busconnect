import { supabase } from '../lib/supabase';

export interface BusRoute {
  id: string;
  name: string;
  source_stop_id: string;
  destination_stop_id: string;
  distance_km: number;
  base_fare: number;
  pricing?: PricingConfig;
}

export interface PricingConfig {
  price_per_km: number;
  surge_multiplier: number;
  min_fare: number;
}

export interface BusStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export const busService = {
  /**
   * Search for routes between two stops
   */
  async searchRoutes(sourceName: string, destinationName: string): Promise<BusRoute[]> {
    const { data, error } = await supabase
      .from('routes')
      .select(`
        *,
        source:source_stop_id (name),
        destination:destination_stop_id (name),
        pricing:pricing_configs (*)
      `)
      .ilike('source.name', `%${sourceName}%`)
      .ilike('destination.name', `%${destinationName}%`);

    if (error) throw error;
    return data as any[];
  },

  /**
   * Get all stops for a specific route in order
   */
  async getStopsForRoute(routeId: string): Promise<BusStop[]> {
    const { data, error } = await supabase
      .from('route_stops')
      .select(`
        stop_order,
        stops (*)
      `)
      .eq('route_id', routeId)
      .order('stop_order', { ascending: true });

    if (error) throw error;
    return data.map(item => item.stops) as any[];
  },

  /**
   * Calculate fare dynamically based on latest pricing from DB
   */
  async calculateFare(routeId: string, distanceKm: number): Promise<number> {
    const { data: config, error } = await supabase
      .from('pricing_configs')
      .select('*')
      .eq('route_id', routeId)
      .single();

    if (error || !config) return 10; // Fallback base fare

    const totalFare = distanceKm * Number(config.price_per_km) * Number(config.surge_multiplier);
    return Math.max(totalFare, Number(config.min_fare));
  },

  /**
   * Create a new booking
   */
  async createBooking(bookingData: {
    user_id: string;
    bus_id: string;
    source_stop_id: string;
    destination_stop_id: string;
    fare: number;
  }) {
    const { data, error } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch available buses for a route with live location
   */
  async getAvailableBuses(routeId: string) {
    const { data, error } = await supabase
      .from('buses')
      .select('*')
      .eq('route_id', routeId);

    if (error) throw error;
    return data;
  },

  /**
   * Sync or create user profile
   */
  async syncUser(uid: string, profile: { name: string; email?: string | null; phone?: string | null; role?: string }) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: uid,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role || 'customer'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get user profile
   */
  async getUserProfile(uid: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (error) return null;
    return data;
  },

  /**
   * Save search to history
   */
  async saveSearchHistory(userId: string, from: string, to: string, tripType: string = 'intercity') {
    const { error } = await supabase
      .from('search_history')
      .insert([{ user_id: userId, "from": from, "to": to, trip_type: tripType }]);

    if (error) console.error("Search history save error:", error);
  },

  /**
   * Get all bookings for a user
   */
  async getUserBookings(userId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        routes (
          source:source_stop_id (name),
          destination:destination_stop_id (name)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Update pricing (Admin logic)
   */
  async updateSurge(routeId: string, multiplier: number) {
    const { error } = await supabase
      .from('pricing_configs')
      .update({ surge_multiplier: multiplier, updated_at: new Date() })
      .eq('route_id', routeId);

    if (error) throw error;
  },

  /**
   * Get search history for a user
   */
  async getSearchHistory(userId: string) {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Get all bookings (Admin)
   */
  async getAllBookings() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Get all users (Admin)
   */
  async getAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Get all routes (Admin/General)
   */
  async getAllRoutes(): Promise<BusRoute[]> {
    const { data, error } = await supabase
      .from('routes')
      .select(`
        *,
        source:source_stop_id (name),
        destination:destination_stop_id (name),
        pricing:pricing_configs (*)
      `);

    if (error) throw error;
    return data as any[];
  },

  /**
   * Get all stops (Admin/General)
   */
  async getAllStops(): Promise<BusStop[]> {
    const { data, error } = await supabase
      .from('stops')
      .select('*');

    if (error) throw error;
    return data as any[];
  }
};
