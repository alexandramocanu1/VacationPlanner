import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList} from './types';
import HomeScreen from './screens/HomeScreen';
import VacationDetailScreen from './screens/VacationDetailScreen';
import DayDetailScreen from './screens/DayDetailScreen';
import {Colors} from './theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {backgroundColor: Colors.background},
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="VacationDetail" component={VacationDetailScreen} />
        <Stack.Screen name="DayDetail" component={DayDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
