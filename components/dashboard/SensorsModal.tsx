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
import { SensorInfo } from '../../types/dashboard';
import { SensorCard } from './SensorCard';

interface SensorsModalProps {
  visible: boolean;
  modalLoc: string;
  sensors: SensorInfo[];
  cols: number;
  refreshingSensors: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onSensorPress: (sensorId: string) => void;
}

export const SensorsModal: React.FC<SensorsModalProps> = ({
  visible,
  modalLoc,
  sensors,
  cols,
  refreshingSensors,
  onClose,
  onRefresh,
  onSensorPress,
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
            {modalLoc}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text className="text-2xl text-indigo-600">×</Text>
          </Pressable>
        </View>

        {refreshingSensors ? (
          <ActivityIndicator className="mt-8" size="large" color="#6366F1" />
        ) : (
          <FlatList
            data={sensors}
            numColumns={cols}
            key={cols}
            contentContainerStyle={{ padding: 16 }}
            refreshing={refreshingSensors}
            onRefresh={onRefresh}
            renderItem={({ item }) => (
              <SensorCard item={item} onPress={onSensorPress} />
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};
