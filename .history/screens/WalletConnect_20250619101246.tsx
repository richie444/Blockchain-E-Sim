import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, SafeAreaView, StatusBar, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAddress } from './WalletContext';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalState } from '@web3modal/ethers-react-native';

const WalletConnect: React.FC = () => {
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const { setAddress } = useAddress();
    const navigation = useNavigation();

    const { open } = useWeb3Modal();
    const { address, isConnected } = useWeb3ModalAccount();
    const { open: modalOpen } = useWeb3ModalState();

    console.log('WalletConnect - Current state:', {
        address,
        isConnected,
        modalOpen,
        errorMessage
    });

    useEffect(() => {
        console.log('WalletConnect - Effect triggered:', { address, isConnected });
        if (address && isConnected) {
            setAddress(address);
            console.log('WalletConnect - Wallet connected, navigating back');
            // Navigate back to previous screen or to home
            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                // @ts-ignore - Navigation type issue
                navigation.navigate('Root');
            }
        }
    }, [address, isConnected, setAddress, navigation]);

    const connectWallet = async () => {
        console.log('WalletConnect - Connect button pressed');
        setIsConnecting(true);
        setErrorMessage('');
        
        try {
            console.log('WalletConnect - Opening Web3Modal...');
            await open();
            console.log('WalletConnect - Web3Modal opened successfully');
        } catch (error: any) {
            console.error('WalletConnect - Error connecting wallet:', error);
            const errorMsg = error?.message || 'Failed to connect wallet';
            setErrorMessage(errorMsg);
            Alert.alert('Connection Error', errorMsg);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <View style={styles.container}>
                <Text style={styles.title}>Welcome to SimCard</Text>
                <Text style={styles.subtitle}>Connect your wallet to get started</Text>
                <TouchableOpacity 
                    style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]} 
                    onPress={connectWallet}
                    disabled={isConnecting}
                >
                    <Text style={styles.connectButtonText}>
                        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </Text>
                </TouchableOpacity>
                
                {address && (
                    <Text style={styles.addressText}>
                        Connected: {address.substring(0, 6)}...{address.substring(address.length - 4)}
                    </Text>
                )}
                
                {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#1A1A2E', // Dark blue background
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#A9A9A9',
        marginBottom: 40,
        textAlign: 'center',
    },
    connectButton: {
        backgroundColor: '#4A90E2', // Bright blue button
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 25,
        shadowColor: '#4A90E2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    connectButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    error: {
        marginTop: 20,
        color: '#FF6B6B', // Soft red for error messages
        textAlign: 'center',
    },
});

export default WalletConnect;
