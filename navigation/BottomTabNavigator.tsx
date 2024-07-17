import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { useTheme } from 'styled-components';

import TabHomeScreen from '../screens/HomeScreen';
import TabWalletScreen from '../screens/WalletScreen';
import TabDebugScreen from '../screens/DebugScreen';

import {
  BottomTabParamList,
  TabHomeParamList,
  TabWalletParamList,
  TabDebugParamList,
} from '../types';

const BottomTab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabNavigator(): JSX.Element {
  const theme = useTheme();

  return (
    <BottomTab.Navigator
      initialRouteName="Home"
      //   screenOptions={{
      //     tabBarActiveTintColor: theme.colors.tint,
      //   }}
    >
      <BottomTab.Screen
        name="Home"
        component={TabHomeNavigator}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <TabBarIcon name="home-outline" color={color} />
          ),
        }}
      />
      <BottomTab.Screen
        name="Wallet"
        component={TabWalletNavigator}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <TabBarIcon name="wallet-outline" color={color} />
          ),
        }}
      />
      <BottomTab.Screen
        name="Profile"
        component={TabDebugNavigator}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <TabBarIcon name="settings-outline" color={color} />
          ),
        }}
      />
    </BottomTab.Navigator>
  );
}

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={30} style={{ marginBottom: -3 }} {...props} />;
}

const TabHomeStack = createStackNavigator<TabHomeParamList>();

function TabHomeNavigator() {
  return (
    <TabHomeStack.Navigator
      screenOptions={{
        headerShown: false, // Hide the header for this stack navigator
      }}
    >
      <TabHomeStack.Screen name="HomeScreen" component={TabHomeScreen} />
    </TabHomeStack.Navigator>
  );
}

const TabWalletStack = createStackNavigator<TabWalletParamList>();

function TabWalletNavigator() {
  return (
    <TabWalletStack.Navigator
      screenOptions={{
        headerShown: false, // Hide the header for this stack navigator
      }}
    >
      <TabWalletStack.Screen
        name="WalletScreen"
        component={TabWalletScreen}
        options={{ headerTitle: 'Wallet' }} // Optionally set a title if needed
      />
    </TabWalletStack.Navigator>
  );
}

const TabDebugStack = createStackNavigator<TabDebugParamList>();

function TabDebugNavigator() {
  return (
    <TabDebugStack.Navigator
      screenOptions={{
        headerShown: false, // Hide the header for this stack navigator
      }}
    >
      <TabDebugStack.Screen
        name="DebugScreen"
        component={TabDebugScreen}
        options={{ headerTitle: 'Profile' }} // Optionally set a title if needed
      />
    </TabDebugStack.Navigator>
  );
}
