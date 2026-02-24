import React from 'react'
import { TouchableOpacity } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Feather } from '@expo/vector-icons'
import type { MainStackParamList } from './types'
import { ScannerScreen } from '@/screens/ScannerScreen'
import { AccountScreen } from '@/screens/AccountScreen'

const Stack = createNativeStackNavigator<MainStackParamList>()

export const MainStack: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Scanner"
        component={ScannerScreen}
        options={({ navigation }) => ({
          headerTitle: 'SwimHub Scanner',
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { fontWeight: '600' },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Account')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="user" size={22} color="#374151" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          headerTitle: 'アカウント',
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
    </Stack.Navigator>
  )
}
