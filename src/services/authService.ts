import { User, initialMockDatabase } from "../data/mockDatabase";

const DB_KEY = "busconnect_users";
const CURRENT_USER_KEY = "busconnect_current_user";

// Initialize DB if empty
const initializeDb = () => {
    const existingDb = localStorage.getItem(DB_KEY);
    if (!existingDb) {
        localStorage.setItem(DB_KEY, JSON.stringify(initialMockDatabase));
    }
};

// Call immediately to ensure db is ready
initializeDb();

export const authService = {
    getUsers: (): User[] => {
        return JSON.parse(localStorage.getItem(DB_KEY) || "[]");
    },

    getCurrentUser: (): User | null => {
        const userStr = localStorage.getItem(CURRENT_USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated: (): boolean => {
        return !!localStorage.getItem(CURRENT_USER_KEY);
    },

    login: (phoneOrEmail: string, passwordHash: string): { success: boolean, error?: string } => {
        const users = authService.getUsers();
        const existingUser = users.find(u => u.phoneOrEmail === phoneOrEmail);

        if (existingUser) {
            if (existingUser.passwordHash === passwordHash) {
                // Login successful
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(existingUser));
                return { success: true };
            } else {
                // Wrong password
                return { success: false, error: "Incorrect password for this account." };
            }
        } else {
            return { success: false, error: "Account does not exist. Please sign up." };
        }
    },

    signup: (name: string, phoneOrEmail: string, passwordHash: string): { success: boolean, error?: string } => {
        const users = authService.getUsers();
        const existingUser = users.find(u => u.phoneOrEmail === phoneOrEmail);

        if (existingUser) {
            return { success: false, error: "Account already exists. Please log in." };
        }

        // User doesn't exist, create a new one
        const newUser: User = {
            id: `user_${Date.now()}`,
            name,
            phoneOrEmail,
            passwordHash
        };

        users.push(newUser);
        localStorage.setItem(DB_KEY, JSON.stringify(users));
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
        return { success: true };
    },

    logout: () => {
        localStorage.removeItem(CURRENT_USER_KEY);
    }
};
