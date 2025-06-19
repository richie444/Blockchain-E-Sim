import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { useTheme } from 'styled-components';

import HomeScreen from '../screens/HomeScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/DebugScreen';
import CrossNetworkMessagingScreen from '../screens/CrossNetworkMessagingScreen';
import AccountAbstractionScreen from '../screens/AccountAbstractionScreen';

const BottomTab = createBottomTabNavigator();

export default function BottomTabNavigator(): JSX.Element {
  const theme = useTheme();

  return (
    <BottomTab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          paddingTop: 5,
          paddingBottom: 5,
        },
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
      }}
    >
      <BottomTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" color={color} size={24} />,
          tabBarLabel: 'Home',
        }}
      />
      <BottomTab.Screen
        name="Messages"
        component={CrossNetworkMessagingScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-outline" color={color} size={24} />,
          tabBarLabel: 'Messages',
        }}
      />
      <BottomTab.Screen
        name="Account"
        component={AccountAbstractionScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark-outline" color={color} size={24} />,
          tabBarLabel: 'Smart Account',
        }}
      />
      <BottomTab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="wallet-outline" color={color} size={24} />,
          tabBarLabel: 'Wallet',
        }}
      />
      <BottomTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" color={color} size={24} />,
          tabBarLabel: 'Settings',
        }}
      />
    </BottomTab.Navigator>
  );
}
