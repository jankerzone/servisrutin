# Phase 6: Technical Implementation Details

## 1. Data Transformation Pattern

### Problem: Type Mismatch Between API and Frontend

**Database Schema (SQLite)**:
```sql
CREATE TABLE kendaraan (
  id INTEGER PRIMARY KEY,
  nama TEXT NOT NULL,
  tipe TEXT,
  plat TEXT,
  tahun INTEGER,
  bulan_pajak INTEGER,    -- snake_case
  current_km INTEGER      -- snake_case
);

CREATE TABLE service_items (
  id INTEGER PRIMARY KEY,
  kendaraan_id INTEGER,   -- snake_case
  nama TEXT NOT NULL,
  interval_type TEXT,     -- snake_case
  interval_value INTEGER, -- snake_case
  last_km INTEGER,        -- snake_case
  last_date TEXT          -- snake_case
);
```

**Drizzle ORM Schema (TypeScript)**:
```typescript
export const kendaraan = sqliteTable('kendaraan', {
  id: integer('id').primaryKey(),
  nama: text('nama').notNull(),
  tipe: text('tipe'),
  plat: text('plat'),
  tahun: integer('tahun'),
  bulanPajak: integer('bulan_pajak'),    // camelCase property, snake_case column
  currentKm: integer('current_km'),      // camelCase property, snake_case column
});
```

**Issue**: D1 Database API returns raw column names (snake_case), not the Drizzle property names (camelCase).

### Solution: Transformation Layer

**VehicleSelector.tsx**:
```typescript
const fetchVehicles = async () => {
  try {
    const response = await fetch('/api/vehicles');
    const data = await response.json();
    
    // Transform snake_case to camelCase
    const transformedVehicles = (data.results || []).map((v: any) => ({
      id: v.id,
      nama: v.nama,
      tipe: v.tipe,
      plat: v.plat,
      tahun: v.tahun,
      bulanPajak: v.bulan_pajak,     // Transform
      currentKm: v.current_km,        // Transform
    }));
    
    setVehicles(transformedVehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
  }
};
```

**ServiceList.tsx**:
```typescript
const fetchServiceItems = async () => {
  try {
    const response = await fetch(`/api/service-items?kendaraanId=${kendaraanId}`);
    const data = await response.json();
    
    // Transform snake_case to camelCase
    const transformedItems = (data.results || []).map((item: any) => ({
      id: item.id,
      kendaraanId: item.kendaraan_id,       // Transform
      nama: item.nama,
      intervalType: item.interval_type,     // Transform
      intervalValue: item.interval_value,   // Transform
      lastKm: item.last_km,                 // Transform
      lastDate: item.last_date,             // Transform
    }));
    
    setItems(transformedItems);
  } catch (error) {
    console.error('Error fetching service items:', error);
  }
};
```

### Why Not Transform in Backend?

**Option A: Transform in Hono API**
```typescript
app.get('/api/vehicles', async (c) => {
  const results = await db.prepare('SELECT * FROM kendaraan').all();
  
  // Transform each result
  const transformed = results.results.map(v => ({
    id: v.id,
    nama: v.nama,
    bulanPajak: v.bulan_pajak,
    currentKm: v.current_km,
  }));
  
  return c.json({ success: true, results: transformed });
});
```

**Decision**: Keep API responses raw (snake_case)
- **Consistency**: D1 Database raw format matches SQLite conventions
- **Debugging**: Easier to trace data from DB → API → Frontend
- **Flexibility**: Different frontends may prefer different formats
- **Performance**: One transformation at boundary vs multiple in backend

---

## 2. Zustand Store Architecture

### Before: Prop Drilling and Stale State

```
App.tsx
  ├─ [currentKm] state (useState)
  │   └─ Only updates on mount and vehicle change
  │
  ├─ VehicleSelector
  │   └─ Updates DB via API
  │       └─ ❌ No way to tell App.tsx
  │
  └─ ServiceView [currentKm] prop
      └─ ServiceList [currentKm] prop
          └─ calculateProgress() uses stale currentKm
```

### After: Centralized Store

