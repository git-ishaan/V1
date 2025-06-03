import React, { useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import 'react-native-reanimated';
import '../global.css';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  if (!fontsLoaded) return null;



  return (
    <SafeAreaProvider>
      {/* 
        We wrap everything in a SafeAreaView so that 
        the Stack and Tabs all live inside the safe bounds 
      */}
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* The Slot renders whatever child layout/screen comes next: */}
        <Slot />
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider> 
  );
}
