import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { PollOption } from '../../types/dashboard';

interface IntervalMenuModalProps {
  visible: boolean;
  options: PollOption[];
  onClose: () => void;
  onSelect: (value: number) => void;
}

export const IntervalMenuModal: React.FC<IntervalMenuModalProps> = ({
  visible,
  options,
  onClose,
  onSelect,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-neutral-600 bg-opacity-30">
        <View className="bg-white rounded-t-xl p-4">
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              className="py-3 border-b border-gray-200"
            >
              <Text className="text-base text-gray-800">{opt.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} className="py-3">
            <Text className="text-center text-red-500">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
