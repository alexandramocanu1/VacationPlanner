import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {VacationProvider} from './src/context/VacationContext';
import Navigation from './src/Navigation';

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <VacationProvider>
          <Navigation />
        </VacationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}