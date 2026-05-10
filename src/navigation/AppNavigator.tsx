import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Refrigerator, Plus, ChefHat, ShoppingCart } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import FridgeScreen from '../screens/FridgeScreen';
import AddFoodScreen from '../screens/AddFoodScreen';
import RecipesScreen from '../screens/RecipesScreen';
import ListScreen from '../screens/ListScreen';

const Tab = createBottomTabNavigator();

const ACTIVE = '#6B7F5F';
const INACTIVE = '#A8B89F';

function AddTabButton({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.addButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.addButtonInner}>{children}</View>
    </TouchableOpacity>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Fridge"
        component={FridgeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Refrigerator color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddFoodScreen}
        options={{
          tabBarIcon: ({ color }) => <Plus color={color} size={28} />,
          tabBarButton: (props) => <AddTabButton {...props} />,
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen
        name="Recipes"
        component={RecipesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <ChefHat color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="List"
        component={ListScreen}
        options={{
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: '#E8EDE6',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  addButton: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A5D43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  addButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6B7F5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
