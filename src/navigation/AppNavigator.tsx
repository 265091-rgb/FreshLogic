import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Package, ChefHat, ClipboardList } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import FridgeScreen from '../screens/FridgeScreen';
import AddFoodScreen from '../screens/AddFoodScreen';
import RecipesScreen from '../screens/RecipesScreen';
import ListScreen from '../screens/ListScreen';
import { Colors } from '../theme';

const Tab = createBottomTabNavigator();

function AddTabButton({ onPress }: { children?: React.ReactNode; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.addButton} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.addButtonInner}>
        <Text style={styles.addButtonPlus}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.sagePale,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={20} strokeWidth={1.75} />,
        }}
      />
      <Tab.Screen
        name="Fridge"
        component={FridgeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Package color={color} size={20} strokeWidth={1.75} />,
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddFoodScreen}
        options={{
          tabBarButton: (props) => <AddTabButton {...props} />,
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen
        name="Recipes"
        component={RecipesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <ChefHat color={color} size={20} strokeWidth={1.75} />,
        }}
      />
      <Tab.Screen
        name="List"
        component={ListScreen}
        options={{
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={20} strokeWidth={1.75} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.borderLight,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  addButton: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.forest,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonPlus: {
    color: Colors.onDark,
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
});
