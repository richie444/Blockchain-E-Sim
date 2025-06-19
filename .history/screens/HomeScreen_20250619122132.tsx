import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAddress } from './WalletContext';
import 'react-native-get-random-values';
import '@ethersproject/shims';
import { ethers } from 'ethers';
import ESIM from './ESIM.json';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabParamList, TabWalletParamList } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type HomeScreenNavigationProp = StackNavigationProp<BottomTabParamList, 'Wallet'> & {
  navigate: (screen: 'Wallet', params: TabWalletParamList['WalletScreen']) => void;
};

const CONTRACT_ADDRESS = '0xb2484cf5bA0922b0375d84E138281F55fC537350';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { address, connected, isAAInitialized } = useAddress();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [simNumber, setSimNumber] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [loginSimNumber, setLoginSimNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activityLog, setActivityLog] = useState<string[]>([]);

  const addToActivityLog = (message: string) => {
    setActivityLog((prevLog) => [...prevLog, message]);
    console.log(message);
  };

  useEffect(() => {
    if (address && aaService) {
      checkRegistrationStatus();
    }
  }, [address, aaService]);

  const checkRegistrationStatus = async () => {
    if (!aaService || !address) {
      addToActivityLog('AA service or address not available');
      return;
    }

    try {
      const provider = aaService.getProvider();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ESIM.abi, provider);
      const user = await contract.users(address);
      setIsRegistered(user.isRegistered);
      if (user.isRegistered) {
        setName(user.name);
        setEmail(user.email);
        setSimNumber(user.simNumber);
        setLoginSimNumber(user.simNumber);
      }
      addToActivityLog('Checked registration status');
    } catch (error) {
      console.error('Error checking registration status:', error);
      addToActivityLog('Error checking registration status');
    }
  };

  const registerUser = async () => {
    if (!name || !email) {
      Alert.alert('Error', 'Please enter both name and email');
      return;
    }

    if (!aaService) {
      Alert.alert('Error', 'AA service not available');
      return;
    }

    try {
      setIsLoading(true);
      addToActivityLog('Starting user registration...');
      
      // Use the AA service to execute the transaction
      const contractInterface = new ethers.Interface(ESIM.abi);
      const data = contractInterface.encodeFunctionData('registerUser', [name, email]);
      
      const txHash = await aaService.executeTransaction(CONTRACT_ADDRESS, data);
      addToActivityLog(`Transaction sent: ${txHash}`);
      
      // Wait for the transaction to be mined and get the receipt
      const provider = aaService.getProvider();
      const receipt = await provider.waitForTransaction(txHash);
      
      if (receipt) {
        // Parse the logs to find the UserRegistered event
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ESIM.abi, provider);
        const logs = receipt.logs;
        
        for (const log of logs) {
          try {
            const parsedLog = contract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === 'UserRegistered') {
              const [userAddress, newSimNumber] = parsedLog.args;
              setSimNumber(newSimNumber);
              setIsRegistered(true);
              Alert.alert('Success', `User registered successfully. Your SIM number is ${newSimNumber}`);
              addToActivityLog(`User registered with SIM number: ${newSimNumber}`);
              await checkRegistrationStatus();
              return;
            }
          } catch (e) {
            // Skip logs that can't be parsed
          }
        }
        
        // If no event found, still mark as success but without SIM number
        Alert.alert('Success', 'User registered successfully');
        addToActivityLog('User registered successfully');
        await checkRegistrationStatus();
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.message || 'Failed to register user';
      Alert.alert('Error', errorMessage);
      addToActivityLog(`Registration error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    if (!loginSimNumber) {
      Alert.alert('Error', 'Please enter your SIM number');
      return;
    }

    if (!aaService) {
      Alert.alert('Error', 'AA service not available');
      return;
    }

    try {
      const provider = aaService.getProvider();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ESIM.abi, provider);

      const [userName, userEmail, isRegistered] = await contract.getUserDetails(loginSimNumber);

      if (isRegistered) {
        addToActivityLog('User is registered. Navigating to Wallet...');
        navigation.navigate('Wallet', {
          address: address || '',
          name: userName,
          email: userEmail,
          simNumber: loginSimNumber,
        });
      } else {
        addToActivityLog('User is not registered');
        Alert.alert('Error', 'User not found. Please register first.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to login. Please try again.');
      addToActivityLog('Failed to login. Please try again.');
    }
  };

  if (!isConnected || !address) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>E-SIM Wallet</Text>
          <View style={styles.card}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Initializing wallet...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.title}>E-SIM Wallet</Text>
          <View style={styles.card}>
            <MaterialCommunityIcons name="wallet-outline" size={24} color="#4A90E2" style={styles.icon} />
            <Text style={styles.addressText}>Connected Address:</Text>
            <Text style={styles.addressValue}>{`${address.slice(0, 6)}...${address.slice(-4)}`}</Text>
          </View>
          <View style={styles.card}>
            {isRegistered ? (
              <>
                <Text style={styles.cardTitle}>Login</Text>
                <Text style={styles.simNumberText}>SIM Number: {simNumber}</Text>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Register</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#A0AEC0"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholderTextColor="#A0AEC0"
                  keyboardType="email-address"
                />
                <TouchableOpacity style={styles.button} onPress={registerUser} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Register</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
          <View style={styles.loginContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Login</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter SIM Number"
                value={loginSimNumber}
                onChangeText={setLoginSimNumber}
                placeholderTextColor="#A0AEC0"
              />
              <TouchableOpacity style={styles.button} onPress={login}>
                <Text style={styles.buttonText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {activityLog.length > 0 && (
          <View style={styles.activityLogCard}>
            <Text style={styles.activityLogTitle}>Activity Log</Text>
            {activityLog.map((log: any, index: any) => (
              <Text key={index} style={styles.activityLogText}>
                {log}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffff00',
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 15,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  input: {
    width: '100%',
    marginBottom: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    fontSize: 16,
    color: '#2D3748',
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addressText: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 5,
  },
  addressValue: {
    fontSize: 18,
    color: '#2D3748',
    fontWeight: 'bold',
  },
  simNumberText: {
    fontSize: 16,
    color: '#2D3748',
    marginBottom: 15,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  activityLogCard: {
    backgroundColor: '#EDF2F7',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    marginTop: 20,
  },
  activityLogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 10,
  },
  activityLogText: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 5,
  },
});

export default HomeScreen;
