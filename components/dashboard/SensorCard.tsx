import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import dayjs from 'dayjs';
import { SensorInfo } from '../../types/dashboard';

interface SensorCardProps {
  item: SensorInfo;
  onPress: (sensorId: string) => void;
}

export const SensorCard: React.FC<SensorCardProps> = ({ item, onPress }) => {
  const lastSeenText =
    item.last_seen && dayjs(item.last_seen).isValid()
      ? dayjs(item.last_seen).fromNow()
      : '—';
  const statusColor = item.status === 'up' ? 'text-green-600' : 'text-red-600';
  const borderColor =
    item.status === 'up'
      ? 'border-l-4 border-green-500'
      : 'border-l-4 border-red-500';

  return (
    <Pressable
      onPress={() => onPress(item.sensor_id)}
      android_ripple={{ color: 'rgba(45,212,191,0.2)' }}
      className={`flex-1 m-2 p-4 bg-white rounded-xl shadow-md ${borderColor}`}
      style={({ pressed }) => [
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
        Platform.OS === 'android' ? { elevation: 4 } : undefined,
      ]}
    >
      <View className="flex-row justify-between">
        <Text className={`text-sm italic font-semibold ${statusColor}`}>
          {item.status.toUpperCase()}
        </Text>
        <Text className="text-xs text-gray-500">{lastSeenText}</Text>
      </View>
      <View className="flex-1 justify-center mt-6">
        <Text className="text-2xl font-extrabold text-gray-900">
          {item.sensor_id}
        </Text>
      </View>
    </Pressable>
  );
};
