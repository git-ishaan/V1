# 📋 Sensor Dashboard Project Context

## 🏗️ Project Overview

This is a React Native Expo application for monitoring IoT sensors in real-time. The app provides dashboard functionality for viewing sensor data, configuring thresholds, and generating reports with export capabilities.

### 🎯 Key Features
- Real-time sensor monitoring with configurable polling
- Location-based sensor grouping
- Threshold configuration with breach alerts
- Data export (CSV/PDF)
- Push notifications for sensor alerts
- Responsive design for mobile and tablet

---

## 🏛️ Architecture Pattern

The project follows a **modular architecture** with clear separation of concerns:

```
📁 Project Structure
├── app/(tabs)/                     # Main screen components
├── types/                          # TypeScript interfaces
├── constants/                      # Application constants
├── hooks/                          # Custom React hooks (business logic)
├── components/                     # Reusable UI components
├── services/                       # External service integrations
└── assets/                         # Static assets
```

---

## 📡 API Integration

### Base Configuration (`app/api.ts`)
```typescript
// Central API wrapper with:
✅ Base URL configuration from environment
✅ API key authentication via x-api-key header
✅ Request/response logging for debugging
✅ Error handling and JSON parsing
✅ TypeScript generics for type safety
```

### Environment Variables
```bash
EXPO_PUBLIC_API_BASE_URL=https://your-api.com
EXPO_PUBLIC_API_KEY=your-api-key
```

---

## 🏠 Dashboard Module

### 📊 Purpose
Provides real-time monitoring of IoT sensors grouped by location with live data polling and threshold management.

### 🗂️ File Structure & Responsibilities

#### **Types (`types/dashboard/index.ts`)**
```typescript
// Data structure definitions
- SensorInfo: Sensor metadata (id, status, location, timestamps)
- Probe: Individual sensor readings with thresholds
- Range: Min/max threshold configuration
- LocationInfo: Location grouping with sensor counts
- DataRow: Formatted display data
- PollOption: Polling interval configuration
```

#### **Constants (`constants/dashboard/index.ts`)**
```typescript
// Static configuration
- FIELD_LABELS: Human-readable field names
  └── "readings_humidity_dht" → "Humidity (%RH)"
  └── "readings_temperature_dht" → "Temperature (°C)"
  └── "readings_pzem_voltage" → "Voltage (V)"
- DEFAULT_THRESHOLDS: Initial threshold values
- POLL_OPTIONS: [10sec, 30sec, 45sec, 1min, 5min]
```

#### **Hooks (Business Logic)**

##### `hooks/dashboard/useSensorList.ts`
```typescript
// Manages sensor inventory and location grouping
Responsibilities:
✅ Fetches sensor list from /sensors endpoint
✅ Groups sensors by location
✅ Calculates up/down counts per location
✅ Provides refresh functionality
✅ Error handling and loading states

API Calls:
- GET /sensors?utc=false
```

##### `hooks/dashboard/useLiveData.ts`
```typescript
// Handles real-time sensor data polling
Responsibilities:
✅ Fetches live sensor details from API
✅ Manages configurable polling intervals
✅ Formats data with proper units
✅ Handles threshold breach indicators
✅ Auto-starts/stops polling based on modal state
✅ Persists polling preferences to AsyncStorage

API Calls:
- GET /sensor/{id}/details?utc=false

Polling Logic:
- Uses setInterval for continuous updates
- Cleans up intervals on component unmount
- Respects user-selected polling frequency
```

##### `hooks/dashboard/useThresholds.ts`
```typescript
// Manages threshold configuration
Responsibilities:
✅ Loads/saves thresholds locally and remotely
✅ Posts threshold changes to backend
✅ Manages alert enable/disable state
✅ Bulk threshold updates
✅ Error handling for API failures

API Calls:
- POST /sensors/{id}/thresholds (bulk update)
- POST /thresholds (single threshold)

Storage:
- AsyncStorage for local persistence
- Remote sync to backend API
```

#### **Components (UI Layer)**

##### `components/dashboard/LocationCard.tsx`
```typescript
// Individual location display card
Features:
✅ Shows location name and sensor counts
✅ Displays last seen timestamp
✅ Color-coded up/down status
✅ Press animations and responsive design
✅ Opens sensor list modal on tap
```

