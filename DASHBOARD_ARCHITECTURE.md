# Dashboard Architecture - Modular Structure

## Overview

The React Native dashboard has been successfully modularized to improve maintainability, reusability, and code organization. All functionality has been preserved while creating a clean, scalable architecture.

## Directory Structure

```
├── app/(tabs)/index.tsx                    # Main dashboard screen (cleaned up)
├── types/dashboard/
│   └── index.ts                           # TypeScript interfaces
├── constants/dashboard/
│   └── index.ts                           # Application constants
├── hooks/dashboard/
│   ├── index.ts                           # Hook exports
│   ├── useSensorList.ts                   # Sensor data management
│   ├── useLiveData.ts                     # Live data polling
│   └── useThresholds.ts                   # Threshold configuration
└── components/dashboard/
    ├── index.ts                           # Component exports
    ├── LocationCard.tsx                   # Location display card
    ├── SensorCard.tsx                     # Individual sensor card
    ├── DataCard.tsx                       # Data display card
    ├── SensorsModal.tsx                   # Sensors list modal
    ├── LiveDataModal.tsx                  # Live data display modal
    ├── ThresholdConfigModal.tsx           # Threshold configuration modal
    └── IntervalMenuModal.tsx              # Polling interval selector
```

## Module Breakdown

### Types (`types/dashboard/index.ts`)

Exports all TypeScript interfaces:

- `SensorInfo` - Sensor metadata and information
- `Probe` - Probe configuration interface
- `Range` - Min/max threshold range
- `LocationInfo` - Location grouping data
- `DataRow` - Live data row structure
- `PollOption` - Polling interval option

### Constants (`constants/dashboard/index.ts`)

Exports application constants:

- `FIELD_LABELS` - Display labels for sensor fields
- `DEFAULT_THRESHOLDS` - Default threshold values
- `POLL_OPTIONS` - Available polling interval options

### Hooks (`hooks/dashboard/`)

Custom hooks encapsulating business logic:

#### `useSensorList.ts`

- Manages sensor list data fetching
- Handles location grouping
- Provides error handling for API calls

#### `useLiveData.ts`

- Manages live sensor data polling
- Handles polling interval configuration
- Provides real-time data updates

#### `useThresholds.ts`

- Manages threshold configuration
- Handles local and remote threshold persistence
- Manages alert enable/disable functionality

### Components (`components/dashboard/`)

Reusable UI components:

#### `LocationCard.tsx`

- Displays individual location information
- Shows sensor count and last updated time
- Handles location selection

#### `SensorCard.tsx`

- Displays individual sensor information
- Shows sensor status and basic metrics
- Handles sensor selection

#### `DataCard.tsx`

- Displays live sensor data values
- Shows threshold indicators
- Handles value formatting

#### Modal Components

- `SensorsModal.tsx` - Lists sensors for a location
- `LiveDataModal.tsx` - Shows live sensor data
- `ThresholdConfigModal.tsx` - Configures thresholds
- `IntervalMenuModal.tsx` - Selects polling intervals

## Key Features Preserved

✅ **Live Data Polling** - Real-time sensor data updates
✅ **Threshold Configuration** - Configurable min/max thresholds
✅ **Alert Management** - Enable/disable alert notifications
✅ **Location Grouping** - Sensors organized by location
✅ **Responsive Layout** - Adaptive column layout
✅ **Pull-to-Refresh** - Manual data refresh capability
✅ **Local Storage** - Persistent threshold and polling settings
✅ **Remote Sync** - Backend threshold synchronization

## Benefits of Modular Architecture

### 1. **Maintainability**

- Each component has a single responsibility
- Business logic is separated from UI components
- Clear separation of concerns

### 2. **Reusability**

- Components can be reused across different screens
- Hooks can be shared between components
- Types ensure consistent data structures

### 3. **Testability**

- Individual components can be tested in isolation
- Business logic in hooks can be unit tested
- Mock data can be easily injected

### 4. **Scalability**

- New features can be added without modifying existing code
- Components can be extended or composed
- Easy to add new sensor types or data fields

### 5. **Developer Experience**

- Clear import structure with barrel exports
- IntelliSense support for all types
- Easier debugging and error tracking

## Usage Examples

### Importing Components

```typescript
import { LocationCard, SensorsModal } from '../../components/dashboard';
```

### Using Custom Hooks

```typescript
const { allSensors, locs, err, fetchSensorList } = useSensorList();
const { rows, metaTxt, liveBusy, pollInterval } = useLiveData(
  sensorId,
  location,
  isOpen
);
```

### Type Safety

```typescript
const sensors: SensorInfo[] = [];
const thresholds: Record<string, Range> = {};
```

## Future Enhancements

The modular structure makes it easy to add:

- New sensor types and data fields
- Additional chart/visualization components
- Enhanced filtering and search capabilities
- Real-time notification systems
- Data export functionality
- Advanced analytics and reporting

## Conclusion

The dashboard has been successfully modularized while maintaining 100% of its original functionality. The new architecture provides a solid foundation for future development and makes the codebase much more maintainable and scalable.
