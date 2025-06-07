/* ------------------------------------------------------------------
 * BottomSheetMenu Component - Reusable bottom sheet menu
 * ----------------------------------------------------------------- */

import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';

interface BottomSheetMenuProps {
  visible: boolean;
  options: string[];
  onClose: () => void;
  onSelect: (value: string) => void;
  formatLabel?: (option: string) => string;
}

export const BottomSheetMenu: React.FC<BottomSheetMenuProps> = ({
  visible,
  options,
  onClose,
  onSelect,
  formatLabel,
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
              key={opt}
              onPress={() => onSelect(opt)}
              className="py-3 border-b border-gray-200"
            >
              <Text className="text-base text-gray-800">
                {formatLabel ? formatLabel(opt) : opt}
              </Text>
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
