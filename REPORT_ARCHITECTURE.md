# Report Architecture - Modular Structure

## Overview

The React Native report screen has been successfully modularized to improve maintainability, reusability, and code organization. All functionality has been preserved while creating a clean, scalable architecture following the same pattern as the dashboard.

## Directory Structure

```
├── app/(tabs)/report.tsx                   # Main report screen (modularized)
├── types/report/
│   └── index.ts                           # TypeScript interfaces
├── constants/report/
│   └── index.ts                           # Application constants
├── hooks/report/
│   ├── index.ts                           # Hook exports
│   ├── useSensorData.ts                   # Sensor data management
│   ├── useReport.ts                       # Report generation logic
│   └── useReportExport.ts                 # CSV/PDF export functionality
└── components/report/
    ├── index.ts                           # Component exports
    ├── ReportForm.tsx                     # Report configuration form
    ├── ReportTable.tsx                    # Data table display
    ├── ReportModal.tsx                    # Results modal
    └── BottomSheetMenu.tsx                # Reusable selection menu
```

## Module Breakdown

### Types (`types/report/index.ts`)

Exports all TypeScript interfaces:

- `SensorData` - Sensor metadata structure
- `TimeRange` - Time range configuration
- `ReportQuery` - API query parameters
- `ReportRow` - Data row structure
- `MenuOption` - Menu configuration interface
- `ReportState` - Complete state interface
- `ExportOptions` - Export format options

### Constants (`constants/report/index.ts`)

Exports application constants:

- `FIELD_LABELS` - Display labels for data fields
- `TIME_RANGE_OPTIONS` - Available time range selections
- `AGGREGATION_WINDOW_OPTIONS` - Available aggregation windows
- `UNDESIRED_FIELDS` - Fields to exclude from results
- `DEFAULT_TIME_RANGE` - Default time range setting
- `DEFAULT_AGG_WINDOW` - Default aggregation window
- `PDF_STYLES` - CSS styles for PDF export

### Hooks (`hooks/report/`)

Custom hooks encapsulating business logic:

#### `useSensorData.ts`

- Manages sensor list data fetching
- Handles location and sensor selection
- Provides loading states and error handling
- Auto-updates sensor list when location changes

#### `useReport.ts`

- Manages report generation and data fetching
- Handles time range and aggregation configuration
- Formats data for display
- Provides data filtering and cleaning

#### `useReportExport.ts`

- Manages CSV and PDF export functionality
- Handles file generation and sharing
- Provides download format selection
- Uses Expo FileSystem and Print APIs

### Components (`components/report/`)

Reusable UI components:

#### `ReportForm.tsx`

- Displays report configuration form
- Handles location, sensor, time range, and aggregation selection
- Shows loading states and error messages
- Provides submit functionality

#### `ReportTable.tsx`

- Displays data in a scrollable table format
- Handles responsive column sizing
- Shows formatted field headers
- Supports horizontal scrolling for large datasets

#### `ReportModal.tsx`

- Modal container for displaying report results
- Shows report metadata (location, sensor, row count)
- Provides download action button
- Contains the ReportTable component

#### `BottomSheetMenu.tsx`

- Reusable bottom sheet menu component
- Supports custom label formatting
- Handles option selection and cancellation
- Used for all dropdown menus in the report

## Key Features Preserved

✅ **Dynamic Sensor Loading** - Sensors update based on location selection
✅ **Flexible Time Ranges** - Support for hours and days
✅ **Aggregation Windows** - Multiple data aggregation options
✅ **Data Export** - CSV and PDF export functionality
✅ **Data Formatting** - Proper timestamp and numeric formatting
✅ **Field Filtering** - Automatic removal of unwanted fields
✅ **Responsive Design** - Adaptive table layout
✅ **Error Handling** - Comprehensive error states
✅ **Loading States** - Visual feedback during operations

## Component Props and Interfaces

### ReportForm Props

```typescript
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
```

### ReportModal Props

```typescript
interface ReportModalProps {
  visible: boolean;
  location: string;
  sensor: string;
  cols: string[];
  rows: ReportRow[];
  onClose: () => void;
  onDownload: () => void;
}
```

