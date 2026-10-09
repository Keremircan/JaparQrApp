import { createContext, use, type PropsWithChildren } from 'react';

import { useStorageState } from '@/hooks/useStorageState';

export type EmployeeSession = {
  name: string;
  employeeCode: string;
  department: string;
  job: string;
  shift: string;
  shift_type: string;
  lastType?: 'IN' | 'OUT' | null;
};


type SessionContextValue = {
  signIn: (employee: EmployeeSession) => void;
  signOut: () => void;
  setLastType: (type: 'IN' | 'OUT' | null) => void;
  session?: string | null;
  employee: EmployeeSession | null;
  isLoading: boolean;
  lastType?: string | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession, SessionProvider içinde kullanılmalıdır.');
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading, session], setSession] = useStorageState('user_session');

  let employee: EmployeeSession | null = null;
  if (session) {
    try {
      employee = JSON.parse(session) as EmployeeSession;
    } catch {
      employee = null;
    }
  }

  const setLastType = (type: 'IN' | 'OUT' | null) => {
    if (!employee) return;
    const updated = { ...employee, lastType: type };
    setSession(JSON.stringify(updated));
  };

  return (
    <SessionContext.Provider
      value={{
        signIn: (nextEmployee) => {
          setSession(JSON.stringify(nextEmployee));
        },
        signOut: () => {
          setSession(null);
        },
        setLastType,
        session,
        employee,
        isLoading,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
