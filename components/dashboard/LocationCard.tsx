import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import dayjs from 'dayjs';
import { LocationInfo } from '../../types/dashboard';

interface LocationCardProps {
  item: LocationInfo;
  onPress: (name: string) => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({
  item,
  onPress,
}) => {
  const lastSeenText =
    item.lastSeen && dayjs(item.lastSeen).isValid()
      ? dayjs(item.lastSeen).fromNow()
      : '—';

  return (
    <Pressable
      onPress={() => onPress(item.name)}
      android_ripple={{ color: 'rgba(99,102,241,0.2)' }}
      className="flex-1 m-2 p-6 bg-white rounded-xl shadow-lg border-l-4 border-indigo-500"
      style={({ pressed }) => [
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
        Platform.OS === 'android' ? { elevation: 6 } : undefined,
      ]}
    >
      <View className="flex-row justify-between">
        <Text className="text-sm italic font-semibold text-gray-700">
          {item.name}
        </Text>
        <Text className="text-xs text-gray-500">{lastSeenText}</Text>
      </View>
      <View className="flex-row justify-between items-end mt-6">
        <Text className="text-3xl font-extrabold text-gray-900">
          {item.count} Sensor{item.count !== 1 && 's'}
        </Text>
        <View className="items-end">
          <Text className="text-lg font-medium text-green-600">
            {item.up} Up
          </Text>
          <Text className="text-lg font-medium text-red-600">
            {item.count - item.up} Down
          </Text>
        </View>
      </View>
    </Pressable>
  );
};