##### `components/dashboard/SensorCard.tsx`
```typescript
// Individual sensor display card
Features:
✅ Shows sensor ID and status
✅ Color-coded status indicators (green=up, red=down)
✅ Last seen timestamp with relative time
✅ Opens live data modal on tap
✅ Responsive grid layout
```

##### `components/dashboard/DataCard.tsx`
```typescript
// Live sensor data display
Features:
✅ Formatted sensor readings with units
✅ Threshold min/max display
✅ Color-coded breach indicators
✅ Responsive card layout
✅ Proper numeric formatting
```

##### `components/dashboard/SensorsModal.tsx`
```typescript
// Full-screen sensor list modal
Features:
✅ Grid layout for sensor cards
✅ Pull-to-refresh functionality
✅ Dynamic column count based on screen size
✅ Loading states and error handling
✅ Navigation header with close button
```

##### `components/dashboard/LiveDataModal.tsx`
```typescript
// Real-time sensor data modal
Features:
✅ Live polling data cards
✅ Sensor metadata display
✅ Polling interval selector
✅ Configure thresholds button
✅ Auto-refresh with visual feedback
✅ Controls for threshold configuration
```

##### `components/dashboard/ThresholdConfigModal.tsx`
```typescript
// Threshold configuration interface
Features:
✅ Input fields for min/max values
✅ Toggle for enabling/disabling alerts
✅ Scrollable form for all sensor fields
✅ Save/cancel actions
✅ Validation and error handling
✅ Real-time threshold updates
```

##### `components/dashboard/IntervalMenuModal.tsx`
```typescript
// Polling interval selection bottom sheet
Features:
✅ List of predefined intervals
✅ Bottom sheet slide animation
✅ Selection handling with AsyncStorage
✅ Cancel option
```

#### **Main Screen (`app/(tabs)/index.tsx`)**
```typescript
// Dashboard orchestration component
Responsibilities:
✅ Imports and coordinates all modular components
✅ Manages overall navigation state
✅ Handles modal opening/closing
✅ Responsive layout management
✅ Error boundary and loading states

State Management:
- Modal visibility states
- Selected location/sensor
- Refresh states
- Column count calculation
```

### 🔄 Data Flow

1. **App Mount**: Fetch sensor list grouped by location
2. **Location Selection**: Filter sensors, open sensor modal
3. **Sensor Selection**: Start live data polling
4. **Threshold Config**: Load current thresholds, save changes
5. **Polling**: Continuous data updates with configurable interval

### 📱 User Journey

```
Dashboard → Location Cards → Sensor List → Live Data → Configure Thresholds
    ↓            ↓              ↓           ↓              ↓
  Refresh    Pull-to-Refresh   Tap Sensor  Live Polling   Save to API
```

---

## 📊 Report Module

### 📈 Purpose
Provides historical data analysis with time-based queries and export capabilities for CSV/PDF formats.

### 🗂️ File Structure & Responsibilities

#### **Types (`types/report/index.ts`)**
```typescript
// Report-specific data structures
- SensorData: Sensor metadata for reports
- TimeRange: Time period configuration
- ReportQuery: API query parameters
- ReportRow: Table row data structure
- MenuOption: Selection menu configuration
- ReportState: Complete state management
- ExportOptions: Export format settings
```

#### **Constants (`constants/report/index.ts`)**
```typescript
// Report configuration
- FIELD_LABELS: Display names for report columns
- TIME_RANGE_OPTIONS: [1hr, 2hr, 12hr, 1d, 2d, 7d, 30d]
- AGGREGATION_WINDOW_OPTIONS: [1m, 5m, 15m, 1h, 1d]
- UNDESIRED_FIELDS: Fields to exclude from reports
- PDF_STYLES: CSS styling for PDF generation
```

#### **Hooks (Business Logic)**

##### `hooks/report/useSensorData.ts`
```typescript
// Manages sensor selection for reports
Responsibilities:
✅ Fetches available locations and sensors
✅ Handles location-based filtering
✅ Auto-updates sensor list on location change
✅ Loading states and error management

API Calls:
- GET /sensors (for location/sensor options)
```

