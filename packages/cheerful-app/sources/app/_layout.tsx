import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar, useWindowDimensions } from 'react-native';

export default function RootLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0A0A0A' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: isTablet ? 20 : 17,
          },
          contentStyle: { backgroundColor: '#0A0A0A' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'Cheerful' }}
        />
        <Stack.Screen
          name="session/[id]"
          options={{ title: 'Session' }}
        />
        <Stack.Screen
          name="auth"
          options={{ title: 'Login', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
