import React from 'react';
import { OrderWidget } from './OrderWidget';
import api from '../services/api';

export async function widgetTaskHandler(props: any) {
  const { clickAction, clickActionData } = props;

  // 1. Handle Button Clicks
  if (clickAction === 'ACCEPT_ORDER') {
    try {
      await api.patch(`/orders/${clickActionData.orderId}/status/`, { status: 'ACCEPTED' });
    } catch (e) {
      console.error('Failed to accept order', e);
    }
  } else if (clickAction === 'REJECT_ORDER') {
    try {
      await api.patch(`/orders/${clickActionData.orderId}/status/`, { status: 'REJECTED' });
    } catch (e) {
      console.error('Failed to reject order', e);
    }
  }

  // 2. Fetch Latest New Order Data
  let latestOrder = null;
  try {
    const res = await api.get('/orders/?status=NEW&limit=1');
    if (res.data && res.data.length > 0) {
      latestOrder = res.data[0];
    }
  } catch (err) {
    console.error('Widget API Error:', err);
  }

  // 3. Render and Update Widget UI
  props.renderWidget(<OrderWidget order={latestOrder} />);
}
