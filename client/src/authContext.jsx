import { createContext, useContext, useEffect, useState } from "react";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail, 
    sendEmailVerification,
    updateProfile,
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    verifyBeforeUpdateEmail,
 } from "firebase/auth";
import { auth } from "./firebase";

const AuthCtx = createContext();
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setLoading(false);
  }), []);

  const signup = async (email, password, name) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(user, { displayName: name });
    await sendEmailVerification(user);
    return user;
  };
  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  // Firebase asks for the current password again before sensitive changes.
  const reauthenticate = (currentPassword) =>
    reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, currentPassword));

  // A name change applies right away. An email change only applies after the
  // user opens the verification link sent to the new address.
  // The email steps run first so a wrong password fails before anything is saved.
  const updateAccount = async ({ fullName, email, currentPassword }) => {
    const current = auth.currentUser;
    const emailPending = email !== current.email;
    if (emailPending) {
      await reauthenticate(currentPassword);
      await verifyBeforeUpdateEmail(current, email);
    }
    if (fullName !== (current.displayName || '')) await updateProfile(current, { displayName: fullName });
    return { emailPending };
  };

  const changePassword = async (currentPassword, newPassword) => {
    await reauthenticate(currentPassword);
    await updatePassword(auth.currentUser, newPassword);
  };

  return (
    <AuthCtx.Provider value={{ user, signup, login, logout, resetPassword, updateAccount, changePassword }}>
      {!loading && children}
    </AuthCtx.Provider>
  );
}