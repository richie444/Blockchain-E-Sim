// AddressContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { standaloneAAService } from '../services/StandaloneAAService';

interface AddressContextType {
  address: string | null;
  setAddress: (address: string | null) => void;
  connected: boolean;
  setConnected: (connected: boolean) => void;
  smartAccountAddress: string | null;
  isAAInitialized: boolean;
  initializeAA: () => Promise<void>;
  gaslessEnabled: boolean;
  resetWallet: () => Promise<void>;
  getBalance: () => Promise<string>;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

export const AddressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [isAAInitialized, setIsAAInitialized] = useState<boolean>(false);
  const [gaslessEnabled, setGaslessEnabled] = useState<boolean>(true); // Always enabled with AA

  /**
   * Initialize Account Abstraction (no external wallet needed)
   */
  const initializeAA = async (): Promise<void> => {
    try {
      console.log('Initializing Standalone Account Abstraction...');
      await standaloneAAService.initialize();
      
      const walletAddress = standaloneAAService.getWalletAddress();
      const smartAddress = standaloneAAService.getSmartAccountAddress();
      
      setAddress(walletAddress);
      setSmartAccountAddress(smartAddress);
      setIsAAInitialized(true);
      setConnected(true);
      setGaslessEnabled(true);
      
      console.log('Standalone Account Abstraction initialized successfully');
      console.log('Wallet Address:', walletAddress);
      console.log('Smart Account Address:', smartAddress);
    } catch (error) {
      console.error('Failed to initialize Standalone Account Abstraction:', error);
      setIsAAInitialized(false);
      setGaslessEnabled(false);
      setConnected(false);
    }
  };

  /**
   * Reset wallet and create new one
   */
  const resetWallet = async (): Promise<void> => {
    try {
      await standaloneAAService.resetWallet();
      
      const walletAddress = standaloneAAService.getWalletAddress();
      const smartAddress = standaloneAAService.getSmartAccountAddress();
      
      setAddress(walletAddress);
      setSmartAccountAddress(smartAddress);
    } catch (error) {
      console.error('Failed to reset wallet:', error);
    }
  };

  /**
   * Get wallet balance
   */
  const getBalance = async (): Promise<string> => {
    try {
      return await standaloneAAService.getBalance();
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0.0';
    }
  };

  // Auto-initialize AA service on app start
  useEffect(() => {
    initializeAA();
  }, []);

  return (
    <AddressContext.Provider
      value={{
        address,
        setAddress,
        connected,
        setConnected,
        smartAccountAddress,
        isAAInitialized,
        initializeAA,
        gaslessEnabled,
        resetWallet,
        getBalance,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
};

export const useAddress = (): AddressContextType => {
  const context = useContext(AddressContext);
  if (context === undefined) {
    throw new Error('useAddress must be used within an AddressProvider');
  }
  return context;
};
  return context;
};
