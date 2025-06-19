import React from 'react';
import { View, Text } from 'react-native';

export const DebugEnv: React.FC = () => {
  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  const alchemyApiKey = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY;
  
  console.log('Debug - PROJECT_ID:', projectId);
  console.log('Debug - ALCHEMY_API_KEY:', alchemyApiKey);
  
  return (
    <View style={{ padding: 20, backgroundColor: 'red' }}>
      <Text style={{ color: 'white' }}>PROJECT_ID: {projectId || 'UNDEFINED'}</Text>
      <Text style={{ color: 'white' }}>ALCHEMY_KEY: {alchemyApiKey || 'UNDEFINED'}</Text>
    </View>
  );
};
