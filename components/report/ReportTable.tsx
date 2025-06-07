/* ------------------------------------------------------------------
 * ReportTable Component - Data table for displaying report results
 * ----------------------------------------------------------------- */

import React from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { FIELD_LABELS } from '../../constants/report';
import { ReportRow } from '../../types/report';

interface ReportTableProps {
  cols: string[];
  rows: ReportRow[];
}

export const ReportTable: React.FC<ReportTableProps> = ({ cols, rows }) => {
  const { width } = useWindowDimensions();

  return (
    <View className="flex-1">
      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ minWidth: width * 1.2 }}>
          {/* Header row */}
          <View className="flex-row bg-indigo-100">
            {cols.map((c) => (
              <View key={c} className="w-32 border border-gray-300 p-2">
                <Text className="text-xs font-bold uppercase text-gray-700 text-center">
                  {FIELD_LABELS[c] || c}
                </Text>
              </View>
            ))}
          </View>

          {/* Data rows */}
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            {rows.map((r, i) => (
              <View
                key={i}
                className={`flex-row ${i % 2 ? 'bg-gray-50' : 'bg-white'}`}
              >
                {cols.map((c) => (
                  <View key={c} className="w-32 border border-gray-300 p-2">
                    <Text className="text-xs text-gray-600 text-center">
                      {r[c]}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};