### BottomSheetMenu Props

```typescript
interface BottomSheetMenuProps {
  visible: boolean;
  options: string[];
  onClose: () => void;
  onSelect: (value: string) => void;
  formatLabel?: (option: string) => string;
}
```

## Hook Returns

### useSensorData

```typescript
{
  allSensors: SensorData[];
  locations: string[];
  sensors: string[];
  location: string;
  sensor: string;
  tagBusy: boolean;
  tagErr: string | null;
  setLocation: (location: string) => void;
  setSensor: (sensor: string) => void;
}
```

### useReport

```typescript
{
  range: TimeRange;
  setRange: (range: TimeRange) => void;
  aggWindow: string;
  setAggWindow: (window: string) => void;
  busy: boolean;
  err: string | null;
  rows: ReportRow[];
  cols: string[];
  open: boolean;
  setOpen: (open: boolean) => void;
  runQuery: (location: string, sensor: string) => Promise<void>;
  rangeLabel: () => string;
}
```

### useReportExport

```typescript
{
  downloadCSV: (cols: string[], rows: ReportRow[]) => Promise<void>;
  downloadPDF: (cols: string[], rows: ReportRow[], location: string, sensor: string) => Promise<void>;
  promptDownload: (cols: string[], rows: ReportRow[], location: string, sensor: string) => void;
}
```

## Benefits of Modular Architecture

### 1. **Maintainability**

- Each component has a single responsibility
- Business logic is separated from UI components
- Clear separation of concerns
- Easy to locate and fix issues

### 2. **Reusability**

- Components can be reused across different screens
- Hooks can be shared between components
- BottomSheetMenu is completely generic
- Types ensure consistent data structures

### 3. **Testability**

- Individual components can be tested in isolation
- Business logic in hooks can be unit tested
- Mock data can be easily injected
- Error states can be tested independently

### 4. **Scalability**

- New export formats can be added easily
- Additional data sources can be integrated
- New aggregation options can be added
- UI components can be extended or composed

### 5. **Developer Experience**

- Clear import structure with barrel exports
- Full TypeScript support with IntelliSense
- Easier debugging and error tracking
- Consistent patterns across the application

## Usage Examples

### Importing Components

```typescript
import {
  ReportForm,
  ReportModal,
  BottomSheetMenu,
} from '../../components/report';
```

### Using Custom Hooks

```typescript
const { locations, sensors, location, sensor } = useSensorData();
const { rows, cols, runQuery, rangeLabel } = useReport();
const { promptDownload } = useReportExport();
```

### Type Safety

```typescript
const sensorData: SensorData[] = [];
const timeRange: TimeRange = { hours: 24 };
const reportRows: ReportRow[] = [];
```

## Future Enhancements

The modular structure makes it easy to add:

- Real-time data streaming
- Advanced chart visualizations
- Custom date range picker
- Scheduled report generation
- Email report delivery
- Additional export formats (Excel, JSON)
- Data caching and offline support
- Advanced filtering and search
- Report templates and saved configurations

## Migration Notes

The refactored report screen:

- Maintains 100% of original functionality
- Uses the same API endpoints
- Preserves all UI behavior and appearance
- Keeps the same user interaction patterns
- Maintains all export capabilities

## File Creation Summary

### Created Files:

1. `types/report/index.ts` - TypeScript interfaces
2. `constants/report/index.ts` - Application constants
3. `hooks/report/useSensorData.ts` - Sensor data management hook
4. `hooks/report/useReport.ts` - Report generation hook
5. `hooks/report/useReportExport.ts` - Export functionality hook
6. `hooks/report/index.ts` - Hook barrel exports
7. `components/report/ReportForm.tsx` - Configuration form component
8. `components/report/ReportTable.tsx` - Data table component
9. `components/report/ReportModal.tsx` - Results modal component
10. `components/report/BottomSheetMenu.tsx` - Reusable menu component
11. `components/report/index.ts` - Component barrel exports
12. `app/(tabs)/report.tsx` - Refactored main component (replaced original)

The report screen is now production-ready with a modern, modular architecture that mirrors the dashboard structure and provides excellent maintainability! 🎉
