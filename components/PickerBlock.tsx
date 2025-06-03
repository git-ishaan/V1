// components/PickerBlock.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface PickerBlockProps {
  label: string;
  value: string;
  list: string[];
  onChange: (v: string) => void;
  map?: (v: string) => string;
}

export const PickerBlock: React.FC<PickerBlockProps> = ({
  label, value, list, onChange, map
}) => (
  <View style={{ marginTop: 16 }}>
    <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>{label}</Text>
    <View style={{
      marginTop: 4,
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      overflow: 'hidden'
    }}>
      <Picker selectedValue={value} onValueChange={v => onChange(v)}>
        {list.map(v => (
          <Picker.Item key={v} label={map ? map(v) : v} value={v} />
        ))}
      </Picker>
    </View>
  </View>
);
