import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function OrderWidget({ order }: { order: any }) {
  if (!order) {
    return (
      <FlexWidget style={{ flex: 1, backgroundColor: '#ffffff', padding: 16, borderRadius: 16 }}>
        <TextWidget text="No new orders!" style={{ fontSize: 16, color: '#64748b' }} />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget style={{ flex: 1, backgroundColor: '#ffffff', padding: 16, borderRadius: 16, flexDirection: 'column' }}>
      <TextWidget text={`Order #${order.id} - ${order.customer_name || 'Guest'}`} style={{ fontSize: 18, fontWeight: 'bold', color: '#000000' }} />
      <TextWidget text={`Total: Rs. ${order.total_amount}`} style={{ fontSize: 14, color: '#10b981' }} />
      
      <FlexWidget style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'space-between' }}>
        <FlexWidget 
          clickAction="REJECT_ORDER"
          clickActionData={{ orderId: order.id }}
          style={{ backgroundColor: '#fee2e2', padding: 8, borderRadius: 8, width: 100, alignItems: 'center' }}
        >
          <TextWidget text="Reject" style={{ color: '#ef4444', fontWeight: 'bold' }} />
        </FlexWidget>
        
        <FlexWidget 
          clickAction="ACCEPT_ORDER"
          clickActionData={{ orderId: order.id }}
          style={{ backgroundColor: '#10b981', padding: 8, borderRadius: 8, width: 100, alignItems: 'center' }}
        >
          <TextWidget text="Accept" style={{ color: '#ffffff', fontWeight: 'bold' }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