##### `hooks/report/useReport.ts`
```typescript
// Report generation and data processing
Responsibilities:
✅ Manages time range and aggregation settings
✅ Executes report queries to API
✅ Processes and formats returned data
✅ Filters unwanted fields
✅ Data transformation for table display
✅ Modal state management

API Calls:
- POST /report (with query parameters)

Data Processing:
- Timestamp formatting
- Numeric value formatting
- Field filtering and column generation
```

##### `hooks/report/useReportExport.ts`
```typescript
// Export functionality (CSV/PDF)
Responsibilities:
✅ Generates CSV files from report data
✅ Creates formatted PDF reports
✅ File system operations
✅ Share/download functionality
✅ Export format selection

Dependencies:
- expo-file-system: File operations
- expo-sharing: Share functionality
- Future: react-native-html-to-pdf for PDF generation
```

#### **Components (UI Layer)**

##### `components/report/ReportForm.tsx`
```typescript
// Report configuration form
Features:
✅ Location selection dropdown
✅ Sensor selection dropdown (filtered by location)
✅ Time range picker
✅ Aggregation window selector
✅ Submit button with loading states
✅ Error message display
✅ Form validation
```

##### `components/report/ReportTable.tsx`
```typescript
// Data table for report display
Features:
✅ Horizontal scrollable table
✅ Dynamic column generation
✅ Formatted headers and data
✅ Responsive column sizing
✅ Alternating row colors
✅ Proper data type formatting
```

##### `components/report/ReportModal.tsx`
```typescript
// Report results modal container
Features:
✅ Full-screen report display
✅ Header with location/sensor information
✅ Row count indicator
✅ Download/export button
✅ Contains ReportTable component
✅ Scroll handling for large datasets
```

##### `components/report/BottomSheetMenu.tsx`
```typescript
// Reusable selection menu (shared component)
Features:
✅ Bottom sheet slide animation
✅ Option list with custom rendering
✅ Selection handling with callbacks
✅ Cancel functionality
✅ Used for all dropdown selections
```

#### **Main Screen (`app/(tabs)/report.tsx`)**
```typescript
// Report orchestration component
Responsibilities:
✅ Form state management
✅ Menu visibility control
✅ Report generation workflow
✅ Export coordination
✅ Modal navigation

State Flow:
Location Select → Sensor Filter → Time Range → Aggregation → Generate → Export
```

### 🔄 Data Flow

1. **Form Configuration**: Select location, sensor, time range, aggregation
2. **Query Execution**: POST to /report endpoint with parameters
3. **Data Processing**: Format timestamps, filter fields, generate columns
4. **Display**: Show results in scrollable table
5. **Export**: Generate CSV/PDF and share

### 📱 User Journey

```
Report Form → Configure Parameters → Generate Report → View Results → Export Data
     ↓              ↓                    ↓              ↓            ↓
   Select      Time Range +         API Query      Scroll Table   CSV/PDF
  Location    Aggregation                                        Download
```

---

## 🔧 Shared Infrastructure

### **API Layer (`app/api.ts`)**
```typescript
// Centralized API communication
Features:
✅ Base URL and API key configuration
✅ Request/response logging
✅ Error handling with proper HTTP status
✅ JSON parsing with fallback to text
✅ TypeScript generics for type safety
✅ Used by all modules (dashboard, report, etc.)

Usage Pattern:
const data = await apiFetch<SensorInfo[]>('/sensors');
const result = await apiFetch('/thresholds', {
  method: 'POST',
  body: JSON.stringify(payload)
});
```

### **Configuration Files**

#### `app.json` - Expo Configuration
```json
{
  "expo": {
    "name": "Sensor Dashboard",
    "plugins": [
      "expo-notifications",    // Push notifications
      "expo-device",          // Device info
      "@react-native-async-storage/async-storage"
    ],
    "notification": {
      "androidMode": "default",
      "androidCollapsedTitle": "Sensor Alert"
    }
  }
}
```

#### `eas.json` - Build Configuration
```json
{
  "build": {
    "development": { "developmentClient": true },
    "preview": { "android": { "buildType": "apk" } },
    "production": { "autoIncrement": true }
  }
}
```

### **Services**

#### `services/NotificationService.ts`
```typescript
// Push notification handling
Features:
✅ Notification channel setup (Android)
✅ Push notification scheduling
✅ Notification listeners
✅ Permission management
✅ Integration with Expo notifications
```

---

## 🔄 State Management Patterns

