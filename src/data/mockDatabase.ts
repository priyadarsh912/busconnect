export interface User {
  id: string;
  name: string;
  phoneOrEmail: string;
  passwordHash: string; // Storing plain text for this mock, but named hash for realism
}

// Initial dummy database containing some default users
// This will be loaded into localStorage on first run.
export const initialMockDatabase: User[] = [
  {
    id: "user_1",
    name: "Regular User",
    phoneOrEmail: "9876543210",
    passwordHash: "password123",
  },
  {
    id: "user_2",
    name: "Admin User",
    phoneOrEmail: "admin@busconnect.com",
    passwordHash: "adminpass",
  }
];
