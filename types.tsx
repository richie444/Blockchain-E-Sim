/**
 * Learn more about using TypeScript with React Navigation:
 * https://reactnavigation.org/docs/typescript/
 */

export type RootStackParamList = {
	Root: undefined;
	NotFound: undefined;
	WalletConnect: undefined;
  };
  
  export type BottomTabParamList = {
	Home: undefined;
	Wallet: undefined;
	Debug: undefined;
	Root: undefined;
  };
  
  export type TabWalletParamList = {
	WalletScreen: {
	  address: string;
	  name: string;
	  email: string;
	  simNumber: string;
	};
  };
  
  export type TabHomeParamList = {
	HomeScreen: undefined;
  };
  
  export type TabDebugParamList = {
	DebugScreen: undefined;
  };