### **Hook-Based State Management**
- Each module has dedicated hooks for business logic
- State is colocated with related functionality
- AsyncStorage for persistence
- API state synchronized with local state

### **Component State Flow**
```
Main Screen → Hooks (Business Logic) → Components (UI) → User Actions → API Calls
     ↑                                                                      ↓
AsyncStorage ← State Updates ← Data Processing ← API Response ←──────────────┘
```

### **Error Handling Strategy**
- Try-catch blocks in all async operations
- User-friendly error messages
- Console logging for debugging
- Graceful degradation for network issues

---

## 📱 Device Integration

### **Device Registration**
```typescript
// On app mount (should be in app/_layout.tsx)
- Collect device ID and Expo push token
- POST to /device/register endpoint
- Handle permission requests
- Store registration status
```

### **Push Notifications**
```typescript
// Notification flow
- Backend sends push notifications for threshold breaches
- App receives notification via Expo
- User taps notification → navigate to relevant sensor
- Handle foreground/background notification states
```

### **Local Storage**
```typescript
// AsyncStorage usage
- Polling intervals: `pollInterval:{location}:{sensor}`
- Thresholds: `thresholds:{location}:{sensor}`
- User preferences and settings
- Offline data caching
```

---

## 🏃‍♂️ Performance Optimizations

### **Polling Management**
- Intelligent interval cleanup
- Pause polling when modals are closed
- User-configurable polling frequencies
- Prevent memory leaks with useRef

### **Data Processing**
- Field filtering to reduce payload size
- Efficient data transformation
- Memoized calculations where appropriate
- Responsive UI updates

### **Network Efficiency**
- Batched API calls where possible
- Request deduplication
- Proper error handling and retries
- Offline capability considerations

---

## 🧪 Testing Strategy

### **Unit Testing**
- Test hooks independently with mock data
- Component testing with React Native Testing Library
- API layer testing with mock responses
- Utility function testing

### **Integration Testing**
- End-to-end user flows
- API integration testing
- Navigation flow testing
- Data persistence testing

---

## 🚀 Deployment & Distribution

### **Development Workflow**
```bash
# Local development
expo start

# Build for testing
eas build --profile preview

# Production build
eas build --profile production
```

### **Environment Management**
- Development: Local API with mock data
- Staging: Testing API with real sensors
- Production: Live API with monitoring

---

## 🔍 Debugging & Monitoring

### **Logging Strategy**
- API requests/responses logged in console
- State changes logged for debugging
- Error tracking for production issues
- Performance monitoring for optimization

### **Development Tools**
- React Native Debugger
- Expo Developer Tools
- Network inspection
- AsyncStorage inspection

---

## 📚 Dependencies & Libraries

### **Core Framework**
- React Native + Expo
- TypeScript for type safety
- NativeWind for styling

### **Key Libraries**
```json
{
  "expo-notifications": "Push notification handling",
  "expo-device": "Device information",
  "@react-native-async-storage/async-storage": "Local storage",
  "expo-file-system": "File operations for exports",
  "expo-sharing": "File sharing functionality",
  "dayjs": "Date/time formatting and manipulation",
  "@expo/vector-icons": "Icon library"
}
```

---

## 🎯 Future Enhancements

### **Planned Features**
- Real-time WebSocket connections
- Advanced analytics and trends
- User management and permissions
- Custom dashboard layouts
- Offline mode with sync
- Advanced PDF reporting with charts
- Multi-language support

### **Technical Improvements**
- Migration to React Query for API state
- Enhanced error boundary implementation
- Performance monitoring integration
- Automated testing pipeline
- CI/CD with EAS

---

## 🛠️ Development Guidelines

### **Code Organization**
- Follow the established modular pattern
- Keep components focused and reusable
- Extract business logic to custom hooks
- Maintain consistent naming conventions

### **TypeScript Usage**
- Define proper interfaces for all data structures
- Use generics for API functions
- Avoid `any` types where possible
- Maintain strict type checking

### **Performance Best Practices**
- Use React.memo for expensive components
- Implement proper cleanup in useEffect
- Optimize large lists with FlatList
- Monitor bundle size and optimize imports

This context file serves as the complete reference for understanding, maintaining, and extending the Sensor Dashboard project. Keep it updated as the project evolves! 🚀