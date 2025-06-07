import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Range } from '../../types/dashboard';

interface ThresholdConfigModalProps {
  visible: boolean;
  thresholds: Record<string, Range>;
  alertsEnabled: boolean;
  fieldLabels: Record<string, string>;
  onClose: () => void;
  onThresholdChange: (key: string, field: 'min' | 'max', value: number) => void;
  onAlertsToggle: (enabled: boolean) => void;
  onSave: () => void;
}

export const ThresholdConfigModal: React.FC<ThresholdConfigModalProps> = ({
  visible,
  thresholds,
  alertsEnabled,
  fieldLabels,
  onClose,
  onThresholdChange,
  onAlertsToggle,
  onSave,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-neutral-600 bg-opacity-30">
        <View className="h-1/2 bg-white rounded-t-xl border-t-4 border-indigo-500 p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold">Configure Thresholds</Text>
            <Pressable onPress={onClose}>
              <FontAwesome name="times" size={24} color="#333" />
            </Pressable>
          </View>
          <View className="flex-row items-center mb-4">
            <Text className="flex-1 text-base">Enable Alerts</Text>
            <Switch value={alertsEnabled} onValueChange={onAlertsToggle} />
          </View>
          <ScrollView className="flex-1">
            {Object.entries(fieldLabels).map(([key, label]) => {
              const { min, max } = thresholds[key] || { min: 0, max: 0 };
              return (
                <View key={key} className="mb-4">
                  <Text className="mb-1">{label}</Text>
                  <View className="flex-row space-x-2">
                    <TextInput
                      className="flex-1 border border-gray-300 rounded px-2 py-1"
                      placeholder="Min"
                      keyboardType="numeric"
                      value={String(min)}
                      onChangeText={(txt) =>
                        onThresholdChange(key, 'min', Number(txt) || 0)
                      }
                    />
                    <TextInput
                      className="flex-1 border border-gray-300 rounded px-2 py-1"
                      placeholder="Max"
                      keyboardType="numeric"
                      value={String(max)}
                      onChangeText={(txt) =>
                        onThresholdChange(key, 'max', Number(txt) || 0)
                      }
                    />
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View className="flex-row justify-end mt-4 space-x-4">
            <Pressable onPress={onClose} className="px-4 py-2">
              <Text className="text-gray-700">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              className="px-4 py-2 bg-indigo-600 rounded-lg"
            >
              <Text className="text-white font-semibold">Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
