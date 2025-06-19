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

const alchemyApiKey = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY;

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
	rpcUrl: alchemyApiKey ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}` : 'https://ethereum-sepolia-rpc.publicnode.com',
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
			try {
				// Validate required environment variables
				console.log('Environment variables check:', {
					projectId: projectId ? projectId.substring(0, 8) + '...' : 'MISSING',
					alchemyApiKey: alchemyApiKey ? alchemyApiKey.substring(0, 8) + '...' : 'MISSING',
					scheme
				});

				if (!projectId || projectId === 'undefined' || projectId.length === 0) {
					throw new Error('Invalid or missing EXPO_PUBLIC_PROJECT_ID');
				}

				// Validate chains configuration
				if (!chains || chains.length === 0) {
					throw new Error('No blockchain networks configured');
				}

				// Validate RPC URLs
				for (const chain of chains) {
					if (!chain.rpcUrl || chain.rpcUrl.includes('undefined')) {
						console.warn(`Invalid RPC URL for chain ${chain.name}:`, chain.rpcUrl);
					}
				}

				console.log('Initializing Web3Modal with config:', {
					projectId: projectId.substring(0, 8) + '...',
					chainsCount: chains.length,
					enableAnalytics: false,
					metadata
				});

				await createWeb3Modal({
					projectId,
					chains,
					config,
					enableAnalytics: false,
				});
				
				console.log('✅ Web3Modal created successfully');
				setWeb3ModalInitialized(true);
				setWeb3ModalError(null);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				console.error('❌ Failed to create Web3Modal:', errorMessage);
				setWeb3ModalError(errorMessage);
				setWeb3ModalInitialized(false);
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
	
	// Only render Web3Modal if it's properly initialized
	if (!web3ModalInitialized || web3ModalError) {
		console.log('Web3Modal not ready:', { web3ModalInitialized, web3ModalError });
	}
	
	return (
		<AddressProvider>
			<SafeAreaProvider>
				<ThemeProvider theme={theme}>
					<Navigation colorScheme={colorScheme} />
					<StatusBar />
					{web3ModalInitialized && !web3ModalError && (
						<Web3Modal />
					)}
				</ThemeProvider>
			</SafeAreaProvider>
		</AddressProvider>
	);
}
