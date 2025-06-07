import React from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { DataRow, PollOption } from '../../types/dashboard';
import { DataCard } from './DataCard';

interface LiveDataModalProps {
  visible: boolean;
  modalLoc: string;
  selSensor: string;
  metaTxt: string;
  rows: DataRow[];
  liveBusy: boolean;
  pollInterval: number | null;
  pollOptions: PollOption[];
  onClose: () => void;
  onConfigureThresholds: () => void;
  onIntervalPress: () => void;
}

export const LiveDataModal: React.FC<LiveDataModalProps> = ({
  visible,
  modalLoc,
  selSensor,
  metaTxt,
  rows,
  liveBusy,
  pollInterval,
  pollOptions,
  onClose,
  onConfigureThresholds,
  onIntervalPress,
}) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200">
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FontAwesome name="chevron-down" size={24} color="#333" />
          </Pressable>
          <Text className="flex-1 text-center text-lg font-bold text-gray-800">
            {modalLoc} • {selSensor}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text className="text-2xl text-indigo-600">×</Text>
          </Pressable>
        </View>

        {/* Controls row: Configure + interval */}
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
          <Pressable
            onPress={onConfigureThresholds}
            android_ripple={{ color: 'rgba(99,102,241,0.2)' }}
          >
            <View className="flex-row items-center bg-indigo-100 px-3 py-1 rounded-md">
              <FontAwesome name="cog" size={20} color="#6366F1" />
              <Text className="ml-1 text-indigo-700 font-medium">
                Configure Thresholds
              </Text>
            </View>
          </Pressable>

          <View className="flex-row items-center">
            <Text className="mr-2 text-gray-700 font-medium">Interval:</Text>
            <Pressable
              onPress={onIntervalPress}
              className="border border-gray-300 rounded-md px-3 py-1"
            >
              <Text className="text-gray-800">
                {pollOptions.find((o) => o.value === pollInterval)?.label ??
                  'Select'}
              </Text>
            </Pressable>
          </View>
        </View>

        {liveBusy ? (
          <ActivityIndicator className="mt-8" size="large" color="#6366F1" />
        ) : (
          <>
            <View className="mx-4 my-4 bg-white rounded-xl shadow-md border border-indigo-200 p-4 w-full">
              <Text className="font-mono text-base text-gray-800">
                {metaTxt || '—'}
              </Text>
            </View>

            <FlatList
              data={rows}
              numColumns={2}
              keyExtractor={(i) => i.key}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => <DataCard item={item} />}
            />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
};
