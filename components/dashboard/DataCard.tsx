import React from 'react';
import { View, Text, Platform } from 'react-native';
import { DataRow } from '../../types/dashboard';

interface DataCardProps {
  item: DataRow;
}

export const DataCard: React.FC<DataCardProps> = ({ item }) => {
  return (
    <View
      className={`flex-1 m-2 p-4 rounded-xl shadow-lg ${
        item.breached
          ? 'bg-red-50 border-l-4 border-red-500'
          : 'bg-green-50 border-l-4 border-green-500'
      }`}
      style={Platform.OS === 'android' ? { elevation: 2 } : undefined}
    >
      <Text className="text-sm font-bold text-gray-700 mb-1">{item.name}</Text>
      <Text className={item.breached ? 'text-red-600' : 'text-green-600'}>
        {item.data}
      </Text>
      <Text className="text-xs text-gray-500 mt-1">
        Min: {item.min ?? '-'} Max: {item.max ?? '-'}
      </Text>
    </View>
  );
};
