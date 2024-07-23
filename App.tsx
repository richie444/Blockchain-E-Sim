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

const projectId = '0f4bb6dbc64e2b065f65eb8dd51b1298';
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
	rpcUrl: `https://eth-sepolia.g.alchemy.com/v2/rmPVvm7D_GLetfMvdoZNIWO9YzzbZ1P0`,
};


const chains = [mainnet, sepolia];

createWeb3Modal({
	projectId,
	chains,
	config,
	enableAnalytics: true,
});

export default function App(): JSX.Element | null {
	const isLoadingComplete = useCachedResources();
	const colorScheme = useColorScheme();

	if (!isLoadingComplete) {
		return null;
	} else {
		return (

			<AddressProvider>
				<ThemeProvider theme={colorScheme === 'light' ? lightTheme : darkTheme}>
					<SafeAreaProvider>
						<Navigation colorScheme={colorScheme} />
						<StatusBar />
						<Web3Modal />
					</SafeAreaProvider>
				</ThemeProvider>
			</AddressProvider>

		);
	}
}