**Store Definition** (`useKendaraanStore.ts`):
```typescript
import { create } from 'zustand';

interface KendaraanStore {
  selectedKendaraanId: number | null;
  currentKm: number;
  setSelectedKendaraanId: (id: number) => void;
  setCurrentKm: (km: number) => void;
}

export const useKendaraanStore = create<KendaraanStore>((set) => ({
  selectedKendaraanId: 1,
  currentKm: 0,
  setSelectedKendaraanId: (id) => set({ selectedKendaraanId: id }),
  setCurrentKm: (km) => set({ currentKm: km }),
}));
```

**Usage in VehicleSelector**:
```typescript
const setCurrentKm = useKendaraanStore((state) => state.setCurrentKm);

// After fetching vehicles
const fetchVehicles = async () => {
  // ... fetch logic
  setVehicles(transformedVehicles);
  
  // Update store
  if (selectedKendaraanId) {
    const currentVehicle = transformedVehicles.find(v => v.id === selectedKendaraanId);
    if (currentVehicle) {
      setCurrentKm(currentVehicle.currentKm || 0);
    }
  }
};

// After updating KM
const handleUpdateKm = async () => {
  const response = await fetch(`/api/vehicles/${selectedKendaraanId}/km`, {
    method: 'PUT',
    body: JSON.stringify({ currentKm: parseInt(kmInput) }),
  });
  
  if (response.ok) {
    fetchVehicles();  // This updates store
  }
};
```

**Usage in App.tsx**:
```typescript
// Before (useState)
const [currentKm, setCurrentKm] = useState(0);

// After (Zustand)
const currentKm = useKendaraanStore((state) => state.currentKm);
```

### Zustand Benefits

1. **Automatic Re-renders**: Components subscribing to store re-render on changes
2. **No Prop Drilling**: Deep components access store directly
3. **Single Source of Truth**: One place for currentKm
4. **DevTools Support**: Zustand has browser devtools for debugging
5. **TypeScript Support**: Fully typed store interface

---

## 3. Progress Bar Calculation Logic

### KM-Based Intervals

```typescript
if (item.intervalType === 'KM' && item.lastKm && item.intervalValue) {
  const kmSinceLast = currentKm - item.lastKm;
  const progress = (kmSinceLast / item.intervalValue) * 100;
  return Math.min(Math.max(progress, 0), 100);
}
```

**Example**:
- Last service: 18,000 km
- Current km: 20,000 km
- Interval: 5,000 km
- Progress: `(20000 - 18000) / 5000 * 100 = 40%`
- Due at: 18,000 + 5,000 = 23,000 km

### Time-Based Intervals

```typescript
if (['DAY', 'MONTH', 'YEAR'].includes(item.intervalType) && item.lastDate && item.intervalValue) {
  const lastDate = new Date(item.lastDate);
  const now = new Date();
  const daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  
  let intervalInDays = item.intervalValue;
  if (item.intervalType === 'MONTH') intervalInDays *= 30;
  if (item.intervalType === 'YEAR') intervalInDays *= 365;
  
  const progress = (daysSinceLast / intervalInDays) * 100;
  return Math.min(Math.max(progress, 0), 100);
}
```

**Example (MONTH)**:
- Last service: July 1, 2024
- Current date: October 21, 2024
- Interval: 6 months
- Days since: ~112 days
- Interval in days: 6 × 30 = 180 days
- Progress: `112 / 180 * 100 ≈ 62%`

### Color Coding

```typescript
const progress = calculateProgress(item);
const color = progress < 50 ? 'success' : progress < 80 ? 'warning' : 'error';
```

- **Green (success)**: 0-49% - Fresh, plenty of time
- **Yellow (warning)**: 50-79% - Getting close, plan ahead
- **Red (error)**: 80-100%+ - Urgent, service soon/overdue

---

## 4. Edit Service Item Implementation

### Component Structure

**EditServiceForm.tsx** (similar to AddServiceForm but with pre-populated data):

