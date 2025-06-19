import 'react-native-gesture-handler';
import '@walletconnect/react-native-compat';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
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
	name: 'AppKit RN',
	description: 'AppKit RN Example',
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

// Only create Web3Modal if projectId is available and valid
if (projectId && projectId !== 'undefined') {
	try {
		createWeb3Modal({
			projectId,
			chains,
			config,
			enableAnalytics: false, // Disable analytics to avoid potential issues
		});
		console.log('Web3Modal created successfully');
	} catch (error) {
		console.error('Failed to create Web3Modal:', error);
	}
} else {
	console.warn('ProjectId not available, Web3Modal not initialized');
}

export default function App(): JSX.Element | null {
	const isLoadingComplete = useCachedResources();
	const colorScheme = useColorScheme();

	if (!isLoadingComplete) {
		return null;
	} else {
		const theme = colorScheme === 'light' ? lightTheme : darkTheme;
		return (
			<AddressProvider>
				<SafeAreaProvider>
					<ThemeProvider theme={theme}>
						<Navigation colorScheme={colorScheme} />
						<StatusBar />
						{projectId && projectId !== 'undefined' && <Web3Modal />}
					</ThemeProvider>
				</SafeAreaProvider>
			</AddressProvider>
		);
	}
}
