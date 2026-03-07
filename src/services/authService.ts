import { supabase } from "../lib/supabase";

export interface User {
    id: string;
    name: string;
    phoneOrEmail: string;
}

const CURRENT_USER_KEY = "busconnect_current_user";

export const authService = {
    getCurrentUser: (): User | null => {
        const userStr = localStorage.getItem(CURRENT_USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated: (): boolean => {
        return !!localStorage.getItem(CURRENT_USER_KEY);
    },

    login: async (phoneOrEmail: string, passwordHash: string): Promise<{ success: boolean, error?: string }> => {
        try {
            // Check if it's an email or phone for Supabase login
            const isEmail = phoneOrEmail.includes('@');
            const credentials = isEmail 
                ? { email: phoneOrEmail, password: passwordHash }
                : { phone: phoneOrEmail, password: passwordHash };

            const { data, error } = await supabase.auth.signInWithPassword(credentials);

            if (error) throw error;

            if (data.user) {
                // Fetch profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                const userData = {
                    id: data.user.id,
                    name: profile?.name || 'User',
                    phoneOrEmail: phoneOrEmail
                };

                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
                return { success: true };
            }

            return { success: false, error: "Login failed" };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    signup: async (name: string, phoneOrEmail: string, passwordHash: string): Promise<{ success: boolean, error?: string }> => {
        try {
            const isEmail = phoneOrEmail.includes('@');
            const credentials = isEmail 
                ? { email: phoneOrEmail, password: passwordHash }
                : { phone: phoneOrEmail, password: passwordHash };
                
            const { data, error } = await supabase.auth.signUp(credentials);

            if (error) throw error;

            if (data.user) {
                // Create profile in profiles table
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        { id: data.user.id, name, phone_or_email: phoneOrEmail }
                    ]);

                if (profileError) console.error("Profile creation error:", profileError);

                const userData = {
                    id: data.user.id,
                    name,
                    phoneOrEmail
                };

                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
                return { success: true };
            }

            return { success: false, error: "Signup failed" };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    logout: async () => {
        await supabase.auth.signOut();
        localStorage.removeItem(CURRENT_USER_KEY);
    },

    sendPhoneOtp: async (phone: string): Promise<{ success: boolean, error?: string }> => {
        try {
            const { error } = await supabase.auth.signInWithOtp({
                phone: phone,
            });
            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    verifyPhoneOtp: async (phone: string, token: string, name?: string): Promise<{ success: boolean, error?: string }> => {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                phone,
                token,
                type: 'sms',
            });
            
            if (error) throw error;

            if (data.user) {
                // Fetch or Create profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (!profile && name) {
                    await supabase.from('profiles').insert([
                        { id: data.user.id, name, phone_or_email: phone }
                    ]);
                }

                const userData = {
                    id: data.user.id,
                    name: profile?.name || name || 'User',
                    phoneOrEmail: phone
                };

                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
                return { success: true };
            }
            return { success: false, error: "Verification failed" };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};
