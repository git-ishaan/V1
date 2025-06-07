/* ------------------------------------------------------------------
 * ReportForm Component - Form for configuring report parameters
 * ----------------------------------------------------------------- */

import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

interface ReportFormProps {
  location: string;
  sensor: string;
  rangeLabel: string;
  aggWindow: string;
  busy: boolean;
  err: string | null;
  onLocationPress: () => void;
  onSensorPress: () => void;
  onRangePress: () => void;
  onAggWindowPress: () => void;
  onSubmit: () => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({
  location,
  sensor,
  rangeLabel,
  aggWindow,
  busy,
  err,
  onLocationPress,
  onSensorPress,
  onRangePress,
  onAggWindowPress,
  onSubmit,
}) => {
  return (
    <View className="bg-white rounded-xl shadow-lg p-6">
      {/* Location */}
      <Text className="text-sm font-semibold text-gray-800">Location</Text>
      <Pressable
        onPress={onLocationPress}
        className="mt-1 bg-white rounded-lg shadow-md p-4"
      >
        <Text className="text-gray-800">{location}</Text>
      </Pressable>

      {/* Sensor */}
      <Text className="mt-4 text-sm font-semibold text-gray-800">Sensor</Text>
      <Pressable
        onPress={onSensorPress}
        className="mt-1 bg-white rounded-lg shadow-md p-4"
      >
        <Text className="text-gray-800">{sensor}</Text>
      </Pressable>

      {/* Time range */}
      <Text className="mt-4 text-sm font-semibold text-gray-800">
        Time range
      </Text>
      <Pressable
        onPress={onRangePress}
        className="mt-1 bg-white rounded-lg shadow-md p-4"
      >
        <Text className="text-gray-800">{rangeLabel}</Text>
      </Pressable>

      {/* Aggregation window */}
      <Text className="mt-4 text-sm font-semibold text-gray-800">
        Aggregation window
      </Text>
      <Pressable
        onPress={onAggWindowPress}
        className="mt-1 bg-white rounded-lg shadow-md p-4"
      >
        <Text className="text-gray-800">{aggWindow}</Text>
      </Pressable>

      {/* Submit */}
      <Pressable
        onPress={onSubmit}
        className="mt-6 bg-indigo-600 rounded-lg py-3 items-center shadow-lg"
        style={({ pressed }) => [
          { transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <Text className="text-white font-bold">Submit</Text>
      </Pressable>

      {busy && <ActivityIndicator className="mt-4" color="#6366F1" />}
      {err && <Text className="text-red-600 mt-4 text-center">{err}</Text>}
    </View>
  );
};
