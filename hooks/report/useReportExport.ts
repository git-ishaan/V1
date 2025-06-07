/* ------------------------------------------------------------------
 * useReportExport Hook - Manages CSV and PDF export functionality
 * ----------------------------------------------------------------- */

import { useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Alert } from 'react-native';
import { FIELD_LABELS, PDF_STYLES } from '../../constants/report';
import { ReportRow } from '../../types/report';

export const useReportExport = () => {
  const downloadCSV = useCallback(async (cols: string[], rows: ReportRow[]) => {
    const header = cols.map((c) => `"${FIELD_LABELS[c] || c}"`).join(',');
    const body = rows
      .map((r) =>
        cols.map((c) => `"${String(r[c]).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const csv = [header, body].join('\n');
    const path = FileSystem.documentDirectory! + 'report.csv';
    await FileSystem.writeAsStringAsync(path, csv);
    await Sharing.shareAsync(path);
  }, []);

  const downloadPDF = useCallback(
    async (
      cols: string[],
      rows: ReportRow[],
      location: string,
      sensor: string
    ) => {
      const ths = cols.map((c) => `<th>${FIELD_LABELS[c] || c}</th>`).join('');
      const trs = rows
        .map(
          (r) =>
            `<tr>${cols.map((c) => `<td>${String(r[c])}</td>`).join('')}</tr>`
        )
        .join('');
      const html = `
    <html><head><style>${PDF_STYLES}</style></head><body>
      <h1>Report: ${location} • ${sensor}</h1>
      <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
    </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    },
    []
  );

  const promptDownload = useCallback(
    (cols: string[], rows: ReportRow[], location: string, sensor: string) => {
      Alert.alert('Download as…', 'Choose format', [
        {
          text: 'PDF',
          onPress: () => downloadPDF(cols, rows, location, sensor),
        },
        { text: 'CSV', onPress: () => downloadCSV(cols, rows) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [downloadCSV, downloadPDF]
  );

  return {
    downloadCSV,
    downloadPDF,
    promptDownload,
  };
};