```typescript
export default function EditServiceForm({ open, onClose, item, onSuccess }: EditServiceFormProps) {
  const [nama, setNama] = useState('');
  const [intervalType, setIntervalType] = useState<IntervalType>('KM');
  const [intervalValue, setIntervalValue] = useState('');
  const [lastKm, setLastKm] = useState('');
  const [lastDate, setLastDate] = useState('');

  // Pre-populate form with existing data
  useEffect(() => {
    if (item) {
      setNama(item.nama);
      setIntervalType((item.intervalType || 'KM') as IntervalType);
      setIntervalValue(item.intervalValue?.toString() || '');
      setLastKm(item.lastKm?.toString() || '');
      setLastDate(item.lastDate || '');
    }
  }, [item]);

  const handleSubmit = async () => {
    const response = await fetch(`/api/service-items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama,
        intervalType,
        intervalValue: intervalType === 'NONE' ? null : parseInt(intervalValue),
        lastKm: lastKm ? parseInt(lastKm) : null,
        lastDate: lastDate || null,
      }),
    });

    if (response.ok) {
      onSuccess?.();
      onClose();
    }
  };
  
  // ... form JSX similar to AddServiceForm
}
```

### Backend PUT Endpoint

```typescript
app.put('/api/service-items/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { nama, intervalType, intervalValue, lastKm, lastDate } = body;
    const db = c.env.DB;
    
    await db
      .prepare(
        'UPDATE service_items SET nama = ?, interval_type = ?, interval_value = ?, last_km = ?, last_date = ? WHERE id = ?'
      )
      .bind(nama, intervalType, intervalValue, lastKm, lastDate, id)
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating service item:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});
```

### Integration in ServiceList

```typescript
const [editItem, setEditItem] = useState<ServiceItem | null>(null);

// Edit button in card
<IconButton size="small" onClick={() => setEditItem(item)} color="primary">
  <EditIcon fontSize="small" />
</IconButton>

// Edit dialog
{editItem && (
  <EditServiceForm
    open={true}
    onClose={() => setEditItem(null)}
    item={editItem}
    onSuccess={handleEditSuccess}
  />
)}

const handleEditSuccess = () => {
  fetchServiceItems();  // Refresh list
  setEditItem(null);    // Close dialog
};
```

---

## 5. Delete with Confirmation

### Delete Dialog

```typescript
const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

// Delete button
<IconButton size="small" onClick={() => setDeleteConfirm(item.id)} color="error">
  <DeleteIcon fontSize="small" />
</IconButton>

// Confirmation dialog
<Dialog open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}>
  <DialogTitle>Confirm Delete</DialogTitle>
  <DialogContent>
    <Typography>Are you sure you want to delete this service item?</Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
    <Button 
      onClick={() => deleteConfirm && handleDelete(deleteConfirm)} 
      color="error" 
      variant="contained"
    >
      Delete
    </Button>
  </DialogActions>
