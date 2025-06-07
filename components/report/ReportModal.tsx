/* ------------------------------------------------------------------
 * ReportModal Component - Modal for displaying report results
 * ----------------------------------------------------------------- */

import React from 'react';
import { Modal, SafeAreaView, View, Text, Pressable } from 'react-native';
import { ReportTable } from './ReportTable';
import { ReportRow } from '../../types/report';

interface ReportModalProps {
  visible: boolean;
  location: string;
  sensor: string;
  cols: string[];
  rows: ReportRow[];
  onClose: () => void;
  onDownload: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  location,
  sensor,
  cols,
  rows,
  onClose,
  onDownload,
}) => {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200">
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text className="text-2xl text-gray-800">×</Text>
          </Pressable>
          <Text className="flex-1 text-center text-lg font-bold text-gray-800">
            {location} • {sensor}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info + Download */}
        <View className="flex-row justify-between items-center px-4 py-2">
          <Text className="text-sm text-gray-600">Rows: {rows.length}</Text>
          <Pressable
            onPress={onDownload}
            className="bg-indigo-600 px-3 py-1 rounded-md shadow"
          >
            <Text className="text-white font-medium">Download ↓</Text>
          </Pressable>
        </View>

        {/* Scrollable table */}
        <ReportTable cols={cols} rows={rows} />
      </SafeAreaView>
    </Modal>
  );
};
