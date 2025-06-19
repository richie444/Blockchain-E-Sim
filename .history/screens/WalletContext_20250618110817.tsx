// AddressContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { accountAbstractionService } from '../services/AccountAbstractionService';

interface AddressContextType {
  address: string | null;
  setAddress: (address: string | null) => void;
  connected: boolean;
  setConnected: (connected: boolean) => void;
  smartAccountAddress: string | null;
  isAAInitialized: boolean;
  initializeAA: (signer: any) => Promise<void>;
  gaslessEnabled: boolean;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

export const AddressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [isAAInitialized, setIsAAInitialized] = useState<boolean>(false);
  const [gaslessEnabled, setGaslessEnabled] = useState<boolean>(false);

  /**
   * Initialize Account Abstraction with the provided signer
   */
  const initializeAA = async (signer: any): Promise<void> => {
    try {
      console.log('Initializing Account Abstraction...');
      await accountAbstractionService.initialize(signer);
      
      const smartAddress = await accountAbstractionService.getSmartAccountAddress();
      setSmartAccountAddress(smartAddress);
      setIsAAInitialized(true);
      setGaslessEnabled(accountAbstractionService.isGaslessAvailable());
      
      console.log('Account Abstraction initialized successfully');
      console.log('Smart Account Address:', smartAddress);
    } catch (error) {
      console.error('Failed to initialize Account Abstraction:', error);
      setIsAAInitialized(false);
      setGaslessEnabled(false);
    }
  };

  // Clean up AA service when disconnecting
  useEffect(() => {
    if (!connected && isAAInitialized) {
      accountAbstractionService.disconnect();
      setSmartAccountAddress(null);
      setIsAAInitialized(false);
      setGaslessEnabled(false);
    }
  }, [connected, isAAInitialized]);

  return (
    <AddressContext.Provider value={{ 
      address, 
      setAddress, 
      connected, 
      setConnected,
      smartAccountAddress,
      isAAInitialized,
      initializeAA,
      gaslessEnabled
    }}>
      {children}
    </AddressContext.Provider>
  );
};

export const useAddress = (): AddressContextType => {
  const context = useContext(AddressContext);
  if (!context) {
    throw new Error('useAddress must be used within an AddressProvider');
  }
  return context;
};
