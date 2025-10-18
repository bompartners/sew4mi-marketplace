# Debugging 400 Error - Calculate Pricing Endpoint

## The Error
```
POST /api/orders/calculate-pricing
Status: 400 Bad Request
```

## What This Means
The request is failing validation. The endpoint expects:

```typescript
{
  garmentTypeId: string,      // e.g., "traditional-suit"
  fabricChoice: enum,         // "TAILOR_SOURCED" or "CUSTOMER_PROVIDED"
  urgencyLevel: enum,         // "STANDARD", "URGENT", or "EXPRESS"
  tailorId: string (UUID)     // e.g., "uuid-format"
}
```

---

## How to Debug

### Step 1: Check Browser Console

In your browser (with wizard open):
1. Press `F12` to open DevTools
2. Go to **Console** tab
3. Look for error messages showing what's missing

### Step 2: Check Network Request

1. Go to **Network** tab in DevTools
2. Find the `calculate-pricing` request (it's red/400)
3. Click on it
4. Go to **Payload** or **Request** tab
5. Check what was sent

### Step 3: Common Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| Missing `garmentTypeId` | "garmentTypeId: Garment type ID is required" | Ensure garment selected |
| Wrong ID format | "garmentTypeId" is not correct | Should be kebab-case like "traditional-suit", not full name |
| Missing `fabricChoice` | "fabricChoice" validation error | Ensure Step 3 completed |
| Missing `urgencyLevel` | "urgencyLevel" validation error | Ensure Step 5 completed |
| Invalid enum value | "Invalid fabric choice" or "Invalid urgency level" | Check enum values match exactly |
| Missing `tailorId` | "Invalid tailor ID" | Ensure tailor was selected |

---

## Quick Fix: Check the Wizard State

In browser console, while on the wizard page, run:

```javascript
// This will show you what's in the wizard state
console.log('Current wizard state:', {
  step: state.step,
  tailorId: state.tailorId,
  garmentType: state.garmentType,
  fabricChoice: state.fabricChoice,
  urgencyLevel: state.urgencyLevel
});
```

Look for:
- ❌ `garmentType: undefined` or `garmentType: null`
- ❌ `garmentType.id: undefined` 
- ❌ `fabricChoice: undefined`
- ❌ `urgencyLevel: undefined`
- ❌ `tailorId: undefined`

---

## Most Likely Issue

Based on the error happening at the calculate-pricing step, the most likely causes are:

### Issue 1: `garmentType.id` is missing or wrong format

The wizard might be sending the full garment name instead of the ID.

**Check:**
```javascript
// In console:
state.garmentType.id  // Should be: "traditional-suit", not "Traditional Suit"
```

### Issue 2: State not persisting between steps

The wizard might be losing state between steps.

**Check:**
```javascript
// After Step 2 (garment selection):
console.log('Garment selected:', state.garmentType);

// After Step 3 (specifications):
console.log('Fabric choice:', state.fabricChoice);

// After Step 5 (timeline):
console.log('Urgency level:', state.urgencyLevel);
```

---

## What to Send Me

To help you fix this, copy and paste:

1. **Console Errors** (from Console tab)
2. **Request Payload** (from Network tab → calculate-pricing → Payload)
3. **Response** (from Network tab → calculate-pricing → Response)

Example:
```
Request Payload:
{
  "garmentTypeId": "???",
  "fabricChoice": "???",
  "urgencyLevel": "???",
  "tailorId": "???"
}

Response:
{
  "error": "Validation failed",
  "details": ["garmentTypeId: ..."]
}
```

---

## Temporary Workaround

If you can't get the wizard to work, you can test the order creation directly by skipping pricing calculation. Let me know if you need help with that.

---

## Next Steps

1. Open browser console
2. Find the error message
3. Copy the **Request Payload** and **Response** 
4. Share them with me
5. I'll provide the exact fix