</Dialog>
```

### Delete Handler

```typescript
const handleDelete = async (id: number) => {
  try {
    const response = await fetch(`/api/service-items/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      fetchServiceItems();      // Refresh list
      setDeleteConfirm(null);   // Close dialog
    }
  } catch (error) {
    console.error('Error deleting service item:', error);
  }
};
```

### Backend DELETE Endpoint

```typescript
app.delete('/api/service-items/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = c.env.DB;
    
    await db
      .prepare('DELETE FROM service_items WHERE id = ?')
      .bind(id)
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting service item:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});
```

---

## 6. Material-UI Integration Details

### Icon Buttons with Colors

```typescript
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

<IconButton size="small" color="primary">
  <EditIcon fontSize="small" />
</IconButton>

<IconButton size="small" color="error">
  <DeleteIcon fontSize="small" />
</IconButton>
```

### Dialog Forms

```typescript
<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
  <DialogTitle>Title</DialogTitle>
  <DialogContent>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      <TextField label="Label" value={value} onChange={onChange} fullWidth />
    </Box>
  </DialogContent>
  <DialogActions>
    <Button onClick={onClose}>Cancel</Button>
    <Button onClick={handleSubmit} variant="contained">Submit</Button>
  </DialogActions>
</Dialog>
```

### Progress Bar with Dynamic Colors

```typescript
<LinearProgress 
  variant="determinate" 
  value={progress}                              // 0-100
  color={color}                                 // 'success' | 'warning' | 'error'
  sx={{ height: 8, borderRadius: 1 }}
/>
```

---

## 7. Performance Considerations

### Memoization Opportunities (Future)

```typescript
// Current: Recalculates progress on every render
const progress = calculateProgress(item);

// Future: Memoize expensive calculations
const progress = useMemo(
  () => calculateProgress(item),
  [item, currentKm]  // Only recalculate when these change
);
```

### API Call Optimization

**Current**: Each action triggers full list refresh
```typescript
const handleEditSuccess = () => {
  fetchServiceItems();  // Fetches ALL items
};
```

**Future**: Optimistic updates
```typescript
const handleEditSuccess = (updatedItem: ServiceItem) => {
  setItems(prevItems => 
    prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
  );
};
```

### Bundle Size

Current build stats:
```
../public/assets/index-COQ9bIIq.js   479.03 kB │ gzip: 146.14 kB
```

Largest dependencies:
- React + React DOM: ~140 KB
- Material-UI: ~200 KB
- Zustand: ~3 KB (excellent!)
- date-fns: ~20 KB

**Future optimization**: Use Material-UI tree shaking more effectively.

---

## 8. Error Handling Patterns

### Current Pattern

```typescript
try {
  const response = await fetch('/api/endpoint');
  if (response.ok) {
    // Success path
  } else {
    console.error('Error:', await response.text());
  }
} catch (error) {
  console.error('Error:', error);
}
```

### Future Enhancement: User Feedback

```typescript
const [error, setError] = useState<string | null>(null);

try {
  const response = await fetch('/api/endpoint');
  if (!response.ok) {
    const errorData = await response.json();
    setError(errorData.error || 'Something went wrong');
    return;
  }
  // Success
  setError(null);
} catch (error) {
  setError('Network error. Please try again.');
}

// Show error to user
{error && (
  <Alert severity="error" onClose={() => setError(null)}>
    {error}
  </Alert>
)}
```

---

## 9. TypeScript Type Safety

### Interface Definitions

```typescript
interface Vehicle {
  id: number;
  nama: string;
  tipe: string | null;
  plat: string | null;
  tahun: number | null;
  bulanPajak: number | null;
  currentKm: number | null;
}

interface ServiceItem {
  id: number;
  kendaraanId: number;
  nama: string;
  intervalType: string | null;
  intervalValue: number | null;
  lastKm: number | null;
  lastDate: string | null;
}
```

### Type Guards (Future)

```typescript
function isValidServiceItem(item: any): item is ServiceItem {
  return (
    typeof item.id === 'number' &&
    typeof item.nama === 'string' &&
    // ... other checks
  );
}

// Usage
const transformedItems = (data.results || [])
  .map(transformItem)
  .filter(isValidServiceItem);
```

---

## 10. Testing Strategy

### Manual Test Checklist

- [ ] Add vehicle with all fields
- [ ] Add vehicle with only required fields
- [ ] Update current KM
- [ ] Add service item (KM interval)
- [ ] Add service item (time interval)
- [ ] Edit service item
- [ ] Delete service item
- [ ] Switch between vehicles
- [ ] Verify progress bar updates
- [ ] Check due date calculations
- [ ] Test overdue services (red bar)

### Future: Automated Tests

**Unit Tests** (Vitest):
```typescript
describe('calculateProgress', () => {
  it('calculates KM progress correctly', () => {
    const item = { lastKm: 18000, intervalValue: 5000, intervalType: 'KM' };
    const progress = calculateProgress(item, 20000);
    expect(progress).toBe(40);
  });
  
  it('caps progress at 100%', () => {
    const item = { lastKm: 18000, intervalValue: 5000, intervalType: 'KM' };
    const progress = calculateProgress(item, 30000);
    expect(progress).toBe(100);
  });
});
```

**Integration Tests** (Playwright):
```typescript
test('edit service item', async ({ page }) => {
  await page.goto('http://localhost:8787');
  await page.click('[data-testid="edit-button-1"]');
  await page.fill('input[name="intervalValue"]', '3000');
  await page.click('button:has-text("Update")');
  await expect(page.locator('text=Due: 21,000 km')).toBeVisible();
});
```

---

## Summary

Phase 6 established critical patterns for:
1. **Data transformation** at API boundaries
2. **State management** with Zustand
3. **Progress calculation** for KM and time-based intervals
4. **CRUD operations** for service items
5. **User feedback** with dialogs and confirmations

These improvements create a solid foundation for future enhancements.
