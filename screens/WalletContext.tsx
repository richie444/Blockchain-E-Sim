import React, { createContext, useContext, useState, ReactNode } from 'react';

interface WalletContextProps {
  address: string;
  setAddress: (address: string) => void;
  connected: boolean;
  setConnected: (connected: boolean) => void;
}

const WalletContext = createContext<WalletContextProps | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState('');
  const [connected, setConnected] = useState(false);

  return (
    <WalletContext.Provider value={{ address, setAddress, connected, setConnected }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
