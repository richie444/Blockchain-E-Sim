import 'react-native-gesture-handler';
import '@walletconnect/react-native-compat';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from 'styled-components/native';

import useCachedResources from './hooks/useCachedResources';
import useColorScheme from './hooks/useColorScheme';
import { lightTheme, darkTheme } from './theme';
import * as Linking from 'expo-linking';

import Navigation from './navigation';
import { AddressProvider } from './screens/WalletContext';

import { createWeb3Modal, defaultConfig, Web3Modal } from '@web3modal/ethers-react-native';

const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || '0f4bb6dbc64e2b065f65eb8dd51b1298';
const scheme = Linking.createURL('/');

const metadata = {
	name: 'Blockchain E-SIM App',
	description: 'eSIM Blockchain App with Starlink Integration',
	url: 'https://walletconnect.com',
	icons: ['https://avatars.githubusercontent.com/u/37784886'],
	redirect: {
		native: scheme,
	},
};

const config = defaultConfig({
	metadata,
	extraConnectors: [],
});

const mainnet = {
	chainId: 1,
	name: 'Ethereum',
	currency: 'ETH',
	explorerUrl: 'https://etherscan.io',
	rpcUrl: 'https://cloudflare-eth.com',
};

const sepolia = {
	chainId: 11155111,
	name: 'Sepolia',
	currency: 'ETH',
	explorerUrl: 'https://sepolia.etherscan.io',
	rpcUrl: `https://eth-sepolia.g.alchemy.com/v2/${process.env.EXPO_PUBLIC_ALCHEMY_API_KEY}`,
};

const chains = [mainnet, sepolia];

export default function App(): JSX.Element | null {
	const isLoadingComplete = useCachedResources();
	const colorScheme = useColorScheme();
	const [web3ModalInitialized, setWeb3ModalInitialized] = useState(false);
	const [web3ModalError, setWeb3ModalError] = useState<string | null>(null);

	useEffect(() => {
		// Initialize Web3Modal after component mounts
		const initializeWeb3Modal = async () => {
			if (projectId && projectId !== 'undefined' && projectId.length > 0) {
				try {
					await createWeb3Modal({
						projectId,
						chains,
						config,
						enableAnalytics: false,
					});
					console.log('Web3Modal created successfully');
					setWeb3ModalInitialized(true);
				} catch (error) {
					console.error('Failed to create Web3Modal:', error);
					setWeb3ModalError(error instanceof Error ? error.message : 'Unknown error');
				}
			} else {
				console.warn('ProjectId not available, Web3Modal not initialized');
				setWeb3ModalError('Invalid project ID');
			}
		};

		if (isLoadingComplete) {
			initializeWeb3Modal();
		}
	}, [isLoadingComplete]);

	if (!isLoadingComplete) {
		return null;
	}

	const theme = colorScheme === 'light' ? lightTheme : darkTheme;
	
	return (
		<AddressProvider>
			<SafeAreaProvider>
				<Navigation colorScheme={colorScheme} />
				<StatusBar />
				{/* Temporarily disabled Web3Modal until configuration is fixed */}
				{/* {web3ModalInitialized && !web3ModalError && (
					<Web3Modal />
				)} */}
			</SafeAreaProvider>
		</AddressProvider>
	);
}
