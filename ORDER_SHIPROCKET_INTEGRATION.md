# Enhanced Order System with Shiprocket Integration

## Overview
Yeh system automatically order create karta hai aur Shiprocket ke saath integrate karta hai for seamless shipping management.

## Key Features
- ✅ Auto Shiprocket order creation for COD orders
- ✅ Real-time status updates via webhooks
- ✅ Comprehensive tracking system
- ✅ Error handling and logging
- ✅ Status mapping between internal and Shiprocket statuses

## API Endpoints

### 1. Create Order (Public)
```
POST /api/orders
```

**Request Body:**
```json
{
  "userId": "60d5ecb74b24c72d88f4e123",
  "items": [
    {
      "productId": "60d5ecb74b24c72d88f4e456",
      "quantity": 2,
      "size": "M",
      "color": "Red"
    }
  ],
  "shippingAddress": {
    "name": "Customer Name",
    "phone": "9876543210",
    "email": "customer@example.com",
    "addressLine1": "123 Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "paymentMethod": "COD",
  "notes": "Special instructions"
}
```

**Response:**
```json
{
  "message": "Order placed successfully",
  "order": { /* order object */ },
  "shiprocketStatus": "Created" // or "Pending"
}
```

### 2. Get Order Tracking (Public)
```
GET /api/orders/:orderId/tracking
```

**Response:**
```json
{
  "trackingInfo": {
    "orderId": "60d5ecb74b24c72d88f4e123",
    "status": "confirmed",
    "shippingStatus": "PICKED_UP",
    "awbCode": "AWB123456",
    "courierName": "Delhivery",
    "shiprocketOrderId": "12345",
    "shiprocketCreated": true
  }
}
```

### 3. Update Order Status (Admin)
```
PUT /api/orders/:orderId/status
```

**Request Body:**
```json
{
  "status": "confirmed",
  "paymentStatus": "paid"
}
```

### 4. Shiprocket Webhook
```
POST /api/webhooks/shiprocket
```

**Webhook Payload:**
```json
{
  "awb": "AWB123456",
  "current_status": "DELIVERED",
  "order_id": "12345",
  "shipment_id": "67890"
}
```

## Order Status Flow

### Internal Status
- `pending` → `confirmed` → `shipped` → `delivered`
- `cancelled` (can happen at any stage)

### Shiprocket Status Mapping
- `PICKUP_SCHEDULED` → `confirmed`
- `PICKED_UP` → `shipped`
- `IN_TRANSIT` → `shipped`
- `OUT_FOR_DELIVERY` → `shipped`
- `DELIVERED` → `delivered`
- `CANCELLED/RTO/LOST` → `cancelled`

## Auto Integration Logic

### COD Orders
- Order create hone ke saath hi Shiprocket order automatically create hota hai
- Status automatically `confirmed` ho jata hai
- AWB code aur courier details save ho jate hain

### Prepaid Orders
- Order create hota hai but Shiprocket order manual confirmation ke baad create hota hai
- Admin panel se status `confirmed` karne par Shiprocket order create hota hai

## Error Handling
- Shiprocket API fail hone par order create ho jata hai but error log hota hai
- Webhook fail hone par retry mechanism hai
- All errors are logged with detailed information

## Testing
```bash
# Run test script
node test-order-flow.js
```

## Environment Variables Required
```
SHIPROCKET_EMAIL=your-email@example.com
SHIPROCKET_PASSWORD=your-password
SHIPROCKET_BASE_URL=https://apiv2.shiprocket.in/v1/external
```

## Webhook Setup in Shiprocket
1. Login to Shiprocket dashboard
2. Go to Settings → Webhooks
3. Add webhook URL: `https://yourdomain.com/api/webhooks/shiprocket`
4. Select events: Order status updates

## Monitoring & Logs
- All Shiprocket operations are logged with emojis for easy identification
- Error details are stored in database for debugging
- Webhook events are logged for audit trail