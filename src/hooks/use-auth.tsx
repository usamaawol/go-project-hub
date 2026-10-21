import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  subscribeToAuthChanges,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  requestPasswordReset,
  updateUserProfile,
  logoutUser,
  type DocuMindUser,
  isFirebaseConfigured,
} from "@/lib/firebase";

interface AuthContextType {
  user: DocuMindUser | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<DocuMindUser>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<DocuMindUser>;
  signInWithGoogle: () => Promise<DocuMindUser>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<DocuMindUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DocuMindUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignInWithEmail = async (email: string, pass: string) => {
    const loggedIn = await loginWithEmail(email, pass);
    setUser(loggedIn);
    return loggedIn;
  };

  const handleSignUpWithEmail = async (email: string, pass: string, name?: string) => {
    const registered = await registerWithEmail(email, pass, name);
    setUser(registered);
    return registered;
  };

  const handleSignInWithGoogle = async () => {
    const loggedIn = await loginWithGoogle();
    setUser(loggedIn);
    return loggedIn;
  };

  const handleResetPassword = async (email: string) => {
    await requestPasswordReset(email);
  };

  const handleUpdateProfile = async (updates: { displayName?: string; photoURL?: string }) => {
    const updated = await updateUserProfile(updates);
    setUser(updated);
    return updated;
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirebaseConfigured,
        signInWithEmail: handleSignInWithEmail,
        signUpWithEmail: handleSignUpWithEmail,
        signInWithGoogle: handleSignInWithGoogle,
        resetPassword: handleResetPassword,
        updateProfile: handleUpdateProfile,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
