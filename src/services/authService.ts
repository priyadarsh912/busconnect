import { firestoreService } from "./firestoreService";
import { auth } from "../lib/firebase";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    sendEmailVerification,
    updateProfile
} from "firebase/auth";

export interface User {
    id: string;
    name: string;
    phoneOrEmail: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
}

const CURRENT_USER_KEY = "busconnect_current_user";

// Store pending OTP for phone verification
let pendingOtp: string | null = null;
let pendingPhone: string | null = null;

// Helper: Convert phone number to a fake email for Firebase (Firebase requires email)
const phoneToEmail = (phone: string): string => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return `phone_${cleaned}@busconnect.app`;
};

// Helper: Generate a random 6-digit OTP
const generateOtp = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const authService = {
    getCurrentUser: (): User | null => {
        const userStr = localStorage.getItem(CURRENT_USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated: (): boolean => {
        return !!localStorage.getItem(CURRENT_USER_KEY);
    },

    // Email/Password Signup
    signup: async (name: string, email: string, password: string): Promise<{ success: boolean, error?: string }> => {
        try {
            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            
            // Send email verification
            await sendEmailVerification(user);

            // Update display name
            await updateProfile(user, { displayName: name });

            // Sync profile to new Firestore collections
            await firestoreService.createUserProfile(user.uid, name, email, 'email');

            const userData: User = {
                id: user.uid,
                name,
                phoneOrEmail: email,
                isEmailVerified: user.emailVerified
            };

            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    // Email/Password Login
    login: async (email: string, password: string): Promise<{ success: boolean, error?: string }> => {
        try {
            const { user } = await signInWithEmailAndPassword(auth, email, password);
            
            const userData: User = {
                id: user.uid,
                name: user.displayName || 'User',
                phoneOrEmail: email,
                isEmailVerified: user.emailVerified
            };

            // Auto-sync user to Firestore on every login
            firestoreService.createOrUpdateUser(user.uid, userData.name, email, 'email')
                .catch(err => console.error("Login Firestore sync:", err));

            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    // Check if phone number is already registered inside Firestore
    checkPhoneStatus: async (phone: string): Promise<{ exists: boolean }> => {
        let formattedPhone = phone.trim();
        if (!formattedPhone.startsWith("+")) {
            formattedPhone = "+91" + formattedPhone;
        }
        const exists = await firestoreService.checkUserExistsByPhone(formattedPhone);
        return { exists };
    },

    // Phone Authentication - Step 1: Send OTP (no reCAPTCHA needed)
    sendPhoneOtp: async (phone: string): Promise<{ success: boolean, otp?: string, error?: string }> => {
        try {
            let formattedPhone = phone.trim();
            if (!formattedPhone.startsWith("+")) {
                formattedPhone = "+91" + formattedPhone;
            }

            // Generate a 6-digit OTP
            const otp = generateOtp();
            pendingOtp = otp;
            pendingPhone = formattedPhone;

            // In production, you would send this OTP via an SMS API (Twilio, MSG91, etc.)
            // For now, we show it via the UI so you can test the full flow
            console.log(`[BusConnect] OTP for ${formattedPhone}: ${otp}`);

            return { success: true, otp };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    // Phone Authentication - Step 2: Verify OTP and create/login account
    verifyPhoneOtp: async (otp: string, name?: string): Promise<{ success: boolean, error?: string }> => {
        try {
            if (!pendingOtp || !pendingPhone) {
                return { success: false, error: "OTP not sent yet. Please request a new OTP." };
            }

            if (otp !== pendingOtp) {
                return { success: false, error: "Invalid OTP. Please try again." };
            }

            // OTP is correct! Create or login a Firebase account using phone-derived email
            // Use normalized phone (cleans spaces, etc) for consistent email AND password
            const cleanedPhone = pendingPhone.replace(/\s/g, '');
            const fakeEmail = phoneToEmail(cleanedPhone);
            const fakePassword = `BusConnect_${cleanedPhone}_secure`;

            let firebaseUser;

            try {
                // Try to sign in (existing user)
                const result = await signInWithEmailAndPassword(auth, fakeEmail, fakePassword);
                firebaseUser = result.user;
            } catch (loginError: any) {
                // If user doesn't exist (or credential changed), try to sign up
                // or handle the case where sign-in just fails due to legacy password logic
                try {
                    const result = await createUserWithEmailAndPassword(auth, fakeEmail, fakePassword);
                    firebaseUser = result.user;
                    if (name) {
                        await updateProfile(firebaseUser, { displayName: name });
                    }
                } catch (signupError: any) {
                    // Final attempt: if it already exists, the password might have just been different in the past
                    if (signupError.code === 'auth/email-already-in-use') {
                        // This shouldn't normally happen if the above logic is sound, but we catch it just in case
                        // In a real app, you'd reset the password here if you couldn't sign in
                        throw new Error("Phone number already associated with another login method. Please try signing in.");
                    }
                    throw signupError;
                }
            }

            const userData: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || name || 'User',
                phoneOrEmail: pendingPhone,
                isPhoneVerified: true
            };

            // Sync profile to new Firestore collections
            await firestoreService.createUserProfile(firebaseUser.uid, userData.name, userData.phoneOrEmail, 'phone');

            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));

            // Clear pending OTP
            pendingOtp = null;
            pendingPhone = null;

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    logout: async () => {
        await signOut(auth);
        localStorage.removeItem(CURRENT_USER_KEY);
    },

    // Re-send email verification
    verifyEmail: async (): Promise<{ success: boolean, error?: string }> => {
        try {
            if (auth.currentUser) {
                await sendEmailVerification(auth.currentUser);
                return { success: true };
            }
            return { success: false, error: "No user logged in" };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};
